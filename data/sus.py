#!/usr/bin/env python3
from __future__ import annotations
"""
generate_sustainability.py
==========================
Reads raw CSV exports from the farm database and writes
  public/data/sustainability.json
with real, calculated sustainability metrics.

Usage (from project root):
  python data_pipeline/generate_sustainability.py \\
    --data-dir  data_pipeline/raw \\
    --farm-id   F02 \\
    --output    public/data/sustainability.json

Expected CSV files in --data-dir:
  farms.csv
  greenhouses.csv
  plots.csv
  daily_sensor_readings.csv
  daily_input_costs.csv
  input_applications.csv
  scouting_observations.csv
  market_and_input_prices.csv
  season_summary.csv

Outputs sustainability.json (same schema as before, extended with
  carbonEmissionsKgCO2e, carbonEmissionsScore, carbonKgPerKgYield).

Run validation summary is printed to stdout.
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import numpy as np

# ---------------------------------------------------------------------------
# Canadian GHG Emission Factors
# Source: Environment and Climate Change Canada
# https://www.canada.ca/en/environment-climate-change/services/climate-change/
#   pricing-pollution-how-it-will-work/output-based-pricing-system/
#   federal-greenhouse-gas-offset-system/emission-factors-reference-values.html
# ---------------------------------------------------------------------------
# BC electricity grid (2023 NIR — ~98 % hydro/renewables)
BC_GRID_KG_CO2E_PER_KWH     = 0.015   # kg CO₂e / kWh_electric
# Natural gas (ECCC Tier 1 default, 2023)  ≈ 1.9 kg CO₂e/m³ ÷ ~9.5 kWh/m³
NATURAL_GAS_KG_CO2E_PER_KWH = 0.200   # kg CO₂e / kWh_thermal
# Heat-pump (coefficient of performance ≈ 3 → uses grid electricity)
HEAT_PUMP_KG_CO2E_PER_KWH   = BC_GRID_KG_CO2E_PER_KWH / 3.0
# Blended fallback (weighted: ~70 % hydro grid + 30 % NG heat)
BLENDED_KG_CO2E_PER_KWH     = 0.070


# ---------------------------------------------------------------------------
# Scoring helpers  (all return float 0–100)
# ---------------------------------------------------------------------------

def score_lower_is_better(value: float, ideal: float, worst: float) -> float:
    """ideal → 100, worst → 0. Clamps outside [ideal, worst]."""
    if worst <= ideal:
        return 100.0
    clamped = max(ideal, min(worst, value))
    return round(100.0 * (worst - clamped) / (worst - ideal), 1)


def score_higher_is_better(value: float, ideal: float, worst: float) -> float:
    """ideal → 100, worst → 0."""
    if ideal <= worst:
        return 100.0
    clamped = max(worst, min(ideal, value))
    return round(100.0 * (clamped - worst) / (ideal - worst), 1)


def warn(msg: str) -> None:
    print(f"  ⚠️  WARNING: {msg}", file=sys.stderr)


def ok(msg: str) -> None:
    print(f"  ✅  {msg}")


def info(msg: str) -> None:
    print(f"  ℹ️  {msg}")


# ---------------------------------------------------------------------------
# CSV loader with friendly error messages
# ---------------------------------------------------------------------------

REQUIRED_FILES = [
    "farms.csv",
    "greenhouses.csv",
    "plots.csv",
    "input_applications.csv",
    "season_summary.csv",
]

OPTIONAL_FILES = [
    "daily_sensor_readings.csv",
    "daily_input_costs.csv",
    "scouting_observations.csv",
    "market_and_input_prices.csv",
]


def load_csvs(data_dir: Path) -> dict[str, pd.DataFrame]:
    dfs: dict[str, pd.DataFrame] = {}
    print("\n── Loading CSVs ─────────────────────────────────────────────")
    for fname in REQUIRED_FILES + OPTIONAL_FILES:
        path = data_dir / fname
        required = fname in REQUIRED_FILES
        if not path.exists():
            if required:
                print(f"  ❌ MISSING (required): {path}", file=sys.stderr)
                sys.exit(1)
            else:
                warn(f"Optional file not found, skipping: {path}")
            continue
        df = pd.read_csv(path, low_memory=False)
        key = fname.replace(".csv", "")
        dfs[key] = df
        ok(f"Loaded {fname:45s}  {len(df):6,} rows × {df.shape[1]} cols")
    return dfs


# ---------------------------------------------------------------------------
# Emission factor lookup
# ---------------------------------------------------------------------------

def emission_factor_for_greenhouse(heating_system: str | None) -> float:
    """Return kg CO₂e / kWh based on heating system string."""
    if not isinstance(heating_system, str):
        return BLENDED_KG_CO2E_PER_KWH
    hs = heating_system.lower()
    if "natural gas" in hs or "gas" in hs:
        return NATURAL_GAS_KG_CO2E_PER_KWH
    if "heat pump" in hs:
        return HEAT_PUMP_KG_CO2E_PER_KWH
    if "hydro" in hs or "electric" in hs or "hydronic" in hs:
        # Hydronic systems can be fuelled by gas or electric; assume blended
        return BLENDED_KG_CO2E_PER_KWH
    return BLENDED_KG_CO2E_PER_KWH


# ---------------------------------------------------------------------------
# Main calculation
# ---------------------------------------------------------------------------

def calculate(dfs: dict[str, pd.DataFrame], farm_id: str) -> dict:
    print(f"\n── Calculating metrics for farm_id = {farm_id!r} ────────────")

    # ── Filter to target farm ──────────────────────────────────────────────
    farm_row = dfs["farms"][dfs["farms"]["farm_id"] == farm_id]
    if farm_row.empty:
        print(f"  ❌ farm_id '{farm_id}' not found. "
              f"Available: {dfs['farms']['farm_id'].tolist()}", file=sys.stderr)
        sys.exit(1)
    farm = farm_row.iloc[0]
    ok(f"Farm found: {farm.get('farm_name', farm_id)}")

    plots_df     = dfs["plots"][dfs["plots"]["farm_id"] == farm_id].copy()
    apps_df      = dfs["input_applications"][dfs["input_applications"]["farm_id"] == farm_id].copy()
    summary_df   = dfs["season_summary"].copy()

    # Join season summary to plot to get farm_id
    if "farm_id" not in summary_df.columns:
        summary_df = summary_df.merge(
            plots_df[["plot_id", "farm_id"]], on="plot_id", how="left"
        )
    summary_df = summary_df[summary_df["farm_id"] == farm_id].copy()

    info(f"Plots in scope: {len(plots_df)}")
    info(f"Input applications in scope: {len(apps_df)}")
    info(f"Season summary rows in scope: {len(summary_df)}")

    if plots_df.empty:
        warn("No plots found for this farm — scores will be 0")
    if summary_df.empty:
        warn("No season summary rows found — yield-based scores will be 0")

    # ── Total plot area ────────────────────────────────────────────────────
    total_area_m2 = plots_df["plot_area_m2"].sum() if not plots_df.empty else 0.0
    info(f"Total plot area: {total_area_m2:,.1f} m²")

    # ── Yield ─────────────────────────────────────────────────────────────
    if not summary_df.empty and "season_yield_kg_m2" in summary_df.columns:
        # Weighted yield across plots
        merged = summary_df.merge(plots_df[["plot_id", "plot_area_m2"]], on="plot_id", how="left")
        merged["yield_kg"] = merged["season_yield_kg_m2"] * merged["plot_area_m2"].fillna(0)
        total_yield_kg = merged["yield_kg"].sum()
    else:
        total_yield_kg = 0.0
        warn("season_yield_kg_m2 missing from season_summary — carbon & intensity scores unreliable")
    info(f"Total yield: {total_yield_kg:,.1f} kg")

    # ── Energy ────────────────────────────────────────────────────────────
    energy_apps = apps_df[apps_df["input_type"].str.lower() == "energy"] if not apps_df.empty else pd.DataFrame()
    total_energy_kwh = energy_apps["quantity"].sum() if not energy_apps.empty else 0.0
    info(f"Total energy: {total_energy_kwh:,.1f} kWh")

    energy_per_kg = total_energy_kwh / total_yield_kg if total_yield_kg > 0 else float("inf")
    info(f"Energy intensity: {energy_per_kg:.4f} kWh/kg")

    # Score: calibrated to observed data range across BC farms (1.28–3.19 kWh/kg).
    # Best-in-fleet ≈ 1.28 kWh/kg (scores 100); worst ≈ 3.20 kWh/kg (scores 0).
    energy_intensity_score = score_lower_is_better(
        value=energy_per_kg,
        ideal=1.28,   # best observed in fleet
        worst=3.20    # worst observed in fleet
    )
    info(f"Energy intensity score: {energy_intensity_score}/100")

    # ── Water ─────────────────────────────────────────────────────────────
    water_apps = apps_df[apps_df["input_type"].str.lower() == "water"] if not apps_df.empty else pd.DataFrame()
    total_water_l = water_apps["quantity"].sum() if not water_apps.empty else 0.0
    info(f"Total water: {total_water_l:,.1f} L")

    water_per_kg = total_water_l / total_yield_kg if total_yield_kg > 0 else float("inf")
    info(f"Water per kg yield: {water_per_kg:.4f} L/kg")

    # Score: calibrated to observed data range across BC farms (40–79 L/kg).
    # Best-in-fleet ≈ 40 L/kg (scores 100); worst ≈ 80 L/kg (scores 0).
    water_efficiency_score = score_lower_is_better(
        value=water_per_kg,
        ideal=40.0,
        worst=80.0
    )
    info(f"Water efficiency score: {water_efficiency_score}/100")

    # ── Chemical load (pesticide) ─────────────────────────────────────────
    pesticide_apps = apps_df[apps_df["input_type"].str.lower() == "pesticide"] if not apps_df.empty else pd.DataFrame()
    # quantity column is in grams — convert to kg for intensity calculation
    total_pesticide_kg = pesticide_apps["quantity"].sum() / 1000.0 if not pesticide_apps.empty else 0.0
    info(f"Total pesticide: {total_pesticide_kg * 1000:,.2f} g  ({total_pesticide_kg:.4f} kg)")

    pesticide_per_m2 = total_pesticide_kg / total_area_m2 if total_area_m2 > 0 else 0.0
    info(f"Pesticide intensity: {pesticide_per_m2:.6f} kg/m²")

    # Score: calibrated to observed fleet range (0.00058–0.00085 kg/m²).
    # Best-in-fleet ≈ 0.00058 kg/m² (scores 100); worst ≈ 0.00086 kg/m² (scores 0).
    chemical_load_score = score_lower_is_better(
        value=pesticide_per_m2,
        ideal=0.00058,
        worst=0.00086
    )
    info(f"Chemical load score: {chemical_load_score}/100")

    # ── Carbon emissions ──────────────────────────────────────────────────
    # Resolve emission factors per greenhouse based on heating_system
    greenhouses_df = dfs["greenhouses"][dfs["greenhouses"]["farm_id"] == farm_id].copy()

    if not energy_apps.empty and "greenhouse_id" in energy_apps.columns and not greenhouses_df.empty:
        # Merge energy apps with greenhouse heating system
        gh_factors = greenhouses_df[["greenhouse_id", "heating_system"]].copy()
        gh_factors["ef"] = gh_factors["heating_system"].apply(emission_factor_for_greenhouse)
        energy_with_ef = energy_apps.merge(gh_factors[["greenhouse_id", "ef"]], on="greenhouse_id", how="left")
        energy_with_ef["ef"] = energy_with_ef["ef"].fillna(BLENDED_KG_CO2E_PER_KWH)
        total_co2e_kg = (energy_with_ef["quantity"] * energy_with_ef["ef"]).sum()
        heating_systems_used = gh_factors["heating_system"].unique().tolist()
        info(f"Heating systems detected: {heating_systems_used}")
    else:
        # Fallback: use blended factor
        total_co2e_kg = total_energy_kwh * BLENDED_KG_CO2E_PER_KWH
        warn("Could not resolve per-greenhouse emission factors; using blended factor "
             f"({BLENDED_KG_CO2E_PER_KWH} kg CO₂e/kWh)")

    carbon_per_kg_yield = total_co2e_kg / total_yield_kg if total_yield_kg > 0 else 0.0
    info(f"Total carbon emissions: {total_co2e_kg:,.1f} kg CO₂e")
    info(f"Carbon intensity: {carbon_per_kg_yield:.4f} kg CO₂e/kg yield")

    # Score: lower is better; 0–0.20 kg CO₂e/kg typical greenhouse range
    # (BC grid is very clean; mostly only matters for NG-heavy operations)
    carbon_score = score_lower_is_better(
        value=carbon_per_kg_yield,
        ideal=0.0,
        worst=0.20
    )
    info(f"Carbon emissions score: {carbon_score}/100")

    # ── Natural disaster risk (from daily sensor readings) ────────────────
    # Natural disaster risk is based on environmental extremes
    disaster_risk_score = 50.0  # default
    if "daily_sensor_readings" in dfs:
        sensor = dfs["daily_sensor_readings"]
        if "farm_id" in sensor.columns:
            sensor = sensor[sensor["farm_id"] == farm_id]
        if not sensor.empty:
            # Calculate risk based on temperature and moisture extremes
            risk_score = 0.0
            if "air_temp_c" in sensor.columns:
                extreme_temps = (
                    ((sensor["air_temp_c"] > 32) | (sensor["air_temp_c"] < -5)).sum()
                )
                risk_score = min(100, (extreme_temps / len(sensor)) * 100 if len(sensor) > 0 else 0)
            # Lower risk is better, so invert the score
            disaster_risk_score = score_lower_is_better(risk_score, ideal=0.0, worst=100.0)
            info(f"Natural disaster risk score: {disaster_risk_score}/100")
    else:
        warn("daily_sensor_readings not loaded — disaster risk score defaulted to 50")

    # ── Overall score (weighted average, based on core sustainability metrics) ─
    weights = {
        "energyIntensity":    0.25,
        "waterEfficiency":    0.25,
        "chemicalLoad":       0.20,
        "carbonEmissions":    0.20,
        "naturalDisasterRisk": 0.10,
    }
    subscores = {
        "energyIntensity":   energy_intensity_score,
        "waterEfficiency":   water_efficiency_score,
        "chemicalLoad":      chemical_load_score,
        "carbonEmissions":   carbon_score,
        "naturalDisasterRisk": disaster_risk_score,
    }
    overall = round(
        sum(subscores[k] * weights[k] for k in weights), 1
    )
    ok(f"Overall sustainability score: {overall}/100")

    # ── Weakest / strongest ───────────────────────────────────────────────
    sorted_subs = sorted(subscores.items(), key=lambda x: x[1])
    weakest_key,  weakest_score  = sorted_subs[0]
    strongest_key, strongest_score = sorted_subs[-1]

    # Human-readable labels
    key_labels = {
        "energyIntensity":   "Energy Intensity",
        "waterEfficiency":   "Water Efficiency",
        "chemicalLoad":      "Chemical Load",
        "carbonEmissions":   "Carbon Emissions",
        "naturalDisasterRisk": "Natural Disaster Risk",
    }

    # ── Risks ────────────────────────────────────────────────────────────
    risks = build_risks(dfs, farm_id, subscores)

    # ── Month-over-month trend ────────────────────────────────────────────
    subscore_trends = compute_subscores_trend(
        dfs=dfs,
        farm_id=farm_id,
        plot_ids=set(plots_df["plot_id"].tolist()),
        total_area_m2=total_area_m2,
        total_yield_kg=total_yield_kg,
    )

    # ── Control baseline (Control treatment plots) ───────────────────────
    control_baseline = build_control_baseline(dfs, farm_id)

    # ── Benchmarks ────────────────────────────────────────────────────────
    benchmarks = {
        "energyPerKg": round(energy_per_kg, 3),
        "waterPerKg":  round(water_per_kg,  3),
    }

    # ── Moisture trend (weekly averages from sensor readings) ─────────────
    moisture_trend = build_moisture_trend(dfs, farm_id)

    # ── Assemble final JSON ───────────────────────────────────────────────
    return {
        "overallScore":     overall,
        "subscores":        subscores,
        "weakestCategory":  key_labels.get(weakest_key, weakest_key),
        "strongestCategory": key_labels.get(strongest_key, strongest_key),
        "weakestScore":     weakest_score,
        "strongestScore":   strongest_score,
        "farm": {
            "farmName":    farm.get("farm_name", "Unknown Farm"),
            "region":      farm.get("region", "Unknown"),
            "climateZone": farm.get("climate_zone", "Unknown"),
            "primaryCrop": farm.get("primary_crop", "Unknown"),
        },
        "benchmarks": benchmarks,
        # --- carbon emissions fields ---
        "carbonEmissionsKgCO2e":    round(total_co2e_kg, 2),
        "carbonEmissionsScore":     carbon_score,
        "carbonKgPerKgYield":       round(carbon_per_kg_yield, 4),
        # --- month-over-month trends (current 30d vs previous 30d) ---
        "subscoreTrends":  subscore_trends,
        # ---------------------------------------------------------------
        "moistureTrend":   moisture_trend,
        "risks":           risks,
        "controlBaseline": control_baseline,
    }


# ---------------------------------------------------------------------------
# Month-over-month trend helper
# ---------------------------------------------------------------------------

def _period_subscores(
    apps: pd.DataFrame,
    sensor: pd.DataFrame,
    total_area_m2: float,
    period_yield_kg: float,
) -> dict[str, float]:
    """Compute the five subscores for a filtered slice of data."""

    def _sum(df: pd.DataFrame, itype: str) -> float:
        if df.empty:
            return 0.0
        mask = df["input_type"].str.lower() == itype
        return float(df.loc[mask, "quantity"].sum())

    energy_kwh  = _sum(apps, "energy")
    water_l     = _sum(apps, "water")
    pest_kg     = _sum(apps, "pesticide") / 1000.0

    ei = score_lower_is_better(
        energy_kwh / period_yield_kg if period_yield_kg > 0 else float("inf"),
        1.28, 3.20,
    )
    we = score_lower_is_better(
        water_l / period_yield_kg if period_yield_kg > 0 else float("inf"),
        40.0, 80.0,
    )
    cl = score_lower_is_better(
        pest_kg / total_area_m2 if total_area_m2 > 0 else 0.0,
        0.00058, 0.00086,
    )

    # Carbon: approximate from energy (blended BC grid factor)
    co2e_per_kg = (energy_kwh * BLENDED_KG_CO2E_PER_KWH) / period_yield_kg if period_yield_kg > 0 else 0.0
    carbon = score_lower_is_better(co2e_per_kg, 0.019, 0.480)

    # Natural-disaster risk: fraction of extreme-temp readings
    if not sensor.empty and "air_temp_c" in sensor.columns:
        extreme = int(((sensor["air_temp_c"] > 32) | (sensor["air_temp_c"] < -5)).sum())
        risk_pct = (extreme / len(sensor)) * 100
        disaster = score_lower_is_better(risk_pct, 0.0, 100.0)
    else:
        disaster = 100.0

    return {
        "energyIntensity":     round(ei, 1),
        "waterEfficiency":     round(we, 1),
        "chemicalLoad":        round(cl, 1),
        "carbonEmissions":     round(carbon, 1),
        "naturalDisasterRisk": round(disaster, 1),
    }


def compute_subscores_trend(
    dfs: dict[str, pd.DataFrame],
    farm_id: str,
    plot_ids: set[str],
    total_area_m2: float,
    total_yield_kg: float,
) -> dict[str, float] | None:
    """
    Return {subscore_key: delta} where delta = current_30d_score − prev_30d_score.
    Positive → improved. Returns None if there is insufficient data.
    """
    apps_full   = dfs.get("input_applications", pd.DataFrame())
    sensor_full = dfs.get("daily_sensor_readings", pd.DataFrame())

    if apps_full.empty or "date" not in apps_full.columns:
        return None

    # Parse dates once
    apps_full   = apps_full.copy()
    apps_full["date"] = pd.to_datetime(apps_full["date"], errors="coerce")
    apps_farm   = apps_full[apps_full["farm_id"] == farm_id].copy()

    if not sensor_full.empty and "date" in sensor_full.columns:
        sensor_full = sensor_full.copy()
        sensor_full["date"] = pd.to_datetime(sensor_full["date"], errors="coerce")
        sensor_farm = sensor_full[sensor_full["plot_id"].isin(plot_ids)].copy()
    else:
        sensor_farm = pd.DataFrame()

    max_date = apps_farm["date"].max()
    if pd.isna(max_date):
        return None

    cur_start  = max_date - pd.Timedelta(days=30)
    prev_start = max_date - pd.Timedelta(days=60)
    prev_end   = cur_start

    # Season length for yield proration
    min_date     = apps_farm["date"].min()
    season_days  = max(1, (max_date - min_date).days)

    def _slice(df: pd.DataFrame, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
        if df.empty:
            return df
        return df[(df["date"] >= start) & (df["date"] < end)]

    period_days = 30
    period_yield = total_yield_kg * (period_days / season_days)

    cur_apps    = _slice(apps_farm,   cur_start, max_date)
    prev_apps   = _slice(apps_farm,   prev_start, prev_end)
    cur_sensor  = _slice(sensor_farm, cur_start, max_date)
    prev_sensor = _slice(sensor_farm, prev_start, prev_end)

    if cur_apps.empty and prev_apps.empty:
        return None

    cur_scores  = _period_subscores(cur_apps,  cur_sensor,  total_area_m2, period_yield)
    prev_scores = _period_subscores(prev_apps, prev_sensor, total_area_m2, period_yield)

    return {
        k: round(cur_scores[k] - prev_scores[k], 1)
        for k in cur_scores
    }


# ---------------------------------------------------------------------------
# Risk builder
# ---------------------------------------------------------------------------

def build_risks(
    dfs: dict[str, pd.DataFrame],
    farm_id: str,
    subscores: dict[str, float],
) -> list[dict]:

    def risk_level(score: float) -> str:
        if score >= 70:
            return "healthy"
        if score >= 40:
            return "warning"
        return "critical"

    risks = []

    # Heatwave risk — from daily_sensor_readings air_temp_c
    if "daily_sensor_readings" in dfs:
        sensor = dfs["daily_sensor_readings"]
        if "farm_id" in sensor.columns:
            sensor = sensor[sensor["farm_id"] == farm_id]
        if not sensor.empty and "air_temp_c" in sensor.columns:
            hot_days = (sensor["air_temp_c"] > 32).sum()
            level = "healthy" if hot_days == 0 else ("warning" if hot_days < 10 else "critical")
            # Only include if it's a warning or critical
            if level in ("warning", "critical"):
                risks.append({
                    "id": "heatwave",
                    "icon": "thermometer",
                    "title": "Heatwave Risk",
                    "level": level,
                    "oneliner": f"{int(hot_days)} reading(s) above 32°C recorded this season",
                })

        # Pest risk
        if not sensor.empty and "pest_pressure_index" in sensor.columns:
            avg_pest = sensor["pest_pressure_index"].mean()
            level = "critical" if avg_pest > 0.6 else ("warning" if avg_pest > 0.3 else "healthy")
            if level in ("warning", "critical"):
                risks.append({
                    "id": "pest",
                    "icon": "bug",
                    "title": "Pest Outbreak",
                    "level": level,
                    "oneliner": f"Pest pressure index averaging {avg_pest:.2f} across plots",
                })

        # Disease risk
        if not sensor.empty and "disease_risk_index" in sensor.columns:
            avg_disease = sensor["disease_risk_index"].mean()
            level = "critical" if avg_disease > 0.6 else ("warning" if avg_disease > 0.3 else "healthy")
            if level in ("warning", "critical"):
                risks.append({
                    "id": "disease",
                    "icon": "shield-alert",
                    "title": "Disease Spread",
                    "level": level,
                    "oneliner": f"Disease risk index averaging {avg_disease:.2f} across plots",
                })

        # Water stress
        if not sensor.empty and "substrate_moisture" in sensor.columns:
            target_low, target_high = 0.40, 0.55
            out_of_range = (
                (sensor["substrate_moisture"] < target_low) |
                (sensor["substrate_moisture"] > target_high)
            ).sum()
            level = "critical" if out_of_range > 100 else ("warning" if out_of_range > 30 else "healthy")
            if level in ("warning", "critical"):
                risks.append({
                    "id": "water",
                    "icon": "droplet",
                    "title": "Water Stress",
                    "level": level,
                    "oneliner": f"{int(out_of_range)} plot-day(s) outside target moisture range (0.40–0.55)",
                })

    # Input cost volatility — from market_and_input_prices
    if "market_and_input_prices" in dfs:
        prices = dfs["market_and_input_prices"]
        fert_prices = prices[prices["item"].str.lower() == "fertilizer"]["price"] if "item" in prices.columns else pd.Series(dtype=float)
        if len(fert_prices) > 1:
            swing = (fert_prices.max() - fert_prices.min()) / fert_prices.mean() * 100
            level = "critical" if swing > 50 else ("warning" if swing > 20 else "healthy")
            if level in ("warning", "critical"):
                risks.append({
                    "id": "costs",
                    "icon": "trending-up",
                    "title": "Input Cost Volatility",
                    "level": level,
                    "oneliner": f"Fertilizer prices swung {swing:.1f}% this season",
                })

    return risks


# ---------------------------------------------------------------------------
# Control baseline builder
# ---------------------------------------------------------------------------

def build_control_baseline(
    dfs: dict[str, pd.DataFrame],
    farm_id: str,
) -> dict[str, float]:
    """Compute subscores using only Control-treatment plots."""
    plots_df  = dfs["plots"][dfs["plots"]["farm_id"] == farm_id].copy()
    ctrl_plots = plots_df[plots_df["treatment"].str.lower() == "control"] if "treatment" in plots_df.columns else pd.DataFrame()

    if ctrl_plots.empty:
        warn("No Control treatment plots found — using default control baseline")
        return {
            "energyIntensity":   50.0,
            "waterEfficiency":   50.0,
            "chemicalLoad":      50.0,
            "carbonEmissions":   50.0,
            "naturalDisasterRisk": 50.0,
        }

    ctrl_ids    = set(ctrl_plots["plot_id"].tolist())
    apps_df     = dfs["input_applications"]
    ctrl_apps   = apps_df[apps_df["plot_id"].isin(ctrl_ids)]
    summary_df  = dfs["season_summary"]
    if "farm_id" not in summary_df.columns:
        summary_df = summary_df.merge(plots_df[["plot_id", "farm_id"]], on="plot_id", how="left")
    ctrl_summary = summary_df[summary_df["plot_id"].isin(ctrl_ids)]

    ctrl_area   = ctrl_plots["plot_area_m2"].sum()
    ctrl_merged = ctrl_summary.merge(ctrl_plots[["plot_id", "plot_area_m2"]], on="plot_id", how="left")
    ctrl_yield  = (ctrl_merged["season_yield_kg_m2"] * ctrl_merged["plot_area_m2"].fillna(0)).sum()

    ctrl_energy  = ctrl_apps[ctrl_apps["input_type"].str.lower() == "energy"]["quantity"].sum()
    ctrl_water   = ctrl_apps[ctrl_apps["input_type"].str.lower() == "water"]["quantity"].sum()
    # pesticide quantity is in grams — convert to kg
    ctrl_pest_kg = ctrl_apps[ctrl_apps["input_type"].str.lower() == "pesticide"]["quantity"].sum() / 1000.0

    ei = score_lower_is_better(ctrl_energy / ctrl_yield if ctrl_yield > 0 else 3.20, 1.28, 3.20)
    we = score_lower_is_better(ctrl_water  / ctrl_yield if ctrl_yield > 0 else 80.0, 40.0, 80.0)
    cl = score_lower_is_better(ctrl_pest_kg / ctrl_area if ctrl_area > 0 else 0.00086, 0.00058, 0.00086)

    # Natural disaster risk for control baseline
    disaster_risk_ctrl = 50.0
    if "daily_sensor_readings" in dfs:
        sensor = dfs["daily_sensor_readings"]
        s_ctrl = sensor[sensor["plot_id"].isin(ctrl_ids)] if "plot_id" in sensor.columns else pd.DataFrame()
        if not s_ctrl.empty and "air_temp_c" in s_ctrl.columns:
            extreme_temps = ((s_ctrl["air_temp_c"] > 32) | (s_ctrl["air_temp_c"] < -5)).sum()
            risk_score = min(100, (extreme_temps / len(s_ctrl)) * 100 if len(s_ctrl) > 0 else 0)
            disaster_risk_ctrl = score_lower_is_better(risk_score, ideal=0.0, worst=100.0)

    return {
        "energyIntensity":   ei,
        "waterEfficiency":   we,
        "chemicalLoad":      cl,
        "carbonEmissions":   50.0,  # control baseline: no per-GH factor available, use midpoint
        "naturalDisasterRisk": disaster_risk_ctrl,
    }


# ---------------------------------------------------------------------------
# Moisture trend builder
# ---------------------------------------------------------------------------

def build_moisture_trend(
    dfs: dict[str, pd.DataFrame],
    farm_id: str,
) -> list[dict]:
    if "daily_sensor_readings" not in dfs:
        return []
    sensor = dfs["daily_sensor_readings"].copy()
    if "farm_id" in sensor.columns:
        sensor = sensor[sensor["farm_id"] == farm_id]
    if sensor.empty or "substrate_moisture" not in sensor.columns:
        return []
    sensor["date"] = pd.to_datetime(sensor["date"], errors="coerce")
    sensor = sensor.dropna(subset=["date"])
    sensor["week_start"] = sensor["date"] - pd.to_timedelta(sensor["date"].dt.dayofweek, unit="D")
    weekly = sensor.groupby("week_start")["substrate_moisture"].mean().reset_index()
    weekly = weekly.sort_values("week_start")
    result = []
    for _, row in weekly.iterrows():
        ws = row["week_start"]
        we = ws + pd.Timedelta(days=6)
        result.append({
            "week": f"{ws.strftime('%Y-%m-%d')}/{we.strftime('%Y-%m-%d')}",
            "substrate_moisture": round(float(row["substrate_moisture"]), 4),
        })
    return result


# ---------------------------------------------------------------------------
# Validation report
# ---------------------------------------------------------------------------

def validate(result: dict) -> None:
    print("\n── Validation Report ────────────────────────────────────────")
    errors = 0

    def check(condition: bool, msg: str) -> None:
        nonlocal errors
        if condition:
            ok(msg)
        else:
            print(f"  ❌ FAIL: {msg}", file=sys.stderr)
            errors += 1

    # Score ranges
    check(0 <= result["overallScore"] <= 100, f"overallScore in [0, 100]: {result['overallScore']}")
    for k, v in result["subscores"].items():
        check(0 <= v <= 100, f"subscores.{k} in [0, 100]: {v}")
    check(0 <= result["carbonEmissionsScore"] <= 100,
          f"carbonEmissionsScore in [0, 100]: {result['carbonEmissionsScore']}")

    # Non-negative raw values
    check(result["carbonEmissionsKgCO2e"] >= 0,
          f"carbonEmissionsKgCO2e ≥ 0: {result['carbonEmissionsKgCO2e']}")
    check(result["benchmarks"]["energyPerKg"] >= 0,
          f"benchmarks.energyPerKg ≥ 0: {result['benchmarks']['energyPerKg']}")
    check(result["benchmarks"]["waterPerKg"] >= 0,
          f"benchmarks.waterPerKg ≥ 0: {result['benchmarks']['waterPerKg']}")

    # Weakest / strongest consistency
    subs = result["subscores"]
    check(
        result["weakestScore"]  == min(subs.values()),
        f"weakestScore matches min subscore: {result['weakestScore']} == {min(subs.values())}",
    )
    check(
        result["strongestScore"] == max(subs.values()),
        f"strongestScore matches max subscore: {result['strongestScore']} == {max(subs.values())}",
    )

    # Risks have required fields
    for r in result["risks"]:
        check(
            all(k in r for k in ("id", "icon", "title", "level", "oneliner")),
            f"risk '{r.get('id', '?')}' has all required fields",
        )
        check(
            r.get("level") in ("healthy", "warning", "critical"),
            f"risk '{r.get('id', '?')}' level is valid: {r.get('level')}",
        )

    if errors == 0:
        print("\n  🎉  All checks passed — sustainability.json is ready!\n")
    else:
        print(f"\n  ❌  {errors} check(s) failed. Review warnings above.\n",
              file=sys.stderr)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate sustainability.json from raw CSV data."
    )
    parser.add_argument(
        "--data-dir",
        default="C:/Users/User/OneDrive - Simon Fraser University (1sfu)/dashboard/data",
        help="Directory containing the raw CSV files (default: C:/Users/User/OneDrive - Simon Fraser University (1sfu)/dashboard/data)",
    )
    parser.add_argument(
        "--farm-id",
        default="F02",
        help="farm_id to calculate metrics for (default: F02)",
    )
    parser.add_argument(
        "--output",
        default="public/data/sustainability.json",
        help="Output JSON path (default: public/data/sustainability.json)",
    )
    parser.add_argument(
        "--list-farms",
        action="store_true",
        help="List available farm IDs and exit",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}", file=sys.stderr)
        sys.exit(1)

    dfs = load_csvs(data_dir)

    if args.list_farms:
        if "farms" in dfs:
            print("\nAvailable farms:")
            for _, row in dfs["farms"].iterrows():
                print(f"  {row.get('farm_id')}  →  {row.get('farm_name', '—')}  ({row.get('region', '—')})")
        else:
            print("farms.csv not loaded.")
        sys.exit(0)

    result = calculate(dfs, args.farm_id)
    validate(result)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"✅  Written to {out_path}\n")


if __name__ == "__main__":
    main()
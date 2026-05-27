"""
clean_data.py — GreenLeaf CEA dataset cleaner & validator
==========================================================

Reads the 9 raw CSVs in ./data, runs a thorough battery of data-quality
checks, applies *conservative* cleaning, and writes cleaned copies to
./data/clean. Every change it makes is printed, tagged as one of:

    [EDIT]    a value/cell/column was modified in place
    [REMOVE]  a row (or rows) was dropped
    [FLAG]    a suspicious condition was found but NOT auto-fixed
              (ambiguous — needs a human/business decision)
    [OK]      a check ran and found nothing wrong

Design principle: only auto-fix things that are unambiguously dirt
(whitespace, exact duplicates, wrong dtype, case-mismatched categories,
values outside a documented hard range, "null-means-none" placeholders).
Anything that requires guessing which of two fields is authoritative, or
that would silently discard real data, is FLAGGED instead of changed.

The data may already be clean — in that case this script mostly prints
[OK] lines and re-emits the files unchanged. That is the expected, good
outcome; the report is the deliverable.

Usage:
    python clean_data.py                  # clean -> ./data/clean
    python clean_data.py --no-write       # dry run, report only
    python clean_data.py --output-dir X   # write cleaned CSVs to X
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------
# Report log
# --------------------------------------------------------------------------

class Report:
    """Collects and prints tagged change entries, plus running tallies."""

    def __init__(self) -> None:
        self.counts = {"EDIT": 0, "REMOVE": 0, "FLAG": 0, "OK": 0}

    def _emit(self, tag: str, msg: str, n: int = 1) -> None:
        self.counts[tag] += n
        print(f"    [{tag}] {msg}")

    def edit(self, msg: str, n: int = 1) -> None:
        self._emit("EDIT", msg, n)

    def remove(self, msg: str, n: int = 1) -> None:
        self._emit("REMOVE", msg, n)

    def flag(self, msg: str, n: int = 1) -> None:
        self._emit("FLAG", msg, n)

    def ok(self, msg: str) -> None:
        self._emit("OK", msg, 1)

    def section(self, title: str) -> None:
        print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")

    def sub(self, title: str) -> None:
        print(f"\n--- {title} ---")

    def summary(self) -> None:
        print(f"\n{'=' * 78}\nSUMMARY\n{'=' * 78}")
        print(f"  Cells/columns edited : {self.counts['EDIT']}")
        print(f"  Rows removed         : {self.counts['REMOVE']}")
        print(f"  Conditions flagged   : {self.counts['FLAG']}")
        print(f"  Checks passed clean  : {self.counts['OK']}")
        if self.counts["FLAG"]:
            print(
                "\n  NOTE: [FLAG] items were NOT modified. They are ambiguous and\n"
                "  need a human/business decision before changing the raw data."
            )


R = Report()

# --------------------------------------------------------------------------
# Schema: expected categorical values & documented numeric bounds
# --------------------------------------------------------------------------
# These come from docs/datasets.md. Used to detect typos/casing drift and
# values that fall outside a documented hard range.

CATEGORICALS = {
    "farms.csv": {
        "primary_crop": ["Tomato", "Pepper", "Strawberry", "Cucumber"],
        "production_system": ["Greenhouse", "Mixed"],
        "climate_zone": ["Coastal", "Interior", "Fraser Valley"],
    },
    "greenhouses.csv": {
        "crop": ["Tomato", "Strawberry", "Cucumber", "Pepper"],
        "structure_type": ["Glass", "Polyfilm"],
        "heating_system": ["Hydronic", "Natural Gas", "Heat Pump"],
        "irrigation_system": ["Drip", "EBB-Flow", "Fertigation"],
    },
    "plots.csv": {
        "crop": ["Tomato", "Strawberry", "Cucumber", "Pepper"],
        "treatment_block": ["A", "B", "C", "D"],
        "treatment": ["Control", "Low N", "High N", "Integrated Pest",
                      "Reduced Pest", "High Light", "Shade"],
        "row_orientation": ["North", "South", "East", "West"],
    },
    "daily_sensor_readings.csv": {
        "crop": ["Tomato", "Strawberry", "Cucumber", "Pepper"],
        # alert_type / recommended_action have a legitimate NULL state; validated
        # separately so we don't flag the nulls as "unexpected".
        "alert_type": ["High VPD", "Low Moisture", "High Canopy Temp",
                       "High Pest Pressure"],
        "recommended_action": ["Increase Irrigation", "Increase Venting",
                               "Adjust Shade / Venting"],
    },
    "input_applications.csv": {
        "input_type": ["Fertilizer", "Pesticide", "Water", "Labor", "Energy"],
        "reason": ["Shock response", "Growth phase", "Pest response",
                   "Irrigation adjustment", "Routine"],
        "purpose": ["Routine", "Response to alert"],
    },
    "scouting_observations.csv": {
        "leaf_color": ["Excellent", "Good", "Fair", "Poor"],
        "notes_flag": ["None", "Minor", "Moderate", "Severe"],
    },
    "market_and_input_prices.csv": {
        "item": ["Fertilizer", "Pesticide", "Energy", "Water"],
        "unit": ["CAD/kg", "CAD/L", "CAD/kWh"],
    },
}

# Columns with a documented hard range -> (low, high). Values outside get clipped.
BOUNDED_01 = {
    "daily_sensor_readings.csv": ["pest_pressure_index", "disease_risk_index",
                                  "plant_stress_index", "substrate_moisture"],
    "scouting_observations.csv": ["pest_severity", "disease_severity"],
    "season_summary.csv": ["marketable_ratio"],
}
BOUNDED_PCT = {  # 0-100
    "daily_sensor_readings.csv": ["relative_humidity_pct"],
}

# Columns that must never be negative -> flagged if they are.
NON_NEGATIVE = {
    "daily_input_costs.csv": ["daily_energy_cost", "daily_fertilizer_cost",
                              "daily_labor_cost", "daily_pesticide_cost",
                              "daily_water_cost", "daily_total_input_cost",
                              "daily_precision_cost", "daily_routine_cost",
                              "daily_precision_actions_count",
                              "daily_total_actions_count"],
    "input_applications.csv": ["quantity", "unit_cost", "total_cost"],
    "season_summary.csv": ["season_yield_kg_m2", "season_revenue_cad",
                           "total_cost_cad"],
    "scouting_observations.csv": ["blossom_count"],
    "greenhouses.csv": ["capacity_plants", "sensor_density_per_100m2"],
    "farms.csv": ["greenhouse_acres"],
    "plots.csv": ["plot_area_m2", "plant_density_plants_m2"],
}

# Date columns per file.
DATE_COLS = {
    "daily_sensor_readings.csv": "date",
    "daily_input_costs.csv": "date",
    "input_applications.csv": "date",
    "scouting_observations.csv": "date",
    "market_and_input_prices.csv": "date",
}

# "Null means none" placeholders to make explicit (NaN -> label).
# IMPORTANT: labels must NOT be pandas NA sentinels (e.g. "None", "NA", "NULL"),
# otherwise a default pd.read_csv() of the cleaned file would turn them straight
# back into NaN. The documented notes_flag level is literally "None", so we use
# the safe synonym "No Issue" instead.
NULL_PLACEHOLDERS = {
    "daily_sensor_readings.csv": {"alert_type": "No Alert",
                                  "recommended_action": "No Action"},
    "scouting_observations.csv": {"notes_flag": "No Issue"},
}

# --------------------------------------------------------------------------
# Generic per-table cleaning steps
# --------------------------------------------------------------------------

def strip_whitespace(df: pd.DataFrame) -> pd.DataFrame:
    """Strip leading/trailing whitespace from every string column."""
    for col in df.columns:
        if df[col].dtype == object or str(df[col].dtype) in ("string", "str"):
            orig = df[col].astype("string")
            stripped = orig.str.strip()
            changed = int((orig != stripped).fillna(False).sum())
            if changed:
                df[col] = stripped
                R.edit(f"'{col}': stripped whitespace from {changed} value(s)", changed)
    return df


def drop_empty_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Drop rows that are entirely null."""
    before = len(df)
    df = df.dropna(how="all").reset_index(drop=True)
    removed = before - len(df)
    if removed:
        R.remove(f"dropped {removed} fully-empty row(s)", removed)
    return df


def drop_exact_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Drop exact duplicate rows (keep first)."""
    dups = int(df.duplicated().sum())
    if dups:
        df = df.drop_duplicates().reset_index(drop=True)
        R.remove(f"dropped {dups} exact-duplicate row(s)", dups)
    return df


def coerce_numeric(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Coerce columns that should be numeric but arrived as strings
    (e.g. '1,234', '$5.00'). Logs any cell that needed cleaning."""
    numeric_cols = set()
    for group in (BOUNDED_01, BOUNDED_PCT, NON_NEGATIVE):
        numeric_cols |= set(group.get(name, []))
    for col in numeric_cols:
        if col not in df.columns:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            continue
        raw = df[col].astype("string")
        cleaned = raw.str.replace(r"[,$\s]", "", regex=True)
        coerced = pd.to_numeric(cleaned, errors="coerce")
        # Cells that were non-null text but failed to parse:
        failed = int((raw.notna() & coerced.isna()).sum())
        fixed = int((raw != cleaned).fillna(False).sum())
        df[col] = coerced
        if fixed:
            R.edit(f"'{col}': coerced {fixed} text value(s) to numeric", fixed)
        if failed:
            R.flag(f"'{col}': {failed} value(s) could not be parsed as numeric "
                   f"(now NaN)", failed)
    return df


def parse_dates(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Parse the date column to datetime; flag unparseable values."""
    col = DATE_COLS.get(name)
    if not col or col not in df.columns:
        return df
    parsed = pd.to_datetime(df[col], errors="coerce")
    bad = int((df[col].notna() & parsed.isna()).sum())
    if bad:
        R.flag(f"'{col}': {bad} unparseable date(s) -> NaT", bad)
    df[col] = parsed
    return df


def fix_categoricals(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Validate categorical columns against the documented value set.
    Case/whitespace-only mismatches are auto-corrected; truly unknown
    values are flagged."""
    for col, allowed in CATEGORICALS.get(name, {}).items():
        if col not in df.columns:
            continue
        lookup = {v.lower(): v for v in allowed}
        series = df[col].astype("string")
        present = series.dropna().unique()
        for val in present:
            if val in allowed:
                continue
            canon = lookup.get(str(val).strip().lower())
            if canon is not None:
                n = int((series == val).sum())
                df[col] = df[col].replace(val, canon)
                R.edit(f"'{col}': normalized '{val}' -> '{canon}' "
                       f"({n} row(s))", n)
            else:
                n = int((series == val).sum())
                R.flag(f"'{col}': unexpected value '{val}' not in documented "
                       f"set ({n} row(s))", n)
    return df


def clip_bounds(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Clip documented 0-1 and 0-100 columns; flag if anything was clipped."""
    for col in BOUNDED_01.get(name, []):
        if col not in df.columns:
            continue
        oob = int(((df[col] < 0) | (df[col] > 1)).sum())
        if oob:
            df[col] = df[col].clip(0, 1)
            R.edit(f"'{col}': clipped {oob} value(s) into [0, 1]", oob)
    for col in BOUNDED_PCT.get(name, []):
        if col not in df.columns:
            continue
        oob = int(((df[col] < 0) | (df[col] > 100)).sum())
        if oob:
            df[col] = df[col].clip(0, 100)
            R.edit(f"'{col}': clipped {oob} value(s) into [0, 100]", oob)
    return df


def flag_negatives(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Flag negative values in columns that should never be negative.
    Not auto-fixed — a negative cost/yield is a real anomaly to inspect."""
    for col in NON_NEGATIVE.get(name, []):
        if col not in df.columns:
            continue
        neg = int((df[col] < 0).sum())
        if neg:
            R.flag(f"'{col}': {neg} negative value(s) (implausible) — left as-is "
                   f"for review", neg)
    return df


def fill_null_placeholders(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Make 'null-means-none' states explicit so they survive joins/Tableau."""
    for col, label in NULL_PLACEHOLDERS.get(name, {}).items():
        if col not in df.columns:
            continue
        n = int(df[col].isna().sum())
        if n:
            df[col] = df[col].astype("string").fillna(label)
            R.edit(f"'{col}': filled {n} null(s) with explicit '{label}'", n)
    return df


def report_remaining_nulls(df: pd.DataFrame, name: str) -> None:
    """Report any nulls that are NOT documented placeholders."""
    placeholders = set(NULL_PLACEHOLDERS.get(name, {}))
    nulls = df.isna().sum()
    leftover = {c: int(v) for c, v in nulls.items() if v and c not in placeholders}
    if leftover:
        for c, v in leftover.items():
            R.flag(f"'{c}': {v} remaining null(s) (not a documented none-state)", v)
    else:
        R.ok("no unexpected nulls remain")


def clean_table(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Run the full per-table cleaning pipeline."""
    R.section(f"TABLE: {name}   (rows={len(df)}, cols={len(df.columns)})")
    before_edit = R.counts["EDIT"]
    before_rm = R.counts["REMOVE"]

    df = strip_whitespace(df)
    df = drop_empty_rows(df)
    df = drop_exact_duplicates(df)
    df = coerce_numeric(df, name)
    df = parse_dates(df, name)
    df = fix_categoricals(df, name)
    df = clip_bounds(df, name)
    df = flag_negatives(df, name)
    df = fill_null_placeholders(df, name)
    report_remaining_nulls(df, name)

    if R.counts["EDIT"] == before_edit and R.counts["REMOVE"] == before_rm:
        R.ok("no edits or removals needed — table already clean")
    return df

# --------------------------------------------------------------------------
# Cross-table integrity checks (report-only)
# --------------------------------------------------------------------------

def check_keys(tables: dict[str, pd.DataFrame]) -> None:
    R.sub("Primary-key uniqueness")
    pk = {
        "farms.csv": ["farm_id"],
        "greenhouses.csv": ["greenhouse_id"],
        "plots.csv": ["plot_id"],
        "season_summary.csv": ["plot_id"],
        "daily_sensor_readings.csv": ["plot_id", "date"],
        "daily_input_costs.csv": ["plot_id", "date"],
    }
    clean = True
    for name, keys in pk.items():
        df = tables.get(name)
        if df is None:
            continue
        dups = int(df.duplicated(keys).sum())
        if dups:
            R.flag(f"{name}: {dups} duplicate key(s) on {keys}", dups)
            clean = False
    if clean:
        R.ok("all primary keys unique")


def check_referential_integrity(tables: dict[str, pd.DataFrame]) -> None:
    R.sub("Referential integrity (foreign keys)")
    farms = tables["farms.csv"]
    gh = tables["greenhouses.csv"]
    plots = tables["plots.csv"]
    farm_ids, gh_ids, plot_ids = set(farms.farm_id), set(gh.greenhouse_id), set(plots.plot_id)
    clean = True

    def orphans(df, col, valid, label):
        nonlocal clean
        missing = set(df[col].dropna()) - valid
        if missing:
            n = int(df[col].isin(missing).sum())
            R.flag(f"{label}: {len(missing)} {col} not found in parent "
                   f"({n} row(s)): {sorted(missing)[:5]}", n)
            clean = False

    orphans(gh, "farm_id", farm_ids, "greenhouses.csv")
    orphans(plots, "farm_id", farm_ids, "plots.csv")
    orphans(plots, "greenhouse_id", gh_ids, "plots.csv")
    for name in ["daily_sensor_readings.csv", "daily_input_costs.csv",
                 "input_applications.csv", "scouting_observations.csv",
                 "season_summary.csv"]:
        df = tables.get(name)
        if df is None:
            continue
        orphans(df, "plot_id", plot_ids, name)
        if "greenhouse_id" in df.columns:
            orphans(df, "greenhouse_id", gh_ids, name)
        if "farm_id" in df.columns:
            orphans(df, "farm_id", farm_ids, name)

    # every plot should have exactly one season summary row
    miss = plot_ids - set(tables["season_summary.csv"].plot_id)
    if miss:
        R.flag(f"plots without a season_summary row: {len(miss)}", len(miss))
        clean = False
    if clean:
        R.ok("all foreign keys resolve to a parent row")


def check_computed_columns(tables: dict[str, pd.DataFrame]) -> None:
    R.sub("Computed-column consistency")
    tol = 0.01
    clean = True

    dic = tables["daily_input_costs.csv"]
    comp = dic[["daily_energy_cost", "daily_fertilizer_cost", "daily_labor_cost",
                "daily_pesticide_cost", "daily_water_cost"]].sum(axis=1)
    bad = int((np.abs(comp - dic.daily_total_input_cost) > tol).sum())
    if bad:
        R.flag(f"daily_input_costs: {bad} row(s) where component costs != "
               f"daily_total_input_cost", bad); clean = False
    pr = dic.daily_precision_cost + dic.daily_routine_cost
    bad = int((np.abs(pr - dic.daily_total_input_cost) > tol).sum())
    if bad:
        R.flag(f"daily_input_costs: {bad} row(s) where precision+routine != "
               f"total", bad); clean = False
    bad = int((dic.daily_precision_actions_count > dic.daily_total_actions_count).sum())
    if bad:
        R.flag(f"daily_input_costs: {bad} row(s) where precision_actions > "
               f"total_actions", bad); clean = False

    ia = tables["input_applications.csv"]
    bad = int((np.abs(ia.quantity * ia.unit_cost - ia.total_cost) > tol).sum())
    if bad:
        R.flag(f"input_applications: {bad} row(s) where quantity*unit_cost != "
               f"total_cost", bad); clean = False

    ss = tables["season_summary.csv"]
    bad = int((np.abs(ss.season_revenue_cad - ss.total_cost_cad
                      - ss.season_profit_cad) > tol).sum())
    if bad:
        R.flag(f"season_summary: {bad} row(s) where revenue-cost != profit",
               bad); clean = False
    roi = (ss.season_revenue_cad - ss.total_cost_cad) / ss.total_cost_cad
    bad = int((np.abs(roi - ss.season_roi) > 0.001).sum())
    if bad:
        R.flag(f"season_summary: {bad} row(s) where (rev-cost)/cost != "
               f"season_roi", bad); clean = False

    if clean:
        R.ok("all documented computed columns reconcile within tolerance")


def check_cross_consistency(tables: dict[str, pd.DataFrame]) -> None:
    R.sub("Cross-table value consistency (sensor vs plots)")
    sr = tables["daily_sensor_readings.csv"]
    plots = tables["plots.csv"]
    m = sr.merge(plots[["plot_id", "greenhouse_id", "farm_id", "crop"]],
                 on="plot_id", suffixes=("", "_p"))
    clean = True
    for col in ["greenhouse_id", "farm_id", "crop"]:
        bad = int((m[col] != m[f"{col}_p"]).sum())
        if bad:
            R.flag(f"daily_sensor_readings: {bad} row(s) where {col} disagrees "
                   f"with plots", bad); clean = False
    if clean:
        R.ok("sensor rows agree with plots on greenhouse_id, farm_id, crop")


def check_alert_logic(tables: dict[str, pd.DataFrame]) -> None:
    R.sub("Alert / action flag logic (sensor)")
    sr = tables["daily_sensor_readings.csv"]
    no_alert = {"No Alert"}   # placeholder we filled above
    no_action = {"No Action"}
    has_type = ~sr.alert_type.isin(no_alert) & sr.alert_type.notna()
    has_rec = ~sr.recommended_action.isin(no_action) & sr.recommended_action.notna()

    a = int(((sr.alert_flag == 0) & has_type).sum())
    b = int(((sr.alert_flag == 1) & ~has_type).sum())
    c = int(((sr.action_taken == 1) & (sr.alert_flag == 0)).sum())
    d = int(((sr.action_taken == 1) & ~has_rec).sum())
    found = False
    if a:
        R.flag(f"{a} row(s): alert_flag=0 but alert_type is populated", a); found = True
    if b:
        R.flag(f"{b} row(s): alert_flag=1 but no alert_type", b); found = True
    if c:
        R.flag(f"{c} row(s): action_taken=1 but alert_flag=0 "
               f"(action without an alert)", c); found = True
    if d:
        R.flag(f"{d} row(s): action_taken=1 but no recommended_action", d); found = True
    if found:
        print("    NOTE: alert_flag vs alert_type cannot be auto-reconciled — "
              "unclear\n          which field is authoritative. Left raw for "
              "your decision.")
    else:
        R.ok("alert/action flags are internally consistent")


def check_date_alignment(tables: dict[str, pd.DataFrame]) -> None:
    R.sub("Date-range alignment across tables")
    spans = {}
    for name in DATE_COLS:
        df = tables.get(name)
        if df is None or "date" not in df.columns:
            continue
        d = pd.to_datetime(df["date"], errors="coerce")
        spans[name] = (d.min(), d.max())
        print(f"    {name:32s} {d.min().date()} -> {d.max().date()}")
    years = {name: {lo.year, hi.year} for name, (lo, hi) in spans.items()}
    all_years = set().union(*years.values()) if years else set()
    if len(all_years) > 1:
        R.flag("tables span different years — date-based joins "
               "(e.g. input_applications<->market_and_input_prices on date, "
               "scouting<->sensor on date) will NOT line up. Confirm the season "
               "calendar before joining on date.")
    else:
        R.ok("all dated tables fall in the same year")


def cross_table_checks(tables: dict[str, pd.DataFrame]) -> None:
    R.section("CROSS-TABLE INTEGRITY CHECKS (report-only)")
    check_keys(tables)
    check_referential_integrity(tables)
    check_computed_columns(tables)
    check_cross_consistency(tables)
    check_alert_logic(tables)
    check_date_alignment(tables)

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

FILES = [
    "farms.csv", "greenhouses.csv", "plots.csv",
    "daily_sensor_readings.csv", "daily_input_costs.csv",
    "input_applications.csv", "scouting_observations.csv",
    "market_and_input_prices.csv", "season_summary.csv",
]


def main() -> int:
    ap = argparse.ArgumentParser(description="Clean & validate GreenLeaf CEA data.")
    ap.add_argument("--data-dir", default="data", help="folder with raw CSVs")
    ap.add_argument("--output-dir", default="data/clean",
                    help="folder to write cleaned CSVs")
    ap.add_argument("--no-write", action="store_true",
                    help="dry run: report only, do not write cleaned files")
    args = ap.parse_args()

    # Ensure non-ASCII chars (em-dashes, arrows) print cleanly on Windows consoles.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    data_dir = Path(args.data_dir)
    out_dir = Path(args.output_dir)
    if not data_dir.exists():
        print(f"ERROR: data dir '{data_dir}' not found.", file=sys.stderr)
        return 1

    print("GreenLeaf CEA — data cleaning & validation")
    print(f"Source : {data_dir.resolve()}")
    print(f"Output : {'(dry run, nothing written)' if args.no_write else out_dir.resolve()}")

    tables: dict[str, pd.DataFrame] = {}
    for name in FILES:
        path = data_dir / name
        if not path.exists():
            R.flag(f"MISSING FILE: {name}")
            continue
        df = pd.read_csv(path)
        tables[name] = clean_table(df, name)

    if len(tables) == len(FILES):
        cross_table_checks(tables)
    else:
        print("\n(skipping cross-table checks — some files were missing)")

    if not args.no_write:
        out_dir.mkdir(parents=True, exist_ok=True)
        for name, df in tables.items():
            # write dates back as plain YYYY-MM-DD, not full timestamps
            out = df.copy()
            if "date" in out.columns and pd.api.types.is_datetime64_any_dtype(out["date"]):
                out["date"] = out["date"].dt.strftime("%Y-%m-%d")
            out.to_csv(out_dir / name, index=False)
        print(f"\nWrote {len(tables)} cleaned file(s) to {out_dir.resolve()}")

    R.summary()
    return 0


if __name__ == "__main__":
    sys.exit(main())

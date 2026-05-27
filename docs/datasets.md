# GreenLeaf CEA — Dataset Reference

> 9 tables, 120 plots, 8 farms, 20 greenhouses, one full growing season.
> All tables link via `plot_id`, `greenhouse_id`, and `farm_id`.

---

## Table of Contents

1. FARMS
2. GREENHOUSES
3. PLOTS
4. DAILY_SENSOR_READINGS
5. DAILY_INPUT_COSTS
6. INPUT_APPLICATIONS
7. SCOUTING_OBSERVATIONS
8. MARKET_AND_INPUT_PRICES
9. SEASON_SUMMARY
10. Entity Relationship Overview

---

## 1. FARMS

**Rows:** 8 (one per farm location)  
**Grain:** Farm level  
**Key:** `farm_id`

| Column | Type | Description |
|---|---|---|
| `farm_id` | Dimension / PK | Unique farm code (e.g. `F01`, `F02`) |
| `farm_name` | Dimension | Human-readable farm name (e.g. `BC Harvest 1`) |
| `region` | Dimension | Municipality or region (e.g. Abbotsford, Maple Ridge) |
| `primary_crop` | Dimension | Main crop at this farm (Tomato, Pepper, Strawberry, Cucumber) |
| `greenhouse_acres` | Measure | Total greenhouse area in acres — use for scale normalization |
| `production_system` | Dimension | Farm production model (`Greenhouse` or `Mixed`) |
| `climate_zone` | Dimension | Broad climate classification (`Coastal`, `Interior`, `Fraser Valley`) |

---

## 2. GREENHOUSES

**Rows:** 20 (one per greenhouse unit)  
**Grain:** Greenhouse level  
**Key:** `greenhouse_id`  
**Joins to:** `FARMS` via `farm_id`

| Column | Type | Description |
|---|---|---|
| `greenhouse_id` | Dimension / PK | Unique greenhouse code (e.g. `GH001`) |
| `farm_id` | Dimension / FK | Links to `FARMS.farm_id` |
| `crop` | Dimension | Primary crop in this greenhouse (Tomato, Strawberry, Cucumber, Pepper) |
| `structure_type` | Dimension | Construction material (`Glass` or `Polyfilm`) |
| `heating_system` | Dimension | Heating technology (`Hydronic`, `Natural Gas`, `Heat Pump`) |
| `irrigation_system` | Dimension | Irrigation method (`Drip`, `EBB-Flow`, `Fertigation`) |
| `capacity_plants` | Measure | Approximate max plant capacity — use to normalize yield/revenue per plant |
| `sensor_density_per_100m2` | Measure | Number of sensors per 100 m² — higher = more granular monitoring |

---

## 3. PLOTS

**Rows:** 120 (one per experimental microplot)  
**Grain:** Plot level  
**Key:** `plot_id`  
**Joins to:** `GREENHOUSES` via `greenhouse_id`, `FARMS` via `farm_id`

| Column | Type | Description |
|---|---|---|
| `plot_id` | Dimension / PK | Unique microplot code (e.g. `P0001`) |
| `greenhouse_id` | Dimension / FK | Links to `GREENHOUSES.greenhouse_id` |
| `farm_id` | Dimension / FK | Links to `FARMS.farm_id` |
| `crop` | Dimension | Crop grown in this plot (may differ from greenhouse default) |
| `treatment_block` | Dimension | Randomization block (`A`, `B`, `C`, `D`) — controls for bias |
| `treatment` | Dimension | **Experimental treatment applied** — one of 7 mutually exclusive levels (see below) |
| `plot_area_m2` | Measure | Plot size in m² — use for per-area normalization |
| `plant_density_plants_m2` | Measure | Plants per m² — affects yield and stress dynamics |
| `row_orientation` | Dimension | Row direction (`North`, `South`, `East`, `West`) — affects light exposure |

### Treatment Levels

| Treatment | Description |
|---|---|
| `Control` | Baseline routine management — reference for all comparisons |
| `Low N` | Lower nitrogen fertilizer than baseline |
| `High N` | Higher nitrogen fertilizer than baseline |
| `Integrated Pest` | Balanced, targeted pest management approach |
| `Reduced Pest` | Less pest-control input than standard |
| `High Light` | Increased light exposure |
| `Shade` | Reduced light exposure |

---

## 4. DAILY_SENSOR_READINGS

**Rows:** 25,200 (one per plot per day)  
**Grain:** Plot × Date  
**Joins to:** `PLOTS` via `plot_id`, `GREENHOUSES` via `greenhouse_id`, `FARMS` via `farm_id`

### Identity / Keys

| Column | Type | Description |
|---|---|---|
| `date` | Date | Calendar date of observation |
| `plot_id` | Dimension / FK | Links to `PLOTS.plot_id` |
| `greenhouse_id` | Dimension / FK | Links to `GREENHOUSES.greenhouse_id` |
| `farm_id` | Dimension / FK | Links to `FARMS.farm_id` |
| `crop` | Dimension | Crop in this plot on this date (convenience duplicate from PLOTS) |

### Environmental Sensors

| Column | Type | Description |
|---|---|---|
| `air_temp_c` | Measure | Greenhouse air temperature (°C) |
| `relative_humidity_pct` | Measure | Relative humidity (0–100%) |
| `vpd_kpa` | Measure | Vapor pressure deficit (kPa) — high VPD = plants lose water faster |
| `co2_ppm` | Measure | CO₂ concentration (ppm) — higher = more enrichment |
| `light_ppfd` | Measure | Light for photosynthesis (µmol/m²/s) |
| `substrate_moisture` | Measure | Root-zone moisture (0–1) — low = dry, high = wet |
| `substrate_ec` | Measure | Electrical conductivity of root solution (mS/cm) — nutrient/salt load |
| `substrate_ph` | Measure | pH of root solution — acidity/alkalinity |
| `canopy_temp_c` | Measure | Leaf/canopy surface temperature (°C) — divergence from air temp signals stress |

### Stress & Risk Indices

| Column | Type | Range | Description |
|---|---|---|---|
| `pest_pressure_index` | Measure | 0–1 | Modeled pest risk (0 = none, 1 = extreme) |
| `disease_risk_index` | Measure | 0–1 | Modeled disease risk (0 = none, 1 = extreme) |
| `plant_stress_index` | Measure | 0–1 | Composite crop stress score (0 = healthy, 1 = critical) |

### Alert & Response Fields

| Column | Type | Description |
|---|---|---|
| `alert_type` | Dimension | Type of alert triggered (e.g. `High VPD`, `Low Moisture`, `High Canopy Temp`, `High Pest Pressure`) — null if no alert |
| `alert_flag` | Indicator (0/1) | `1` = alert active on this plot/date, `0` = no alert |
| `recommended_action` | Dimension | System-suggested response (e.g. `Increase Irrigation`, `Increase Venting`) |
| `action_taken` | Indicator (0/1) | `1` = recommended action was carried out, `0` = not acted on |
| `action_delay_days` | Measure | Days between alert and action (`0` = same-day response) |
| `post_action_stress_delta_3d` | Measure | Change in `plant_stress_index` over 3 days after action (negative = improvement) |

---

## 5. DAILY_INPUT_COSTS

**Rows:** 25,200 (one per plot per day)  
**Grain:** Plot × Date  
**Joins to:** `PLOTS` via `plot_id`, `GREENHOUSES` via `greenhouse_id`, `FARMS` via `farm_id`

> ⚠️ This table supports cost pattern exploration and illustrative examples. It is **not** a full line-by-line reconstruction of the accounting totals in `SEASON_SUMMARY`.

### Identity / Keys

| Column | Type | Description |
|---|---|---|
| `date` | Date | Calendar date of record |
| `plot_id` | Dimension / FK | Links to `PLOTS.plot_id` |
| `greenhouse_id` | Dimension / FK | Links to `GREENHOUSES.greenhouse_id` |
| `farm_id` | Dimension / FK | Links to `FARMS.farm_id` |

### Cost Breakdown

| Column | Type | Description |
|---|---|---|
| `daily_energy_cost` | Measure (CAD) | Energy cost (heating, lighting, ventilation) for this plot/date |
| `daily_fertilizer_cost` | Measure (CAD) | Fertilizer cost for this plot/date |
| `daily_labor_cost` | Measure (CAD) | Labor cost (precision + routine) for this plot/date |
| `daily_pesticide_cost` | Measure (CAD) | Pesticide/crop-protection cost for this plot/date |
| `daily_water_cost` | Measure (CAD) | Irrigation water cost for this plot/date |
| `daily_total_input_cost` | Measure (CAD) | Sum of all above costs (energy + fertilizer + labor + pesticide + water) |

### Precision vs Routine Split

| Column | Type | Description |
|---|---|---|
| `daily_precision_cost` | Measure (CAD) | Portion of total cost from precision (alert-driven) actions |
| `daily_routine_cost` | Measure (CAD) | Portion of total cost from routine (scheduled) actions |
| `daily_precision_actions_count` | Measure (count) | Number of precision actions on this plot/date |
| `daily_total_actions_count` | Measure (count) | Total actions (precision + routine) on this plot/date |

---

## 6. INPUT_APPLICATIONS

**Rows:** 4,613 (one per application event)  
**Grain:** Application event level (multiple rows per plot per date possible)  
**Joins to:** `PLOTS` via `plot_id`, `GREENHOUSES` via `greenhouse_id`, `FARMS` via `farm_id`

### Identity / Keys

| Column | Type | Description |
|---|---|---|
| `date` | Date | Date of the application |
| `plot_id` | Dimension / FK | Links to `PLOTS.plot_id` |
| `greenhouse_id` | Dimension / FK | Links to `GREENHOUSES.greenhouse_id` |
| `farm_id` | Dimension / FK | Links to `FARMS.farm_id` |

### Application Details

| Column | Type | Description |
|---|---|---|
| `input_type` | Dimension | Resource applied (`Fertilizer`, `Pesticide`, `Water`, `Labor`, `Energy`) |
| `quantity` | Measure | Amount applied — units depend on `input_type` (kg, L, hours, kWh) |
| `unit_cost` | Measure (CAD) | Cost per unit (CAD/kg, CAD/L, CAD/hr, CAD/kWh) |
| `total_cost` | Measure (CAD) | Total cost of this event (`quantity × unit_cost`) |

### Management Intent

| Column | Type | Description |
|---|---|---|
| `reason` | Dimension | Immediate operational trigger (`Shock response`, `Growth phase`, `Pest response`, `Irrigation adjustment`, `Routine`) |
| `purpose` | Dimension | High-level intent (`Routine` or `Response to alert`) |
| `is_precision_action` | Indicator (0/1) | `1` = precision/alert-driven action, `0` = routine action |

---

## 7. SCOUTING_OBSERVATIONS

**Rows:** 1,800 (weekly human observations per plot)  
**Grain:** Plot × Scouting date (less frequent than daily)  
**Joins to:** `PLOTS` via `plot_id`, `GREENHOUSES` via `greenhouse_id`, `FARMS` via `farm_id`

### Identity / Keys

| Column | Type | Description |
|---|---|---|
| `date` | Date | Date of scouting visit |
| `plot_id` | Dimension / FK | Links to `PLOTS.plot_id` |
| `greenhouse_id` | Dimension / FK | Links to `GREENHOUSES.greenhouse_id` |
| `farm_id` | Dimension / FK | Links to `FARMS.farm_id` |

### Observed Plant Condition

| Column | Type | Description |
|---|---|---|
| `blossom_count` | Measure | Blossoms per plant — leading indicator of yield potential |
| `pest_severity` | Measure (0–1) | Visual pest damage rating (0 = none, 1 = severe) |
| `disease_severity` | Measure (0–1) | Visual disease symptom rating (0 = none, 1 = severe) |
| `leaf_color` | Dimension | Foliage health proxy (`Excellent`, `Good`, `Fair`, `Poor`) |
| `notes_flag` | Dimension | Coded issue severity from scout notes (`None`, `Minor`, `Moderate`, `Severe`) |

---

## 8. MARKET_AND_INPUT_PRICES

**Rows:** 840 (weekly external price observations)  
**Grain:** Item × Week  
**No FK joins** — used for external benchmarking against `INPUT_APPLICATIONS`

| Column | Type | Description |
|---|---|---|
| `date` | Date | Week-ending date for the price observation |
| `item` | Dimension | Resource being priced (`Fertilizer`, `Pesticide`, `Energy`, `Water`) |
| `price` | Measure (CAD) | Observed unit price in CAD |
| `unit` | Dimension | Unit for the price (e.g. `CAD/kg`, `CAD/L`, `CAD/kWh`) |

> **Usage:** Join `item` + `date` to `INPUT_APPLICATIONS.input_type` + `date` to compare internal spending against market rates.

---

## 9. SEASON_SUMMARY

**Rows:** 120 (one per plot — final season results)  
**Grain:** Plot level (end of season)  
**Key:** `plot_id`  
**Joins to:** `PLOTS` via `plot_id`

> ⚠️ This is the **primary source** for revenue, cost, profit, ROI, and precision benefit. Use this table — not `DAILY_INPUT_COSTS` — for final financial totals.

### Identity / Keys

| Column | Type | Description |
|---|---|---|
| `plot_id` | Dimension / PK / FK | Links to `PLOTS.plot_id` |

### Production & Quality

| Column | Type | Description |
|---|---|---|
| `season_yield_kg_m2` | Measure | Total yield per m² for the season (kg/m²) |
| `marketable_ratio` | Measure (0–1) | Share of yield that is sellable at premium grade |

### Financial Performance

| Column | Type | Description |
|---|---|---|
| `season_revenue_cad` | Measure (CAD) | Total seasonal revenue for this plot |
| `total_cost_cad` | Measure (CAD) | Total seasonal cost (inputs + fixed allocations) |
| `season_profit_cad` | Measure (CAD) | Profit = `season_revenue_cad` − `total_cost_cad` |
| `season_roi` | Measure (ratio) | ROI = `(revenue − cost) / cost` — values > 1 mean >100% return |
| `precision_benefit_cad` | Measure (CAD) | Estimated CAD benefit attributable to precision vs routine management |

### Derived / Useful Combinations

| Concept | How to compute |
|---|---|
| Marketable yield (kg/m²) | `season_yield_kg_m2 × marketable_ratio` |
| Routine cost | `total_cost_cad − precision_benefit_cad` (approximate) |
| Precision ROI contribution | `precision_benefit_cad / total_cost_cad` |

---

## Entity Relationship Overview

```
FARMS (8)
  └── GREENHOUSES (20)  [farm_id]
        └── PLOTS (120)  [greenhouse_id, farm_id]
              ├── DAILY_SENSOR_READINGS (25,200)  [plot_id, greenhouse_id, farm_id]
              ├── DAILY_INPUT_COSTS (25,200)       [plot_id, greenhouse_id, farm_id]
              ├── INPUT_APPLICATIONS (4,613)       [plot_id, greenhouse_id, farm_id]
              ├── SCOUTING_OBSERVATIONS (1,800)    [plot_id, greenhouse_id, farm_id]
              └── SEASON_SUMMARY (120)             [plot_id]

MARKET_AND_INPUT_PRICES (840)  — no FK, used for benchmarking
```

### Key Join Patterns

| Goal | Join |
|---|---|
| Plot → treatment + crop | `PLOTS` on `plot_id` |
| Plot → greenhouse details | `PLOTS` → `GREENHOUSES` on `greenhouse_id` |
| Plot → farm/region | `PLOTS` → `FARMS` on `farm_id` |
| Daily data → end-of-season outcomes | `DAILY_SENSOR_READINGS` → `SEASON_SUMMARY` on `plot_id` |
| Applications → market benchmark | `INPUT_APPLICATIONS.input_type` + `date` → `MARKET_AND_INPUT_PRICES.item` + `date` |

---

## Quick Reference: Indicator / Flag Fields

| Field | Table | Meaning of `1` |
|---|---|---|
| `alert_flag` | DAILY_SENSOR_READINGS | Alert was active on this plot/date |
| `action_taken` | DAILY_SENSOR_READINGS | Recommended action was carried out |
| `is_precision_action` | INPUT_APPLICATIONS | This application is a precision/alert-driven action |

---

## Notes

- **"Plot" means microplot**, not a chart/graph.
- `DAILY_INPUT_COSTS` and `DAILY_SENSOR_READINGS` share the same grain (plot × date) and can be joined directly on `plot_id + date`.
- `post_action_stress_delta_3d` — **negative values are good** (stress decreased after action).
- `season_roi` — values **values above 1 indicate > 100% return relative to cost**; the formula is `(revenue − cost) / cost`, not revenue/cost.
- `marketable_ratio` of `1.0` means 100% of yield met market standards.
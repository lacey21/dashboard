"""
generate_crop_aggregates.py
────────────────────────────────────────────────────────────────────────────
Generates public/data/crop-strawberry/ aggregate JSON files by combining
data from F03, F05, F06, F07, F08 (all strawberry farms).

Single-crop farms (Tomato→F01, Pepper→F02, Cucumber→F04) already have
their own per-farm folders so no aggregation is needed there.

Run from the project root:
    python3 generate_crop_aggregates.py
"""
from __future__ import annotations
import json, os, statistics
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).parent / "farm-dashboard" / "public" / "data"
STRAWBERRY_FARMS = ["F03", "F05", "F06", "F07", "F08"]
OUT = BASE / "crop-strawberry"
ALL_DIR = BASE / "all"


# ── helpers ──────────────────────────────────────────────────────────────────

def load(farm: str, filename: str) -> dict:
    path = BASE / farm / filename
    with open(path) as f:
        return json.load(f)

def mean(values: list[float]) -> float:
    return statistics.mean(values) if values else 0.0

def save(filename: str, data: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / filename, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  wrote {OUT / filename}")


# ── home.json ────────────────────────────────────────────────────────────────

def agg_home():
    farms = [load(f, "home.json") for f in STRAWBERRY_FARMS]

    # precisionVsOutcome: average by week across farms
    all_weeks: dict[str, list] = defaultdict(list)
    for farm in farms:
        for row in farm["farmHealthDrawer"].get("precisionVsOutcome", []):
            all_weeks[row["week"]].append(row)
    pvo = []
    for week in sorted(all_weeks):
        rows = all_weeks[week]
        pvo.append({
            "week": week,
            "daily_precision_cost": mean([r["daily_precision_cost"] for r in rows]),
            "avg_delta": mean([r["avg_delta"] for r in rows]),
        })

    dd = defaultdict(int)
    for farm in farms:
        for k, v in farm["farmHealthDrawer"]["delayDistribution"].items():
            dd[k] += v

    out = {
        "banner": {
            "criticalPlots":    sum(f["banner"]["criticalPlots"] for f in farms),
            "unactionedAlerts": sum(f["banner"]["unactionedAlerts"] for f in farms),
            "roiVsBaseline":    round(mean([f["banner"]["roiVsBaseline"] for f in farms]), 1),
        },
        "kpis": {
            "farmHealthScore":          round(mean([f["kpis"]["farmHealthScore"] for f in farms]), 1),
            "farmHealthDelta":          round(mean([f["kpis"]["farmHealthDelta"] for f in farms]), 1),
            "activeAlerts":             sum(f["kpis"]["activeAlerts"] for f in farms),
            "activeAlertsDelta":        sum(f["kpis"]["activeAlertsDelta"] for f in farms),
            "seasonRoiPct":             round(mean([f["kpis"]["seasonRoiPct"] for f in farms]), 1),
            "seasonRoiDelta":           round(mean([f["kpis"]["seasonRoiDelta"] for f in farms]), 1),
            "precisionActionRate":      round(mean([f["kpis"]["precisionActionRate"] for f in farms]), 1),
            "precisionActionRateDelta": round(mean([f["kpis"]["precisionActionRateDelta"] for f in farms]), 1),
        },
        "farmHealthDrawer": {
            "highStressDaysPct": round(mean([f["farmHealthDrawer"]["highStressDaysPct"] for f in farms]), 1),
            "meanResponseDays":  round(mean([f["farmHealthDrawer"]["meanResponseDays"] for f in farms]), 2),
            "delayDistribution": dict(dd),
            "responseRate":         round(mean([f["farmHealthDrawer"]["responseRate"] for f in farms]), 1),
            "controlResponseRate":  round(mean([f["farmHealthDrawer"]["controlResponseRate"] for f in farms]), 1),
            "precisionVsOutcome": pvo,
        },
        "nav": {
            "alertTriageUrgent":        sum(f["nav"]["alertTriageUrgent"] for f in farms),
            "seasonalPrecisionBenefit": round(sum(f["nav"]["seasonalPrecisionBenefit"] for f in farms)),
            "sustainabilityScore":      round(mean([f["nav"]["sustainabilityScore"] for f in farms]), 1),
        },
        "latestDate": max(f["latestDate"] for f in farms),
    }
    save("home.json", out)


# ── sustainability.json ───────────────────────────────────────────────────────

def agg_sustainability():
    farms = [load(f, "sustainability.json") for f in STRAWBERRY_FARMS]

    # Average subscores
    subscore_keys = list(farms[0]["subscores"].keys())
    avg_subscores = {k: round(mean([f["subscores"][k] for f in farms]), 1) for k in subscore_keys}

    # Trend keys (may not exist in older files)
    trend_keys = list(farms[0].get("subscoreTrends", {}).keys())
    avg_trends = {k: round(mean([f.get("subscoreTrends", {}).get(k, 0) for f in farms]), 1)
                  for k in trend_keys}

    # Weakest / strongest from averaged subscores
    weakest_k  = min(avg_subscores, key=avg_subscores.get)
    strongest_k = max(avg_subscores, key=avg_subscores.get)

    overall = round(mean([f["overallScore"] for f in farms]), 1)
    if overall >= 75:
        label = "Strong"
    elif overall >= 50:
        label = "Moderate"
    elif overall >= 25:
        label = "Needs Improvement"
    else:
        label = "Critical"

    # Moisture trend: average by week
    all_weeks: dict[str, list[float]] = defaultdict(list)
    for farm in farms:
        for row in farm.get("moistureTrend", []):
            all_weeks[row["week"]].append(row["substrate_moisture"])
    moisture_trend = [{"week": w, "substrate_moisture": round(mean(vs), 4)}
                      for w, vs in sorted(all_weeks.items())]

    # Risks: take worst level per risk id across farms
    LEVEL_RANK = {"critical": 3, "warning": 2, "healthy": 1}
    risk_map: dict[str, dict] = {}
    for farm in farms:
        for r in farm.get("risks", []):
            rid = r["id"]
            if rid not in risk_map or LEVEL_RANK.get(r["level"], 0) > LEVEL_RANK.get(risk_map[rid]["level"], 0):
                risk_map[rid] = r
    risks = list(risk_map.values())

    # controlBaseline from first farm (it's a fixed reference)
    control_baseline = farms[0].get("controlBaseline", {})

    # benchmarks: average
    bk_keys = list(farms[0]["benchmarks"].keys())
    benchmarks = {k: round(mean([f["benchmarks"][k] for f in farms]), 4) for k in bk_keys}

    out = {
        "overallScore":          overall,
        "scoreLabel":            label,
        "subscores":             avg_subscores,
        "subscoreTrends":        avg_trends,
        "weakestCategory":       weakest_k,
        "weakestScore":          avg_subscores[weakest_k],
        "strongestCategory":     strongest_k,
        "strongestScore":        avg_subscores[strongest_k],
        "farm": {
            "farmName":        "Strawberry Farms (F03, F05–F08)",
            "region":          "BC Lower Mainland",
            "climateZone":     "Coastal",
            "primaryCrop":     "Strawberry",
        },
        "benchmarks":            benchmarks,
        "carbonEmissionsKgCO2e": round(sum(f.get("carbonEmissionsKgCO2e", 0) for f in farms), 2),
        "carbonKgPerKgYield":    round(mean([f.get("carbonKgPerKgYield", 0) for f in farms]), 4),
        "carbonEmissionsScore":  round(mean([f.get("carbonEmissionsScore", 0) for f in farms]), 1),
        "risks":                 risks,
        "controlBaseline":       control_baseline,
        "moistureTrend":         moisture_trend,
        "aggregationType":       "all_farms",
        "numFarms":              len(STRAWBERRY_FARMS),
    }
    save("sustainability.json", out)


# ── seasonal_evaluation.json ──────────────────────────────────────────────────

def agg_seasonal():
    farms = [load(f, "seasonal_evaluation.json") for f in STRAWBERRY_FARMS]
    all_data = load("all", "seasonal_evaluation.json")  # for yieldBenchmark + yieldModel

    # Financial totals
    fin_sum_keys  = ["totalRevenue", "totalCost", "precisionSpend", "precisionBenefit"]
    fin_mean_keys = ["avgYield", "controlYield", "meanRoiPct"]
    fin: dict = {}
    for k in fin_sum_keys:
        fin[k] = round(sum(f["financials"][k] for f in farms))
    for k in fin_mean_keys:
        fin[k] = round(mean([f["financials"][k] for f in farms]), 2)
    ps = max(fin["precisionSpend"], 1)
    fin["benefitPerDollar"] = round(fin["precisionBenefit"] / ps, 2)

    # spendReturnByTreatment: average by treatment
    treat_map: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for farm in farms:
        for row in farm["spendReturnByTreatment"]:
            treat_map[row["treatment"]]["avg_cost"].append(row["avg_cost"])
            treat_map[row["treatment"]]["avg_revenue"].append(row["avg_revenue"])
    spend_return = [
        {"treatment": t,
         "avg_cost":    round(mean(v["avg_cost"]), 2),
         "avg_revenue": round(mean(v["avg_revenue"]), 2)}
        for t, v in treat_map.items()
    ]

    # controlRevenueBaseline: mean
    ctrl_baseline = round(mean([f["controlRevenueBaseline"] for f in farms]), 2)

    # costOverTime: average by week
    week_rows: dict[str, list[dict]] = defaultdict(list)
    for farm in farms:
        for row in farm["costOverTime"]:
            week_rows[row["week"]].append(row)
    cost_over_time = []
    for week in sorted(week_rows):
        rows = week_rows[week]
        cost_over_time.append({
            "week":               week,
            "precision":          round(mean([r["precision"] for r in rows]), 2),
            "routine":            round(mean([r["routine"] for r in rows]), 2),
            "total":              round(mean([r.get("total", r["precision"] + r["routine"]) for r in rows]), 2),
            "plant_stress_index": round(mean([r["plant_stress_index"] for r in rows]), 4),
        })

    # scatterPlots: concatenate
    scatter = []
    for farm in farms:
        scatter.extend(farm["scatterPlots"])

    # yieldBenchmark: keep only Strawberry row from all-farms data
    yield_bm = [r for r in all_data["yieldBenchmark"] if r.get("crop") == "Strawberry"]

    # monthlyRevenueCurve: sum by month
    month_map: dict[int, float] = defaultdict(float)
    for farm in farms:
        for row in farm["monthlyRevenueCurve"]:
            month_map[row["month"]] += row["revenue"]
    monthly_rev = [{"month": m, "revenue": round(v, 2)} for m, v in sorted(month_map.items())]

    precisionBenefitPerSeason = round(sum(f.get("precisionBenefitPerSeason", f["financials"]["precisionBenefit"])
                                          for f in farms), 2)

    out = {
        "financials":              fin,
        "spendReturnByTreatment":  spend_return,
        "controlRevenueBaseline":  ctrl_baseline,
        "costOverTime":            cost_over_time,
        "scatterPlots":            scatter,
        "yieldBenchmark":          yield_bm,
        "yieldModel":              all_data["yieldModel"],  # fleet-wide surrogate
        "monthlyRevenueCurve":     monthly_rev,
        "precisionBenefitPerSeason": precisionBenefitPerSeason,
    }
    save("seasonal_evaluation.json", out)


# ── alert_triage.json ─────────────────────────────────────────────────────────

def agg_alert_triage():
    farms = [load(f, "alert_triage.json") for f in STRAWBERRY_FARMS]
    all_data = load("all", "alert_triage.json")  # for stressModel

    weeks = sorted(set(w for f in farms for w in f["weeks"]))
    default_week = farms[0]["defaultWeek"]

    # weeklyStats: sum/average by week
    ws_out: dict = {}
    for week in weeks:
        wss = [f["weeklyStats"].get(week) for f in farms if week in f["weeklyStats"]]
        if not wss:
            continue
        ws_out[week] = {
            "highStressEvents":    sum(w["highStressEvents"] for w in wss),
            "highStressDelta":     round(mean([w["highStressDelta"] for w in wss]), 1),
            "responseRate":        round(mean([w["responseRate"] for w in wss]), 1),
            "responseRateDelta":   round(mean([w["responseRateDelta"] for w in wss]), 1),
            "avgResponseDays":     round(mean([w["avgResponseDays"] for w in wss]), 2),
            "avgResponseDaysDelta":round(mean([w["avgResponseDaysDelta"] for w in wss]), 2),
        }

    # plotRankings: concatenate by week
    pr_out: dict = {}
    for week in weeks:
        plots = []
        for farm in farms:
            plots.extend(farm["plotRankings"].get(week, []))
        pr_out[week] = plots

    # plotDetails: merge all
    pd_out: dict = {}
    for farm in farms:
        pd_out.update(farm.get("plotDetails", {}))

    # responseOverTime: average by week
    row_weeks: dict[str, list[float]] = defaultdict(list)
    for farm in farms:
        for row in farm.get("responseOverTime", []):
            row_weeks[row["week"]].append(row["response_rate"])
    rot = [{"week": w, "response_rate": round(mean(vs), 1)}
           for w, vs in sorted(row_weeks.items())]

    # alertTypeBreakdown: merge by type
    atb_map: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0, "acted": 0})
    for farm in farms:
        for row in farm.get("alertTypeBreakdown", []):
            atb_map[row["alert_type"]]["count"] += row["count"]
            atb_map[row["alert_type"]]["acted"] += row.get("acted", 0)
    atb = []
    for t, v in atb_map.items():
        n = v["count"]
        acted = v["acted"]
        atb.append({
            "alert_type": t,
            "count": int(n),
            "acted": int(acted),
            "resolution_rate": round(acted / n * 100, 1) if n > 0 else 0.0,
        })

    # healthTrend: average by week
    ht_weeks: dict[str, list[float]] = defaultdict(list)
    for farm in farms:
        for row in farm.get("healthTrend", []):
            ht_weeks[row["week"]].append(row["avg_stress"])
    ht = [{"week": w, "avg_stress": round(mean(vs), 4)}
          for w, vs in sorted(ht_weeks.items())]

    # previouslyAtRisk: concatenate
    par = []
    for farm in farms:
        par.extend(farm.get("previouslyAtRisk", []))

    out = {
        "weeks":               weeks,
        "defaultWeek":         default_week,
        "weeklyStats":         ws_out,
        "plotRankings":        pr_out,
        "plotDetails":         pd_out,
        "responseOverTime":    rot,
        "alertTypeBreakdown":  atb,
        "healthTrend":         ht,
        "previouslyAtRisk":    par,
        "stressModel":         all_data["stressModel"],  # fleet-wide model
    }
    save("alert_triage.json", out)


# ── main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generating crop-strawberry aggregates…")
    agg_home()
    agg_sustainability()
    agg_seasonal()
    agg_alert_triage()
    print("Done. Files written to:", OUT)

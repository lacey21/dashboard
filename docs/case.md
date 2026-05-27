# GreenLeaf CEA — Case & Problem Overview

> See `greenleaf_datasets.md` for full data schema and variable definitions.

---

## Context

Food security is a growing national priority in Canada. Independent farmers struggle to accurately estimate and project their operating costs — which limits their financial planning, weakens their negotiating position with buyers, and makes it harder to access loans.

**RBC and BCCAI** want to explore whether **precision agriculture technology** (sensors, alerts, data-driven decisions) can close this gap — and whether that value can be demonstrated clearly enough to justify financing.

---

## The Company

**GreenLeaf CEA** is a hypothetical BC greenhouse operator:
- 8 farm locations across BC (Coastal, Interior, Fraser Valley)
- 20 greenhouse units growing tomatoes, peppers, cucumbers, and strawberries
- Sells to local grocers and restaurants

**The core problem:** Even with sensors installed, many decisions are still made on gut feel. Input costs swing week to week. Yield and quality are only known at season end. Managers don't know whether their spending is actually paying off.

---

## The Experiment

GreenLeaf runs a controlled experiment across **120 microplots**. Each plot is assigned exactly one of 7 treatments and tracked for a full growing season.

The goal: find out which treatments, interventions, and management styles actually improve plant health and profit — vs which ones just cost money.

For the full treatment definitions, see `greenleaf_datasets.md` → [PLOTS → Treatment Levels].

---

## The Precision Technology Angle

Beyond basic monitoring, GreenLeaf's system now:
- **Fires alerts** when sensors detect problems (e.g. high VPD, low moisture)
- **Recommends actions** in response to those alerts
- **Tracks whether actions were taken**, how fast, and whether stress improved afterward

This means the data captures not just *what conditions existed*, but *whether the team responded*, *how quickly*, and *whether it helped*. That's the core of what makes precision management different from routine management — and what the dashboard needs to make visible.

---

## Your Task

Build a dashboard that translates GreenLeaf's sensor, cost, and outcome data into clear, visual evidence that precision technology improves decision-making and financial performance.

**Audience:** BC farmers considering investing in precision agriculture, and lenders (like RBC) evaluating whether to finance it. Assume non-technical viewers — the value needs to be concrete and legible.

---

## The Three Dashboard Scenarios

### A — Weekly Alert Triage
> *"Where should I act first this morning?"*

**User:** Operations manager, Monday morning, limited crew.

**Show:**
- How many high-stress events occurred in a selected week
- How quickly the team has been responding to alerts
- How often alerts actually led to actions
- A ranked list of plots needing attention
- A drill-down timeline for any plot (stress, costs, action days)

**Why it matters:** Helps scarce labor get to the right plots first, where fast precision intervention is most likely to protect yield.

---

### B — Seasonal Precision Evaluation
> *"Is this system worth financing?"*

**User:** Farm owner preparing for an RBC loan meeting.

**Show:**
- How often plants were in high stress across the season
- How quickly and reliably the team responded to alerts
- How much was spent on precision vs routine actions
- Periods/plots where precision spending visibly reduced stress
- Periods/plots where costs were high but stress stayed high (inefficiency signal)

**Why it matters:** Gives the farmer an evidence-based story for the lender — precision tech manages risk, protects yield, and justifies investment.

---

### C — Open Scenario
> *"Design your own decision story"*

**User:** Defined by your team.

**Requirements:**
- Clearly state the question being answered
- Ground it in the provided data (stress, alerts, actions, costs, outcomes)
- Explain why this scenario matters to a farmer or lender

**Example directions:** crop or treatment comparisons, greenhouse performance ranking, identifying at-risk plots before a heatwave, ROI by climate zone.

---

## What "Good" Looks Like

A strong dashboard:
- Links **in-season signals** (alerts, stress, response time) to **end-of-season outcomes** (yield, profit, ROI)
- Shows the difference between **precision actions** and **routine actions** in terms of cost and result
- Is readable by someone who doesn't know what VPD means
- Makes a clear case that the data justifies the technology investment

---

## Key Analytical Concepts

| Concept | What to measure | Where |
|---|---|---|
| Alert responsiveness | % of alerts acted on; avg `action_delay_days` | `DAILY_SENSOR_READINGS` |
| Precision vs routine spending | `daily_precision_cost` vs `daily_routine_cost` | `DAILY_INPUT_COSTS` |
| Stress improvement after action | `post_action_stress_delta_3d` (negative = better) | `DAILY_SENSOR_READINGS` |
| End-of-season payoff | `season_profit_cad`, `season_roi`, `precision_benefit_cad` | `SEASON_SUMMARY` |
| Crop health trajectory | `plant_stress_index` over time, `leaf_color`, `blossom_count` | `DAILY_SENSOR_READINGS`, `SCOUTING_OBSERVATIONS` |
| Treatment effectiveness | Compare any metric grouped by `treatment` vs `Control` | `PLOTS` + any table |
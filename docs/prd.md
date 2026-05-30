# Product Requirements Document (PRD)

## Product Name

GreenLeaf Precision Agriculture Resource Efficiency Dashboard

## Project Context

GreenLeaf CEA operates multiple greenhouse farms across British Columbia and collects data on plant stress, alerts, precision actions, input costs, yield, and financial outcomes. The goal of this dashboard is to help farmers and lenders understand whether precision agriculture improves both financial performance and resource efficiency over the growing season.

This project is designed for Use Case C: Seasonal Evaluation and Resource Efficiency.

## Problem Statement

Farmers often invest in precision agriculture tools without a clear way to measure whether these tools are improving profitability, reducing resource waste, or lowering operational risk. At the same time, lenders such as RBC need evidence that farms are financially resilient and operationally efficient before supporting further investment.

GreenLeaf needs a dashboard that connects sensor data, management actions, costs, plant health, yield, and profitability into a clear decision-making tool.

## Product Goal

Build an interactive dashboard that helps users evaluate whether GreenLeaf’s precision agriculture system creates measurable value by improving profitability, reducing plant stress, and improving resource efficiency.

## Target Users

### Farmers and Farm Managers

Farmers need to understand:
- Which plots, treatments, or farms are performing best
- Where resources are being wasted
- Whether precision actions are reducing plant stress
- Which strategies should be repeated or adjusted next season

### Lenders and Financial Stakeholders

Lenders need to understand:
- Whether precision agriculture improves financial performance
- Whether the farm is operationally disciplined
- Whether the farm demonstrates responsible resource use
- Whether the farm is a lower-risk borrower due to stronger efficiency and resilience

## Key Questions

The dashboard should help answer:

1. Is precision agriculture improving profitability?
2. Are precision actions reducing plant stress?
3. Which farms, treatments, or plots are most resource-efficient?
4. Where are input costs high but outcomes weak?
5. Which operations should GreenLeaf replicate, adjust, or review?
6. Can GreenLeaf demonstrate ESG-aligned and lender-relevant performance metrics?

## Scope

### In Scope

- Interactive dashboard visualizations
- Farm, crop, treatment, and plot-level filtering
- Financial performance analysis
- Precision vs. routine comparison
- Plant stress and alert response analysis
- Resource efficiency and sustainability proxy metrics
- AI-generated plain-language insights using Ollama (local LLM)
- Data preprocessing using Python

### Out of Scope

- Direct carbon emissions calculations
- Real-time sensor integration
- Government subsidy matching
- Loan underwriting automation
- Full financial statement generation
- External market pricing automation beyond available case data

## Data Sources

The dashboard will use the provided GreenLeaf datasets, including:

- Farms
- Greenhouses
- Plots
- Daily sensor readings
- Daily input costs
- Input applications
- Scouting observations
- Market and input prices
- Season summary

## Core Metrics

### Financial Performance

- Total profit by plot, farm, or treatment
- Season ROI
- Precision benefit in CAD
- Total input cost
- Precision cost vs. routine cost
- Cost per unit of marketable yield

### Plant Health and Stress

- Average plant stress index
- Percentage of high-stress days
- Alert count
- Alert response rate
- Average action delay
- Post-action stress change over three days

### Resource Efficiency and Sustainability Proxies

Because the dataset does not include direct emissions data, the dashboard will use resource-efficiency proxies.

- Energy intensity: energy cost per kg of marketable yield
- Water efficiency: water cost per kg of marketable yield
- Chemical load: fertilizer and pesticide cost per square metre
- Crop waste rate: 1 - marketable ratio
- Input efficiency gain: reduction in input use per unit of output compared with routine plots

## Key Features

### 1. Sustainability Scorecard

A scorecard by farm, treatment, or plot showing:

- Energy intensity score
- Water efficiency score
- Chemical load score
- Crop waste rate
- Overall resource efficiency rating

The rating will use a simple green, yellow, and red classification to make the results easy to understand for non-technical users.

### 2. Profit vs. Resource Efficiency Quadrant

A quadrant chart comparing financial performance and resource efficiency.

- X-axis: resource efficiency
- Y-axis: season profit or ROI
- Each point: farm, treatment, or plot

The top-performing quadrant will highlight operations that are both profitable and resource-efficient.

### 3. Precision vs. Routine Comparison

A comparison panel showing the difference between precision-managed and routine/control plots.

Metrics may include:

- Total cost
- Yield per square metre
- Marketable ratio
- ROI
- Plant stress reduction
- Resource use per kg of marketable yield

### 4. Season-long Stress and Spending Timeline

A timeline showing plant stress overlaid with precision and routine spending.

This will help identify:

- Where precision spending was followed by stress reduction
- Where spending stayed high but stress did not improve
- Which periods had the strongest relationship between intervention and improvement

### 5. AI-Generated Insights

Using Ollama, the dashboard will generate plain-language summaries and recommendations based on selected filters.

Example insights:

- “BC Harvest 3 is the most resource-efficient tomato operation, using less energy per kg of marketable yield than the farm average.”
- “P0042 shows high chemical input intensity with limited stress reduction, making it a candidate for review next season.”

## User Stories

### Farmer User Stories

As a farmer, I want to see which plots are most profitable so that I can replicate successful strategies.

As a farmer, I want to know where plant stress remained high despite spending so that I can avoid inefficient actions.

As a farmer, I want to compare precision and routine management so that I can understand whether precision agriculture is worth continuing.

As a farmer, I want simple recommendations so that I can make faster decisions without interpreting every chart manually.

### Lender User Stories

As a lender, I want to see whether precision agriculture improves profitability so that I can evaluate the business case for financing.

As a lender, I want to see resource efficiency metrics so that I can understand whether the farm aligns with ESG goals.

As a lender, I want clear evidence of operational discipline so that I can assess borrower resilience and risk.

## Success Criteria

The dashboard will be successful if it:

- Clearly shows whether precision agriculture improves financial and operational outcomes
- Helps identify high-performing and underperforming farms, treatments, or plots
- Makes sustainability measurable using transparent resource-efficiency proxies
- Provides useful recommendations for farmers and lenders
- Communicates insights clearly to a non-technical audience
- Supports a concise 5-minute presentation

## Technical Requirements

### Tools

- Tableau or Tableau API for dashboard visualizations
- Python for data cleaning, joining, and metric calculations
- Ollama for AI-generated summaries and recommendations

### Data Processing Requirements

Python preprocessing should:

- Join plot, farm, greenhouse, daily sensor, input cost, and season summary data
- Calculate marketable yield
- Calculate resource-efficiency metrics
- Aggregate metrics by farm, crop, treatment, and plot
- Prepare dashboard-ready datasets for Tableau

### Dashboard Requirements

The dashboard should include:

- Interactive filters for farm, crop, treatment, and plot
- Summary KPI cards
- Scorecard table or cards
- Quadrant chart
- Timeline chart
- Precision vs. routine comparison visuals
- AI-generated insight panel

## Assumptions

- Precision actions can be compared against routine or control plots to estimate relative value.
- Energy, water, fertilizer, pesticide, marketable yield, and crop waste can be used as proxy indicators for sustainability.
- Direct emissions are not calculated because emissions factors are not included in the dataset.
- The dashboard is intended for decision support, not final financial or environmental reporting.

## Risks and Limitations

| Risk | Mitigation |
|---|---|
| Dataset does not include direct carbon emissions | Clearly frame sustainability metrics as resource-efficiency proxies |
| Precision and routine plots may differ in context | Use filters and normalized metrics for fairer comparison |
| AI recommendations may overstate conclusions | Keep recommendations grounded in dashboard metrics |
| Dashboard may become too complex | Prioritize 4–5 core visuals for the final demo |

## Final Deliverables

- Interactive Tableau dashboard
- Cleaned dataset or processed dashboard-ready files
- Slide deck for presentation
- Optional README explaining dashboard setup and methodology

## Presentation Narrative

The dashboard tells a simple decision story:

GreenLeaf’s precision agriculture system should not only be evaluated by profit, but also by how efficiently it uses resources and reduces operational risk. By connecting plant stress, alert response, input costs, yield, profitability, and sustainability proxies, the dashboard helps farmers decide what to repeat next season and helps lenders understand why precision agriculture can support stronger, more resilient farm operations.
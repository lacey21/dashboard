import pandas as pd
import json

def process_farm_data(input_csv, output_json):
    # Load raw data
    df = pd.read_csv(input_csv)
    
    # Calculate your custom metrics
    # Example: ROI = (Revenue - Cost) / Cost
    df['season_roi'] = (df['revenue'] - df['cost']) / df['cost']
    
    # Convert to JSON format optimized for a Dashboard
    # 'records' orientation creates an array of objects [{}, {}, {}]
    result = df.to_json(orient='records', indent=4)
    
    with open(output_json, 'w') as f:
        f.write(result)
    print(f"Success: Data processed into {output_json}")

# Run the process
process_farm_data('farm.csv', 'dashboard_data.json')
import pandas as pd
import numpy as np
import psycopg2
from sklearn.ensemble import RandomForestRegressor
import sys

# Database connection config
DB_CONFIG = {
    'host': 'postgres-data',
    'port': 5432,
    'dbname': 'mldata',
    'user': 'datauser',
    'password': 'datapass',
}

def get_db_conn():
    return psycopg2.connect(**DB_CONFIG)

def main():
    print("\n�� GDP Growth Predictor (World Bank Model)")
    print("==========================================")
    
    # 1. Train model on the fly using the latest data
    conn = get_db_conn()
    query = """
        SELECT country_code, record_year, gdp_growth_pct, 
               inflation_pct, unemployment_pct, trade_pct_gdp
        FROM features.macroeconomic_features
        ORDER BY country_code, record_year
    """
    df = pd.read_sql(query, conn)
    conn.close()
    
    # Preprocess
    df = df.sort_values(['country_code', 'record_year'])
    df['target_gdp_growth_next_yr'] = df.groupby('country_code')['gdp_growth_pct'].shift(-1)
    
    ml_df = df.dropna(subset=['target_gdp_growth_next_yr', 'gdp_growth_pct', 'inflation_pct'])
    feature_cols = ['gdp_growth_pct', 'inflation_pct', 'unemployment_pct', 'trade_pct_gdp']
    
    medians = ml_df[feature_cols].median()
    ml_df = ml_df.fillna(medians)
    
    X = ml_df[feature_cols]
    y = ml_df['target_gdp_growth_next_yr']
    
    # Train
    print("⏳ Training model on historical data (2000-2023)...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X, y)
    print("✅ Model trained successfully!\n")
    
    # 2. Get user input
    try:
        print("Enter current macroeconomic indicators to predict NEXT YEAR'S GDP Growth:")
        current_gdp_growth = float(input("1. Current GDP Growth (%) [e.g. 2.5]: "))
        inflation = float(input("2. Inflation Rate (%) [e.g. 3.2]: "))
        unemployment = float(input("3. Unemployment Rate (%) [e.g. 5.1]: "))
        trade = float(input("4. Trade (% of GDP) [e.g. 30.5]: "))
    except ValueError:
        print("❌ Invalid input. Please enter numbers only.")
        sys.exit(1)
        
    # 3. Predict
    input_data = pd.DataFrame([[current_gdp_growth, inflation, unemployment, trade]], columns=feature_cols)
    prediction = model.predict(input_data)[0]
    
    print("\n" + "="*40)
    print(f"🔮 PREDICTION FOR NEXT YEAR'S GDP GROWTH")
    print("="*40)
    print(f"Based on your inputs, the model predicts a GDP growth rate of: {prediction:.2f}%")
    print("="*40 + "\n")

if __name__ == "__main__":
    main()

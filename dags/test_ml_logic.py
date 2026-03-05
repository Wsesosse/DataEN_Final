import pandas as pd
import numpy as np
import psycopg2
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Database connection config (Internal Docker network)
DB_CONFIG = {
    'host': 'postgres-data',
    'port': 5432,
    'dbname': 'mldata',
    'user': 'datauser',
    'password': 'datapass',
}

def get_db_conn():
    return psycopg2.connect(**DB_CONFIG)

def test_ml_model():
    print("Connecting to database...")
    conn = get_db_conn()
    
    # 1. Load Data
    query = """
        SELECT country_code, record_year, gdp_current_usd, gdp_growth_pct, 
               inflation_pct, unemployment_pct, trade_pct_gdp
        FROM features.macroeconomic_features
        ORDER BY country_code, record_year
    """
    df = pd.read_sql(query, conn)
    conn.close()
    
    print(f"Loaded {len(df)} rows from features.macroeconomic_features")
    
    # 2. Data Preprocessing & Feature Engineering
    df = df.sort_values(['country_code', 'record_year'])
    
    # Shift(-1) moves tomorrow's value to today's row within each country group
    df['target_gdp_growth_next_yr'] = df.groupby('country_code')['gdp_growth_pct'].shift(-1)
    
    ml_df = df.dropna(subset=['target_gdp_growth_next_yr', 'gdp_growth_pct', 'inflation_pct'])
    ml_df = ml_df.fillna(ml_df.median(numeric_only=True))
    
    print(f"Usable rows for training: {len(ml_df)}")
    
    features = ['gdp_growth_pct', 'inflation_pct', 'unemployment_pct', 'trade_pct_gdp']
    X = ml_df[features]
    y = ml_df['target_gdp_growth_next_yr']
    
    # 3. Model Training
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Training on {len(X_train)} rows, Testing on {len(X_test)} rows...")
    
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    # 4. Evaluation
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n--- Model Evaluation ---")
    print(f"Mean Squared Error: {mse:.2f}")
    print(f"R2 Score: {r2:.2f}")
    
    importances = model.feature_importances_
    print("\n--- Feature Importance ---")
    for f, imp in zip(features, importances):
        print(f"{f}: {imp:.4f}")
        
    print("\n✅ ML Logic works!")

if __name__ == "__main__":
    test_ml_model()

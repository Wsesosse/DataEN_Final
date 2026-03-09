"""
DAG: ML GDP Growth Predictor
Trains a Random Forest Regressor to predict next year's GDP growth for each country
based on current macroeconomic indicators (GDP growth, Inflation, Unemployment, Trade).
Saves the predictions to the `predictions.model_outputs` table.
"""

from datetime import datetime, timedelta
import logging
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import execute_values

from airflow import DAG
from airflow.operators.python import PythonOperator

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

logger = logging.getLogger(__name__)

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

def prepare_and_train_model(**context):
    """
    Task 1: Load data, engineer features, train ML model, and save predictions.
    """
    conn = get_db_conn()
    
    # 1. Load Data
    logger.info("Loading feature data from database...")
    query = """
        SELECT country_code, record_year, gdp_current_usd, gdp_growth_pct, 
               inflation_pct, unemployment_pct, trade_pct_gdp
        FROM features.macroeconomic_features
        ORDER BY country_code, record_year
    """
    df = pd.read_sql(query, conn)
    
    if df.empty:
        raise ValueError("No feature data found in database. Run the world_bank_pipeline DAG first.")
        
    logger.info(f"Loaded {len(df)} feature rows.")
    
    # 2. Feature Engineering
    # Predict NEXT year's growth based on THIS year's indicators
    df = df.sort_values(['country_code', 'record_year'])
    df['target_gdp_growth_next_yr'] = df.groupby('country_code')['gdp_growth_pct'].shift(-1)
    
    # Identify the "current" year for each country to make new predictions on
    # (The rows where target is NaN because the next year hasn't happened yet)
    latest_year_mask = df['target_gdp_growth_next_yr'].isna() & df['gdp_growth_pct'].notna()
    prediction_df = df[latest_year_mask].copy()
    
    # Prepare training dataset
    ml_df = df.dropna(subset=['target_gdp_growth_next_yr', 'gdp_growth_pct', 'inflation_pct'])
    
    # Simple imputation for missing features
    feature_cols = ['gdp_growth_pct', 'inflation_pct', 'unemployment_pct', 'trade_pct_gdp']
    medians = ml_df[feature_cols].median()
    ml_df = ml_df.fillna(medians)
    prediction_df = prediction_df.fillna(medians)
    
    logger.info(f"Usable rows for training: {len(ml_df)}")
    logger.info(f"Countries to predict forward: {len(prediction_df)}")
    
    # 3. Model Training & Evaluation
    X = ml_df[feature_cols]
    y = ml_df['target_gdp_growth_next_yr']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    logger.info("--- Model Performance ---")
    logger.info(f"MSE: {mse:.2f}")
    logger.info(f"R2 Score: {r2:.2f}")
    
    importances = list(zip(feature_cols, model.feature_importances_))
    logger.info("--- Feature Importances ---")
    for f, imp in importances:
        logger.info(f"{f}: {imp:.4f}")
        
    # 4. Generate Future Predictions
    # Predict next year's growth using the latest available data
    X_future = prediction_df[feature_cols]
    future_predictions = model.predict(X_future)
    
    prediction_records = []
    
    for _, row, pred in zip(range(len(prediction_df)), prediction_df.itertuples(), future_predictions):
        # The year we are predicting FOR is record_year + 1
        predicted_year = int(row.record_year) + 1
        
        prediction_records.append((
            'RandomForest_WorldBank',  # model_name
            row.country_code,          # country_code
            predicted_year,            # prediction_year
            'gdp_growth_pct',          # target_name
            float(pred),               # predicted_value
            None,                      # actual_value (unknown yet)
            0.0                        # confidence (not calculated for basic RF here)
        ))
        
    # 5. Save to Database
    logger.info(f"Saving {len(prediction_records)} predictions to database...")
    cursor = conn.cursor()
    
    insert_query = """
        INSERT INTO predictions.model_outputs
            (model_name, country_code, prediction_year, target_name, predicted_value, actual_value, confidence)
        VALUES %s
        ON CONFLICT (model_name, country_code, prediction_year, target_name) 
        DO UPDATE SET 
            predicted_value = EXCLUDED.predicted_value,
            created_at = CURRENT_TIMESTAMP
    """
    
    execute_values(cursor, insert_query, prediction_records)
    conn.commit()
    
    cursor.close()
    conn.close()
    
    logger.info("Successfully generated and saved future GDP growth predictions!")
    
    # Pass stats to XCom for logging
    context['ti'].xcom_push(key='prediction_stats', value={
        'trained_rows': len(ml_df),
        'predictions_made': len(prediction_records),
        'r2': round(r2, 2)
    })

def log_completion(**context):
    stats = context['ti'].xcom_pull(task_ids='prepare_and_train_model', key='prediction_stats')
    logger.info("=" * 50)
    logger.info("ML GDP Prediction Pipeline Completed")
    logger.info("=" * 50)
    if stats:
        logger.info(f"Model R2 Score:     {stats['r2']}")
        logger.info(f"Rows trained on:    {stats['trained_rows']}")
        logger.info(f"Predictions saved:  {stats['predictions_made']}")
    logger.info("=" * 50)


# ─────────────────────────────────────────────
# DAG Definition
# ─────────────────────────────────────────────
default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    dag_id='gdp_growth_ml_predictor',
    default_args=default_args,
    description='Train ML model and predict next year GDP growth',
    schedule='@monthly',
    start_date=datetime(2026, 3, 1),
    catchup=False,
    tags=['ml', 'worldbank', 'prediction'],
) as dag:

    t1_train_predict = PythonOperator(
        task_id='prepare_and_train_model',
        python_callable=prepare_and_train_model,
    )

    t2_log = PythonOperator(
        task_id='log_completion',
        python_callable=log_completion,
    )

    t1_train_predict >> t2_log

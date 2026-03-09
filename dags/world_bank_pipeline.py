"""
DAG: World Bank Macroeconomic Pipeline
Fetches historical macroeconomic data (GDP, Inflation, etc.) from the World Bank API,
stores raw data in Postgres, and processes it into a wide feature table for ML.
"""

from datetime import datetime, timedelta
import logging
import requests
import pandas as pd

from airflow import DAG
from airflow.operators.python import PythonOperator
import psycopg2
from psycopg2.extras import execute_batch

logger = logging.getLogger(__name__)

# Database connection config (postgres-data)
DB_CONFIG = {
    'host': 'postgres-data',
    'port': 5432,
    'dbname': 'mldata',
    'user': 'datauser',
    'password': 'datapass',
}

# World Bank API
WB_API_BASE = "https://api.worldbank.org/v2/country/all/indicator"

# Indicators to fetch for ML
INDICATORS = {
    'NY.GDP.MKTP.CD': 'gdp_current_usd',
    'NY.GDP.MKTP.KD.ZG': 'gdp_growth_pct',
    'FP.CPI.TOTL.ZG': 'inflation_pct',
    'SL.UEM.TOTL.ZS': 'unemployment_pct',
    'NE.TRD.GNFS.ZS': 'trade_pct_gdp'
}

START_YEAR = 2000
END_YEAR = 2024 # 2025 and 2026 data is not available yet


def get_db_conn():
    return psycopg2.connect(**DB_CONFIG)


def fetch_world_bank_data(**context):
    """
    Task 1: Fetch indicators from World Bank API
    and insert into raw_data.world_bank_indicators.
    """
    conn = get_db_conn()
    cursor = conn.cursor()
    
    total_inserted = 0
    
    for indicator_code in INDICATORS.keys():
        logger.info(f"Fetching {indicator_code}...")
        
        # Determine total pages first
        url = f"{WB_API_BASE}/{indicator_code}?format=json&per_page=1000&date={START_YEAR}:{END_YEAR}"
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch metadata for {indicator_code}: {e}")
            continue
            
        if len(data) < 2:
            logger.warning(f"No data returned for {indicator_code}")
            continue
            
        metadata = data[0]
        total_pages = metadata.get('pages', 1)
        
        indicator_records = []
        
        # Fetch all pages
        for page in range(1, total_pages + 1):
            if page > 1:
                page_url = f"{url}&page={page}"
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        page_resp = requests.get(page_url, timeout=30)
                        page_resp.raise_for_status()
                        page_data = page_resp.json()
                        break
                    except Exception as e:
                        if attempt < max_retries - 1:
                            logger.warning(f"Attempt {attempt + 1} failed for {indicator_code} page {page}. Retrying in 2 seconds...")
                            import time
                            time.sleep(2)
                        else:
                            logger.error(f"Failed to fetch page {page} for {indicator_code} after {max_retries} attempts: {e}")
                            page_data = [] # empty to skip the next block
                            continue
                    
                if len(page_data) < 2:
                    continue
                records = page_data[1]
            else:
                records = data[1]
                
            for rec in records:
                if rec.get('value') is not None:  # Skip nulls
                    indicator_records.append((
                        indicator_code,
                        rec['indicator']['value'],
                        rec['countryiso3code'] or rec['country']['id'],
                        rec['country']['value'],
                        int(rec['date']),
                        float(rec['value'])
                    ))
        
        # Batch insert
        if indicator_records:
            insert_query = """
                INSERT INTO raw_data.world_bank_indicators
                    (indicator_code, indicator_name, country_code, country_name, record_year, record_value)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (indicator_code, country_code, record_year) 
                DO UPDATE SET 
                    record_value = EXCLUDED.record_value,
                    fetched_at = CURRENT_TIMESTAMP
            """
            execute_batch(cursor, insert_query, indicator_records)
            conn.commit()
            
            logger.info(f"Inserted {len(indicator_records)} records for {indicator_code}")
            total_inserted += len(indicator_records)

    cursor.close()
    conn.close()
    
    logger.info(f"Total raw records inserted/updated: {total_inserted}")
    context['ti'].xcom_push(key='raw_count', value=total_inserted)
    return total_inserted


def process_features(**context):
    """
    Task 2: Pivot raw data into a wide format (one column per indicator)
    suitable for ML algorithms, and store in features.macroeconomic_features.
    """
    conn = get_db_conn()
    
    # Read raw data into pandas
    query = """
        SELECT indicator_code, country_code, country_name, record_year, record_value
        FROM raw_data.world_bank_indicators
    """
    df = pd.read_sql(query, conn)
    
    if df.empty:
        logger.warning("No raw data found to process.")
        conn.close()
        return 0
        
    logger.info(f"Loaded {len(df)} raw records for processing")
    
    # Map indicator codes to descriptive column names
    df['indicator_mapped'] = df['indicator_code'].map(INDICATORS)
    
    # Pivot table to wide format: index=[country, year], columns=indicators
    # This transforms:
    # US, 2020, GDP, 20T
    # US, 2020, Inflation, 2%
    # into:
    # US, 2020, GDP=20T, Inflation=2%
    pivot_df = df.pivot_table(
        index=['country_code', 'country_name', 'record_year'],
        columns='indicator_mapped',
        values='record_value'
    ).reset_index()
    
    # Clean up column names (remove multi-index name)
    pivot_df.columns.name = None
    
    # Ensure all target columns exist, even if fully null
    for col in INDICATORS.values():
        if col not in pivot_df.columns:
            pivot_df[col] = None
            
    # Replace NaN with None for psycopg2 compatibility
    pivot_df = pivot_df.where(pd.notnull(pivot_df), None)
    
    logger.info(f"Pivoted into {len(pivot_df)} country-year feature rows")
    
    # Insert back to database
    cursor = conn.cursor()
    records = list(pivot_df.itertuples(index=False, name=None))
    
    # Build column list dynamically based on DataFrame
    cols = ", ".join(pivot_df.columns)
    placeholders = ", ".join(["%s"] * len(pivot_df.columns))
    
    # Build ON CONFLICT UPDATE clause for all data columns
    update_cols = [c for c in pivot_df.columns if c not in ('country_code', 'record_year')]
    update_sets = ", ".join([f"{c} = EXCLUDED.{c}" for c in update_cols])
    
    insert_query = f"""
        INSERT INTO features.macroeconomic_features ({cols})
        VALUES ({placeholders})
        ON CONFLICT (country_code, record_year) 
        DO UPDATE SET {update_sets}, created_at = CURRENT_TIMESTAMP
    """
    
    execute_batch(cursor, insert_query, records)
    conn.commit()
    
    cursor.close()
    conn.close()
    
    logger.info(f"Successfully loaded {len(pivot_df)} rows into features.macroeconomic_features")
    context['ti'].xcom_push(key='feature_count', value=len(pivot_df))
    return len(pivot_df)


def log_pipeline_stats(**context):
    """Task 3: Log final pipeline statistics."""
    ti = context['ti']
    raw_count = ti.xcom_pull(task_ids='fetch_world_bank_data', key='raw_count') or 0
    feature_count = ti.xcom_pull(task_ids='process_features', key='feature_count') or 0

    conn = get_db_conn()
    cursor = conn.cursor()

    stats = {}
    for table in ['raw_data.world_bank_indicators', 'features.macroeconomic_features']:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        stats[table] = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    logger.info("=" * 50)
    logger.info("World Bank Pipeline Summary")
    logger.info("=" * 50)
    logger.info(f"Raw records fetched:   {raw_count}")
    logger.info(f"ML Feature rows built: {feature_count}")
    logger.info("-" * 50)
    logger.info("Total rows in database:")
    for table, count in stats.items():
        logger.info(f"  {table}: {count}")
    logger.info("=" * 50)


# ─────────────────────────────────────────────
# DAG Definition
# ─────────────────────────────────────────────
default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    dag_id='world_bank_macro_pipeline',
    default_args=default_args,
    description='Fetch World Bank indicators → Process into ML feature table',
    schedule='@weekly',
    start_date=datetime(2026, 3, 1),
    catchup=False,
    tags=['data', 'worldbank', 'ml'],
) as dag:

    t1_fetch = PythonOperator(
        task_id='fetch_world_bank_data',
        python_callable=fetch_world_bank_data,
    )

    t2_process = PythonOperator(
        task_id='process_features',
        python_callable=process_features,
    )

    t3_stats = PythonOperator(
        task_id='log_pipeline_stats',
        python_callable=log_pipeline_stats,
    )

    t1_fetch >> t2_process >> t3_stats

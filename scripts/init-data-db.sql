-- =============================================
-- Init script for ML Data Database (World Bank Edition)
-- This runs automatically on first container start
-- =============================================

-- Schema for raw data from APIs
CREATE SCHEMA IF NOT EXISTS raw_data;

-- Schema for processed/feature-engineered data
CREATE SCHEMA IF NOT EXISTS features;

-- Schema for ML model outputs
CREATE SCHEMA IF NOT EXISTS predictions;

-- =============================================
-- RAW DATA: World Bank Indicators
-- =============================================
CREATE TABLE IF NOT EXISTS raw_data.world_bank_indicators (
    id SERIAL PRIMARY KEY,
    indicator_code VARCHAR(50) NOT NULL,
    indicator_name VARCHAR(255),
    country_code VARCHAR(10) NOT NULL,
    country_name VARCHAR(255),
    record_year INTEGER NOT NULL,
    record_value DOUBLE PRECISION,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(indicator_code, country_code, record_year)
);

-- =============================================
-- FEATURES: Processed data for ML
-- =============================================
-- Wide table format with one row per country-year and indicators as columns
CREATE TABLE IF NOT EXISTS features.macroeconomic_features (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(10) NOT NULL,
    country_name VARCHAR(255),
    record_year INTEGER NOT NULL,
    gdp_current_usd DOUBLE PRECISION,      -- NY.GDP.MKTP.CD
    gdp_growth_pct DOUBLE PRECISION,       -- NY.GDP.MKTP.KD.ZG
    inflation_pct DOUBLE PRECISION,        -- FP.CPI.TOTL.ZG
    unemployment_pct DOUBLE PRECISION,     -- SL.UEM.TOTL.ZS
    trade_pct_gdp DOUBLE PRECISION,        -- NE.TRD.GNFS.ZS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_code, record_year)
);

-- =============================================
-- PREDICTIONS: ML model outputs
-- =============================================
CREATE TABLE IF NOT EXISTS predictions.model_outputs (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    country_code VARCHAR(10) NOT NULL,
    prediction_year INTEGER NOT NULL,
    target_name VARCHAR(200),
    predicted_value DOUBLE PRECISION,
    actual_value DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_name, country_code, prediction_year, target_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wb_indicator_code ON raw_data.world_bank_indicators(indicator_code);
CREATE INDEX IF NOT EXISTS idx_wb_country_code ON raw_data.world_bank_indicators(country_code);
CREATE INDEX IF NOT EXISTS idx_wb_record_year ON raw_data.world_bank_indicators(record_year);
CREATE INDEX IF NOT EXISTS idx_macro_features_country ON features.macroeconomic_features(country_code);
CREATE INDEX IF NOT EXISTS idx_macro_features_year ON features.macroeconomic_features(record_year);

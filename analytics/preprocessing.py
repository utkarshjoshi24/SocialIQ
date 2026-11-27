"""
SocialIQ Analytics & Preprocessing Module
Handles data ingestion, validation, cleaning, and feature engineering.
"""

import pandas as pd
import numpy as np

REQUIRED_COLUMNS = [
    'post_id',
    'date',
    'platform',
    'content_type',
    'category',
    'caption_length',
    'hashtags_count',
    'duration_seconds',
    'posting_hour',
    'views',
    'likes',
    'comments',
    'shares',
    'saves',
    'reach',
]

def validate_schema(df: pd.DataFrame) -> tuple[bool, list[str]]:
    """
    Validate that dataframe conforms to SocialIQ required columns.
    Returns (is_valid, missing_columns).
    """
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    return (len(missing) == 0, missing)

def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans raw dataset, drops invalid duplicates, and fills null values.
    """
    df = df.copy()
    
    # Drop rows with null post_id or date
    df = df.dropna(subset=['post_id', 'date'])
    df = df.drop_duplicates(subset=['post_id'])
    
    # Numeric columns to sanitize
    numeric_cols = [
        'caption_length', 'hashtags_count', 'duration_seconds',
        'posting_hour', 'views', 'likes', 'comments', 'shares', 'saves', 'reach'
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    # String normalization
    for col in ['platform', 'content_type', 'category']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            
    return df

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derives engagement metrics and date-derived attributes.
    """
    df = df.copy()
    
    # Engagement Total
    df['engagement_total'] = df['likes'] + df['comments'] + df['shares'] + df['saves']
    
    # Engagement Rate (% based on reach, fallback to views)
    base_reach = np.where(df['reach'] > 0, df['reach'], df['views'])
    df['engagement_rate'] = np.where(
        base_reach > 0,
        np.round((df['engagement_total'] / base_reach) * 100, 2),
        0.0
    )
    
    # Date parsing & day of week
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df['day_of_week'] = df['date'].dt.day_name()
    
    return df

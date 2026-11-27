"""
SocialIQ Analytics & Preprocessing Module
Handles data ingestion, validation, cleaning, and feature engineering.
"""

from typing import Union, List, Dict, Tuple
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

def load_data(source: Union[str, List[Dict], pd.DataFrame]) -> pd.DataFrame:
    """
    Loads data from a file path (CSV), list of dictionaries (JSON/MongoDB),
    or an existing DataFrame into a normalized pandas DataFrame.
    """
    if isinstance(source, pd.DataFrame):
        df = source.copy()
    elif isinstance(source, list):
        if len(source) == 0:
            return pd.DataFrame(columns=REQUIRED_COLUMNS + ['engagement_total', 'engagement_rate', 'day_of_week'])
        df = pd.DataFrame(source)
    elif isinstance(source, str):
        df = pd.read_csv(source)
    else:
        raise ValueError(f"Unsupported data source type: {type(source)}")

    # Normalize column names: lowercase, strip, replace hyphens/spaces with underscores
    df.columns = [str(c).lower().strip().replace('-', '_').replace(' ', '_') for c in df.columns]

    # Handle camelCase mappings from MongoDB if present
    rename_map = {
        'postid': 'post_id',
        'contenttype': 'content_type',
        'captionlength': 'caption_length',
        'hashtagscount': 'hashtags_count',
        'durationseconds': 'duration_seconds',
        'postinghour': 'posting_hour',
        'engagementrate': 'engagement_rate',
        'published_at': 'date',
        'createdat': 'date'
    }
    for old_col, new_col in rename_map.items():
        if old_col in df.columns and new_col not in df.columns:
            df.rename(columns={old_col: new_col}, inplace=True)

    return df

def validate_schema(df: pd.DataFrame) -> Tuple[bool, List[str]]:
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
    if df.empty:
        return df

    df = df.copy()

    # Drop rows without post_id or date if present
    if 'post_id' in df.columns:
        df = df.dropna(subset=['post_id'])
        df = df.drop_duplicates(subset=['post_id'])

    # Numeric columns to sanitize
    numeric_cols = [
        'caption_length', 'hashtags_count', 'duration_seconds',
        'posting_hour', 'views', 'likes', 'comments', 'shares', 'saves', 'reach'
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).clip(lower=0).astype(int)
        else:
            df[col] = 0

    # Ensure posting_hour is clamped between 0 and 23
    df['posting_hour'] = df['posting_hour'].clip(lower=0, upper=23)

    # String normalization
    for col in ['platform', 'content_type', 'category']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
        else:
            df[col] = 'Unknown'

    return df

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derives engagement metrics and date-derived attributes.
    """
    if df.empty:
        return df

    df = df.copy()

    # Calculate Engagement Total = likes + comments + shares + saves
    df['engagement_total'] = df['likes'] + df['comments'] + df['shares'] + df['saves']

    # Calculate Engagement Rate = (engagement_total / reach) * 100 when reach > 0
    reach_series = pd.to_numeric(df['reach'], errors='coerce').fillna(0)
    df['engagement_rate'] = np.where(
        reach_series > 0,
        np.round((df['engagement_total'] / reach_series) * 100, 2),
        0.0
    )

    # Date parsing & day of week
    if 'date' in df.columns:
        parsed_dates = pd.to_datetime(df['date'], errors='coerce')
        # If any dates failed to parse, fill with today
        now = pd.Timestamp.now()
        parsed_dates = parsed_dates.fillna(now)
        df['date'] = parsed_dates
        df['day_of_week'] = parsed_dates.dt.day_name()
    else:
        df['day_of_week'] = 'Monday'

    return df

def prepare_dataset(source: Union[str, List[Dict], pd.DataFrame]) -> pd.DataFrame:
    """
    Full pipeline: load -> clean -> engineer features.
    """
    df = load_data(source)
    df = clean_dataset(df)
    df = engineer_features(df)
    return df

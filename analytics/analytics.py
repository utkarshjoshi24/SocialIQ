"""
SocialIQ Analytics Engine
Implements clean, reusable, deterministic social media analytics functions using Pandas and NumPy.
All functions return clean, JSON-serializable Python data structures ready for React consumption.
"""

from typing import Union, List, Dict, Any
import math
import pandas as pd
import numpy as np
from preprocessing import prepare_dataset

DAYS_ORDERED = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

def sanitize_value(val: Any) -> Any:
    """
    Ensures numbers are standard Python floats/ints without NaN or infinite values.
    """
    if val is None:
        return 0
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val):
            return 0.0
        return round(float(val), 2)
    if isinstance(val, (int, np.integer)):
        return int(val)
    return val

# -------------------------------------------------------------------------
# 1. Overview KPIs
# -------------------------------------------------------------------------
def calculate_overview_kpis(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculates primary summary KPIs across the entire post dataset:
    - Total Posts
    - Total Views
    - Total Likes
    - Total Comments
    - Total Shares
    - Total Saves
    - Total Reach
    - Average Views
    - Average Engagement Rate
    """
    if df.empty:
        return {
            'total_posts': 0,
            'total_views': 0,
            'total_likes': 0,
            'total_comments': 0,
            'total_shares': 0,
            'total_saves': 0,
            'total_reach': 0,
            'average_views': 0.0,
            'average_engagement_rate': 0.0,
        }

    total_posts = int(len(df))
    total_views = int(df['views'].sum())
    total_likes = int(df['likes'].sum())
    total_comments = int(df['comments'].sum())
    total_shares = int(df['shares'].sum())
    total_saves = int(df['saves'].sum())
    total_reach = int(df['reach'].sum())

    average_views = round(float(df['views'].mean()), 2)
    average_engagement_rate = round(float(df['engagement_rate'].mean()), 2)

    return {
        'total_posts': total_posts,
        'total_views': total_views,
        'total_likes': total_likes,
        'total_comments': total_comments,
        'total_shares': total_shares,
        'total_saves': total_saves,
        'total_reach': total_reach,
        'average_views': sanitize_value(average_views),
        'average_engagement_rate': sanitize_value(average_engagement_rate),
    }

# -------------------------------------------------------------------------
# 2. Descriptive Statistics
# -------------------------------------------------------------------------
def calculate_descriptive_statistics(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Calculates descriptive distribution statistics for:
    Views, Likes, Comments, Shares, Saves, Reach, Engagement Rate.
    Returns: Mean, Median, Standard Deviation, Minimum, Maximum.
    """
    metrics = [
        ('Views', 'views'),
        ('Likes', 'likes'),
        ('Comments', 'comments'),
        ('Shares', 'shares'),
        ('Saves', 'saves'),
        ('Reach', 'reach'),
        ('Engagement Rate', 'engagement_rate'),
    ]

    results = []
    if df.empty:
        for display_name, col in metrics:
            results.append({
                'metric': display_name,
                'mean': 0.0,
                'median': 0.0,
                'std_dev': 0.0,
                'min': 0.0,
                'max': 0.0,
            })
        return results

    for display_name, col in metrics:
        if col in df.columns:
            series = pd.to_numeric(df[col], errors='coerce').fillna(0)
            results.append({
                'metric': display_name,
                'mean': sanitize_value(round(float(series.mean()), 2)),
                'median': sanitize_value(round(float(series.median()), 2)),
                'std_dev': sanitize_value(round(float(series.std()), 2)) if len(series) > 1 else 0.0,
                'min': sanitize_value(round(float(series.min()), 2)),
                'max': sanitize_value(round(float(series.max()), 2)),
            })

    return results

# -------------------------------------------------------------------------
# 3. Content-Type Analysis
# -------------------------------------------------------------------------
def calculate_content_type_analysis(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Groups by content_type (Reel, Carousel, Video, Image, Text).
    Calculates: post count, average views, average reach, average engagement, average engagement rate.
    """
    if df.empty or 'content_type' not in df.columns:
        return []

    grouped = df.groupby('content_type').agg(
        post_count=('post_id', 'count'),
        average_views=('views', 'mean'),
        average_reach=('reach', 'mean'),
        average_engagement=('engagement_total', 'mean'),
        average_engagement_rate=('engagement_rate', 'mean')
    ).reset_index()

    # Sort descending by average views
    grouped = grouped.sort_values(by='average_views', ascending=False)

    results = []
    for _, row in grouped.iterrows():
        results.append({
            'content_type': str(row['content_type']),
            'post_count': int(row['post_count']),
            'average_views': sanitize_value(round(float(row['average_views']), 2)),
            'average_reach': sanitize_value(round(float(row['average_reach']), 2)),
            'average_engagement': sanitize_value(round(float(row['average_engagement']), 2)),
            'average_engagement_rate': sanitize_value(round(float(row['average_engagement_rate']), 2)),
        })
    return results

# -------------------------------------------------------------------------
# 4. Category Analysis
# -------------------------------------------------------------------------
def calculate_category_analysis(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Groups by category (Travel, Tech, Education, etc.).
    Calculates: post count, average views, average reach, average engagement, average engagement rate.
    """
    if df.empty or 'category' not in df.columns:
        return []

    grouped = df.groupby('category').agg(
        post_count=('post_id', 'count'),
        average_views=('views', 'mean'),
        average_reach=('reach', 'mean'),
        average_engagement=('engagement_total', 'mean'),
        average_engagement_rate=('engagement_rate', 'mean')
    ).reset_index()

    grouped = grouped.sort_values(by='average_views', ascending=False)

    results = []
    for _, row in grouped.iterrows():
        results.append({
            'category': str(row['category']),
            'post_count': int(row['post_count']),
            'average_views': sanitize_value(round(float(row['average_views']), 2)),
            'average_reach': sanitize_value(round(float(row['average_reach']), 2)),
            'average_engagement': sanitize_value(round(float(row['average_engagement']), 2)),
            'average_engagement_rate': sanitize_value(round(float(row['average_engagement_rate']), 2)),
        })
    return results

# -------------------------------------------------------------------------
# 5. Platform Analysis
# -------------------------------------------------------------------------
def calculate_platform_analysis(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Groups by platform (Instagram, YouTube, LinkedIn, etc.).
    Calculates: post count, average views, average reach, average engagement, average engagement rate.
    """
    if df.empty or 'platform' not in df.columns:
        return []

    grouped = df.groupby('platform').agg(
        post_count=('post_id', 'count'),
        average_views=('views', 'mean'),
        average_reach=('reach', 'mean'),
        average_engagement=('engagement_total', 'mean'),
        average_engagement_rate=('engagement_rate', 'mean')
    ).reset_index()

    grouped = grouped.sort_values(by='post_count', ascending=False)

    results = []
    for _, row in grouped.iterrows():
        results.append({
            'platform': str(row['platform']),
            'post_count': int(row['post_count']),
            'average_views': sanitize_value(round(float(row['average_views']), 2)),
            'average_reach': sanitize_value(round(float(row['average_reach']), 2)),
            'average_engagement': sanitize_value(round(float(row['average_engagement']), 2)),
            'average_engagement_rate': sanitize_value(round(float(row['average_engagement_rate']), 2)),
        })
    return results

# -------------------------------------------------------------------------
# 6. Day-of-Week Analysis
# -------------------------------------------------------------------------
def calculate_day_of_week_analysis(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Groups by day of week (Monday through Sunday).
    Calculates: post count, average views, average engagement, average engagement rate.
    """
    if df.empty or 'day_of_week' not in df.columns:
        return []

    grouped = df.groupby('day_of_week').agg(
        post_count=('post_id', 'count'),
        average_views=('views', 'mean'),
        average_engagement=('engagement_total', 'mean'),
        average_engagement_rate=('engagement_rate', 'mean')
    ).to_dict(orient='index')

    results = []
    for day in DAYS_ORDERED:
        stats = grouped.get(day, {
            'post_count': 0,
            'average_views': 0.0,
            'average_engagement': 0.0,
            'average_engagement_rate': 0.0
        })
        results.append({
            'day': day,
            'day_short': day[:3],
            'post_count': int(stats['post_count']),
            'average_views': sanitize_value(round(float(stats['average_views']), 2)),
            'average_engagement': sanitize_value(round(float(stats['average_engagement']), 2)),
            'average_engagement_rate': sanitize_value(round(float(stats['average_engagement_rate']), 2)),
        })
    return results

# -------------------------------------------------------------------------
# 7. Posting-Hour Analysis & Heatmap
# -------------------------------------------------------------------------
def calculate_posting_hour_analysis(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Groups by posting hour (0 to 23).
    Calculates: post count, average views, average engagement, average engagement rate.
    """
    if df.empty or 'posting_hour' not in df.columns:
        return []

    grouped = df.groupby('posting_hour').agg(
        post_count=('post_id', 'count'),
        average_views=('views', 'mean'),
        average_engagement=('engagement_total', 'mean'),
        average_engagement_rate=('engagement_rate', 'mean')
    ).to_dict(orient='index')

    results = []
    for hour in range(24):
        stats = grouped.get(hour, {
            'post_count': 0,
            'average_views': 0.0,
            'average_engagement': 0.0,
            'average_engagement_rate': 0.0
        })
        ampm = 'AM' if hour < 12 else 'PM'
        display_h = 12 if hour in (0, 12) else (hour % 12)
        results.append({
            'hour': hour,
            'hour_label': f"{display_h} {ampm}",
            'post_count': int(stats['post_count']),
            'average_views': sanitize_value(round(float(stats['average_views']), 2)),
            'average_engagement': sanitize_value(round(float(stats['average_engagement']), 2)),
            'average_engagement_rate': sanitize_value(round(float(stats['average_engagement_rate']), 2)),
        })
    return results

def calculate_time_heatmap(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generates Day × Hour matrix (7 days × 24 hours) of average engagement rate.
    Returns clean JSON object suitable for the Stitch heatmap component.
    """
    if df.empty or 'day_of_week' not in df.columns or 'posting_hour' not in df.columns:
        return {'days': DAYS_ORDERED, 'hours': list(range(24)), 'matrix': []}

    pivot = df.pivot_table(
        index='day_of_week',
        columns='posting_hour',
        values='engagement_rate',
        aggfunc='mean',
        fill_value=0.0
    )

    matrix = []
    for day in DAYS_ORDERED:
        row = []
        for hour in range(24):
            val = 0.0
            if day in pivot.index and hour in pivot.columns:
                val = sanitize_value(round(float(pivot.loc[day, hour]), 2))
            row.append(val)
        matrix.append({
            'day': day,
            'day_short': day[:3],
            'hourly_rates': row
        })

    return {
        'days': DAYS_ORDERED,
        'hours': list(range(24)),
        'matrix': matrix
    }

# -------------------------------------------------------------------------
# 8. Correlation Analysis
# -------------------------------------------------------------------------
def calculate_correlation_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculates Pearson correlation matrix between:
    views, likes, comments, shares, saves, reach, engagement_rate.
    Returns:
    - columns list
    - matrix table rows (for table rendering)
    - key-value dictionary
    """
    target_cols = ['views', 'likes', 'comments', 'shares', 'saves', 'reach', 'engagement_rate']
    valid_cols = [c for c in target_cols if c in df.columns]

    if len(df) < 2 or len(valid_cols) < 2:
        return {'metrics': target_cols, 'table': [], 'dict': {}}

    corr_df = df[valid_cols].corr(method='pearson').fillna(0.0)

    # Format table for UI
    table_rows = []
    matrix_dict = {}

    for col in valid_cols:
        row_dict = {'metric': col}
        matrix_dict[col] = {}
        for other_col in valid_cols:
            val = sanitize_value(round(float(corr_df.loc[col, other_col]), 2))
            row_dict[other_col] = val
            matrix_dict[col][other_col] = val
        table_rows.append(row_dict)

    return {
        'metrics': valid_cols,
        'table': table_rows,
        'dict': matrix_dict
    }

# -------------------------------------------------------------------------
# 9. Top-Performing Posts
# -------------------------------------------------------------------------
def get_top_performing_posts(df: pd.DataFrame, limit: int = 5, sort_by: str = 'views') -> List[Dict[str, Any]]:
    """
    Returns top N posts ranked by 'views' or 'engagement_rate'.
    Includes performance score and tier for each.
    """
    if df.empty:
        return []

    sort_col = sort_by if sort_by in df.columns else 'views'
    sorted_df = df.sort_values(by=sort_col, ascending=False).head(limit)

    results = []
    for _, row in sorted_df.iterrows():
        score_info = calculate_performance_score(row, df)
        results.append({
            'post_id': str(row.get('post_id', '')),
            'platform': str(row.get('platform', '')),
            'content_type': str(row.get('content_type', '')),
            'category': str(row.get('category', '')),
            'date': str(row.get('date', ''))[:10],
            'views': int(row.get('views', 0)),
            'likes': int(row.get('likes', 0)),
            'comments': int(row.get('comments', 0)),
            'shares': int(row.get('shares', 0)),
            'saves': int(row.get('saves', 0)),
            'reach': int(row.get('reach', 0)),
            'engagement_rate': sanitize_value(round(float(row.get('engagement_rate', 0.0)), 2)),
            'performance_score': score_info['score'],
            'tier': score_info['tier'],
        })
    return results

# -------------------------------------------------------------------------
# 10. Performance Score (Transparent 0-100 Calculation)
# -------------------------------------------------------------------------
def calculate_performance_score(post_row: Union[pd.Series, Dict[str, Any]], benchmark_df: pd.DataFrame = None) -> Dict[str, Any]:
    """
    Calculates a simple, transparent SocialIQ Performance Score (0–100) based on 3 pillars:
    
    1. Engagement Rate Score (40% weight):
       Measures audience responsiveness relative to a 10% benchmark:
       ER_Score = min(40, (engagement_rate / 10.0) * 40)

    2. Distribution Scale Score (35% weight):
       Measures reach scale against median reach:
       median_reach = max(median_reach, 1000)
       Reach_Score = min(35, (reach / median_reach) * 17.5)

    3. High-Intent Interaction Score (25% weight):
       Saves and shares indicate high retention / utility value:
       intent_ratio = (saves + shares) / max(engagement_total, 1)
       Intent_Score = min(25, (intent_ratio / 0.25) * 25)

    Total Score = round(ER_Score + Reach_Score + Intent_Score), bounded in [0, 100].
    
    Tiers:
    - High: Score >= 70
    - Medium: Score 40 to 69
    - Low: Score < 40
    """
    er = float(post_row.get('engagement_rate', 0.0))
    reach = float(post_row.get('reach', 0.0))
    saves = float(post_row.get('saves', 0.0))
    shares = float(post_row.get('shares', 0.0))
    likes = float(post_row.get('likes', 0.0))
    comments = float(post_row.get('comments', 0.0))
    engagement_total = float(post_row.get('engagement_total', likes + comments + shares + saves))

    # Benchmark reach reference
    if benchmark_df is not None and not benchmark_df.empty and 'reach' in benchmark_df.columns:
        median_reach = max(float(benchmark_df['reach'].median()), 1000.0)
    else:
        median_reach = 50000.0

    # 1. Engagement Rate component (max 40 pts)
    er_score = min(40.0, (er / 10.0) * 40.0) if er > 0 else 0.0

    # 2. Reach scale component (max 35 pts)
    reach_score = min(35.0, (reach / median_reach) * 17.5) if reach > 0 else 0.0

    # 3. High-intent saves & shares component (max 25 pts)
    intent_ratio = (saves + shares) / max(engagement_total, 1.0)
    intent_score = min(25.0, (intent_ratio / 0.25) * 25.0)

    total_score = int(round(er_score + reach_score + intent_score))
    total_score = max(0, min(100, total_score))

    if total_score >= 70:
        tier = 'High'
    elif total_score >= 40:
        tier = 'Medium'
    else:
        tier = 'Low'

    return {
        'score': total_score,
        'tier': tier,
        'breakdown': {
            'er_score': sanitize_value(round(er_score, 1)),
            'reach_score': sanitize_value(round(reach_score, 1)),
            'intent_score': sanitize_value(round(intent_score, 1)),
        },
        'formula': 'Score = min(40, ER/10*40) + min(35, Reach/MedianReach*17.5) + min(25, IntentRatio/0.25*25)'
    }

# -------------------------------------------------------------------------
# Master Analytics Pipeline Runner
# -------------------------------------------------------------------------
def run_analytics(source: Union[str, List[Dict], pd.DataFrame]) -> Dict[str, Any]:
    """
    Executes the full social media analytics suite.
    Accepts CSV path, MongoDB list of records, or existing DataFrame.
    Returns clean JSON-serializable Python dictionary for frontend consumption.
    """
    df = prepare_dataset(source)

    overview_kpis = calculate_overview_kpis(df)
    descriptive_stats = calculate_descriptive_statistics(df)
    content_analysis = calculate_content_type_analysis(df)
    category_analysis = calculate_category_analysis(df)
    platform_analysis = calculate_platform_analysis(df)
    day_analysis = calculate_day_of_week_analysis(df)
    hour_analysis = calculate_posting_hour_analysis(df)
    heatmap_matrix = calculate_time_heatmap(df)
    correlation_analysis = calculate_correlation_analysis(df)
    top_posts = get_top_performing_posts(df, limit=5, sort_by='views')

    # Calculate score distribution across posts
    scores = [calculate_performance_score(row, df)['score'] for _, row in df.iterrows()] if not df.empty else []
    score_distribution = {
        'average_score': sanitize_value(round(float(np.mean(scores)), 1)) if scores else 0.0,
        'high_tier_count': sum(1 for s in scores if s >= 70),
        'medium_tier_count': sum(1 for s in scores if 40 <= s < 70),
        'low_tier_count': sum(1 for s in scores if s < 40),
    }

    return {
        'overview_kpis': overview_kpis,
        'descriptive_stats': descriptive_stats,
        'content_analysis': content_analysis,
        'category_analysis': category_analysis,
        'platform_analysis': platform_analysis,
        'day_analysis': day_analysis,
        'hour_analysis': hour_analysis,
        'heatmap_matrix': heatmap_matrix,
        'correlation_analysis': correlation_analysis,
        'top_posts': top_posts,
        'score_distribution': score_distribution,
    }

if __name__ == '__main__':
    print("[SocialIQ Analytics Engine] Module ready for import.")

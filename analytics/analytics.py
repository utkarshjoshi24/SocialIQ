"""
SocialIQ Analytics Engine
Computes descriptive statistics, time/day heatmaps, and correlation matrices.
"""

import pandas as pd
import numpy as np

def compute_descriptive_statistics(df: pd.DataFrame) -> list[dict]:
    """
    Computes Mean, Median, Standard Deviation, Min, and Max for key metrics.
    """
    metrics = ['views', 'likes', 'comments', 'shares', 'saves', 'reach', 'engagement_rate']
    summary = []
    
    for metric in metrics:
        if metric in df.columns:
            series = df[metric]
            summary.append({
                'metric': metric,
                'mean': round(float(series.mean()), 2),
                'median': round(float(series.median()), 2),
                'std_dev': round(float(series.std()), 2) if len(series) > 1 else 0.0,
                'min': round(float(series.min()), 2),
                'max': round(float(series.max()), 2),
            })
            
    return summary

def compute_format_analysis(df: pd.DataFrame) -> list[dict]:
    """
    Computes average views and engagement by content format (Reel, Carousel, Video, Image).
    """
    if 'content_type' not in df.columns:
        return []
        
    grouped = df.groupby('content_type').agg(
        avg_views=('views', 'mean'),
        avg_engagement=('engagement_rate', 'mean'),
        post_count=('post_id', 'count')
    ).reset_index()
    
    return grouped.to_dict(orient='records')

def compute_time_heatmap(df: pd.DataFrame) -> list[dict]:
    """
    Computes average engagement score across Day of Week × Hour block.
    """
    if 'day_of_week' not in df.columns or 'posting_hour' not in df.columns:
        return []
        
    pivot = df.pivot_table(
        index='day_of_week',
        columns='posting_hour',
        values='engagement_rate',
        aggfunc='mean',
        fill_value=0
    )
    
    return pivot.reset_index().to_dict(orient='records')

def compute_correlation_matrix(df: pd.DataFrame) -> dict:
    """
    Calculates Pearson correlation matrix across engagement signals.
    """
    cols = ['views', 'likes', 'comments', 'shares', 'saves', 'reach', 'engagement_rate']
    valid_cols = [c for c in cols if c in df.columns]
    
    if len(valid_cols) < 2:
        return {}
        
    corr = df[valid_cols].corr(method='pearson').round(2)
    return corr.to_dict()

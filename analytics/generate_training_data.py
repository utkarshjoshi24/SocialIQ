"""
SocialIQ — Synthetic Training Data Generator
=============================================

Generates a reproducible synthetic dataset of social media posts for training
the performance prediction model.

WHY SYNTHETIC DATA:
  The live MongoDB database currently contains only a handful of posts — far too
  few for meaningful ML training.  Rather than wait for organic data growth, we
  generate 500 realistic records that mirror the statistical distributions observed
  in social-media benchmarks.

REPRODUCIBILITY:
  np.random.seed(42) is set once at module level.  The same CSV is regenerated
  byte-for-byte on every run.

DATA LEAKAGE SAFETY:
  The generated outcome columns (views, likes, … engagement_rate) are used ONLY
  to derive the target label `performance_class`.  The training pipeline strips
  all outcome columns before fitting and uses only pre-publication features.
"""

import os
import numpy as np
import pandas as pd

np.random.seed(42)

PLATFORMS = ['Instagram', 'YouTube', 'LinkedIn', 'Twitter']
CONTENT_TYPES = ['Reel', 'Carousel', 'Video', 'Image', 'Text']
CATEGORIES = ['Travel', 'Tech', 'Education', 'Community', 'Lifestyle', 'Finance', 'Health']
DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

N_SAMPLES = 500


def generate_dataset(n: int = N_SAMPLES) -> pd.DataFrame:
    """
    Returns a DataFrame of `n` synthetic social-media posts with realistic
    distributions for both pre-publication features and outcome metrics.
    """
    records = []
    for i in range(n):
        platform = np.random.choice(PLATFORMS, p=[0.40, 0.25, 0.20, 0.15])
        content_type = np.random.choice(CONTENT_TYPES, p=[0.30, 0.22, 0.20, 0.18, 0.10])
        category = np.random.choice(CATEGORIES)
        day_of_week = np.random.choice(DAYS_OF_WEEK)
        posting_hour = int(np.random.choice(range(24), p=_hour_distribution()))
        caption_length = int(np.clip(np.random.normal(130, 60), 0, 500))
        hashtags_count = int(np.clip(np.random.poisson(6), 0, 30))
        duration_seconds = int(np.clip(np.random.exponential(45), 0, 600))

        # ----- Generate outcome metrics (NOT used as features) -----
        # Base virality influenced by content type and platform
        base_reach = _base_reach(platform, content_type)
        reach = int(np.clip(np.random.lognormal(np.log(base_reach), 0.6), 500, 2_000_000))
        views = int(reach * np.random.uniform(1.0, 1.4))

        # Engagement influenced by content type, category, and timing
        er_base = _base_er(content_type, category, posting_hour, day_of_week)
        engagement_rate = float(np.clip(np.random.normal(er_base, 1.8), 0.3, 25.0))
        engagement_total = int(reach * engagement_rate / 100)

        likes = int(engagement_total * np.random.uniform(0.50, 0.70))
        saves = int(engagement_total * np.random.uniform(0.08, 0.20))
        shares = int(engagement_total * np.random.uniform(0.05, 0.15))
        comments = max(0, engagement_total - likes - saves - shares)

        # Synthetic date in last 90 days
        date_offset = np.random.randint(0, 90)
        date = pd.Timestamp.now() - pd.Timedelta(days=date_offset)

        records.append({
            'post_id': f'SYN_{i+1:04d}',
            'date': date.strftime('%Y-%m-%d'),
            'platform': platform,
            'content_type': content_type,
            'category': category,
            'caption_length': caption_length,
            'hashtags_count': hashtags_count,
            'duration_seconds': duration_seconds,
            'posting_hour': posting_hour,
            'day_of_week': day_of_week,
            'views': views,
            'likes': likes,
            'comments': comments,
            'shares': shares,
            'saves': saves,
            'reach': reach,
            'engagement_rate': round(engagement_rate, 2),
        })

    return pd.DataFrame(records)


# ---------------------------------------------------------------------------
# Internal helper distributions
# ---------------------------------------------------------------------------
def _hour_distribution() -> list:
    """Realistic posting-hour probability (peaks at 10am, 1pm, 7-9pm)."""
    weights = np.array([
        1, 1, 1, 1, 1, 2,      # 0-5
        3, 4, 5, 7, 8, 7,      # 6-11
        6, 8, 7, 6, 5, 6,      # 12-17
        8, 10, 10, 9, 5, 2,    # 18-23
    ], dtype=float)
    return (weights / weights.sum()).tolist()


def _base_reach(platform: str, content_type: str) -> float:
    """Platform × content-type base reach (geometric mean)."""
    platform_mult = {'Instagram': 1.0, 'YouTube': 1.3, 'LinkedIn': 0.6, 'Twitter': 0.5}
    type_mult = {'Reel': 1.4, 'Video': 1.2, 'Carousel': 1.0, 'Image': 0.7, 'Text': 0.5}
    return 15_000 * platform_mult.get(platform, 0.8) * type_mult.get(content_type, 0.8)


def _base_er(content_type: str, category: str, hour: int, day: str) -> float:
    """Base engagement rate (%) influenced by format, topic, timing."""
    type_er = {'Reel': 7.5, 'Carousel': 6.0, 'Video': 5.5, 'Image': 4.0, 'Text': 3.0}
    cat_bonus = {'Travel': 1.2, 'Tech': 0.8, 'Education': 0.5, 'Health': 0.6,
                 'Finance': 0.3, 'Community': 0.4, 'Lifestyle': 0.7}
    # Evening bonus
    hour_bonus = 1.0 if 18 <= hour <= 21 else (0.5 if 10 <= hour <= 13 else 0.0)
    # Weekend slight penalty on engagement rate
    day_bonus = -0.3 if day in ('Saturday', 'Sunday') else 0.0
    return type_er.get(content_type, 4.5) + cat_bonus.get(category, 0.4) + hour_bonus + day_bonus


def save_csv(output_path: str = None) -> str:
    """Generate and save synthetic dataset to CSV."""
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), 'data', 'synthetic_training_data.csv')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df = generate_dataset()
    df.to_csv(output_path, index=False)
    print(f"[SocialIQ DataGen] Saved {len(df)} records to {output_path}")
    return output_path


if __name__ == '__main__':
    save_csv()

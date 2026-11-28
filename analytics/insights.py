"""
SocialIQ Insights Engine
Deterministic, rule-based insights derived from the existing analytics functions.

Every insight is backed by the user's actual post data and guarded by minimum
sample sizes, so the engine never draws a conclusion from one or two posts.
No generative AI is used.

INSIGHT SHAPE:
  {
    "id": "content-views",
    "title": "...",
    "description": "...",
    "category": "Content" | "Platform" | "Timing" | "Engagement" | "Category" | "Performance",
    "metric": "Average Views",
    "value": "42,300",
    "comparison": "+27% compared with the next best content type",
    "severity": "positive" | "neutral" | "warning",
    "sampleSize": 18
  }

RESPONSE:
  { "status": "ok" | "empty" | "insufficient", "totalPosts": int,
    "minPosts": int, "insights": [...] }
"""

import sys
import json
from typing import Any, Dict, List, Optional

import pandas as pd

from preprocessing import prepare_dataset
from analytics import (
    calculate_content_type_analysis,
    calculate_category_analysis,
    calculate_platform_analysis,
    calculate_day_of_week_analysis,
    calculate_correlation_analysis,
    get_top_performing_posts,
)

# -------------------------------------------------------------------------
# Thresholds
# -------------------------------------------------------------------------
MIN_DATASET_POSTS = 5        # below this the whole dataset is "insufficient"
MIN_GROUP_POSTS = 3          # a group (e.g. "Saturday") needs this many posts to be compared
MIN_CORRELATION_POSTS = 10   # Pearson r on fewer points is too unstable to report
CORRELATION_MODERATE = 0.5
CORRELATION_STRONG = 0.7
SIMILAR_PCT = 5.0            # leader within 5% of runner-up -> reported as "similar", not a winner
UNDERPERFORM_PCT = 25.0      # group at least 25% below the dataset average -> warning

# Labels that mean "missing" after preprocessing's astype(str)
MISSING_LABELS = {'', 'nan', 'none', 'null', 'unknown', 'undefined'}

# engagement_rate is derived from likes/comments/shares/saves/reach, so its
# correlation with those columns is partly mechanical — excluded from the
# correlation insight.
CORRELATION_METRICS = ['views', 'likes', 'comments', 'shares', 'saves', 'reach']
# Views and reach both measure audience size (reach is unique viewers), so their
# near-1 correlation is expected and tells the user nothing.
EXCLUDED_CORRELATION_PAIRS = {frozenset(('views', 'reach'))}

HOUR_WINDOWS = [
    ('Morning', '5 AM – 11 AM', range(5, 12)),
    ('Afternoon', '12 PM – 4 PM', range(12, 17)),
    ('Evening', '5 PM – 8 PM', range(17, 21)),
    ('Night', '9 PM – 4 AM', list(range(21, 24)) + list(range(0, 5))),
]


# -------------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------------
def _fmt_number(value: float) -> str:
    return f"{round(value):,}"


def _fmt_pct(value: float) -> str:
    return f"{value:.1f}%"


def _drop_missing_labels(df: pd.DataFrame, col: str) -> pd.DataFrame:
    if col not in df.columns:
        return df.iloc[0:0]
    labels = df[col].astype(str).str.strip()
    return df[~labels.str.lower().isin(MISSING_LABELS)]


def _with_reach(df: pd.DataFrame) -> pd.DataFrame:
    """Engagement rate is undefined when reach is 0/missing; exclude those posts rather than count them as 0%."""
    return df[df['reach'] > 0]


def _pct_gap(leader: float, runner_up: float) -> Optional[float]:
    if runner_up <= 0:
        return None
    return (leader - runner_up) / runner_up * 100


def _rank_groups(
    rows: List[Dict[str, Any]],
    label_key: str,
    metric_key: str,
) -> Optional[Dict[str, Any]]:
    """
    Picks a leader among groups that meet MIN_GROUP_POSTS.
    Returns None when fewer than 2 groups qualify or the leader's value is 0.
    """
    eligible = [r for r in rows if r.get('post_count', 0) >= MIN_GROUP_POSTS]
    if len(eligible) < 2:
        return None

    # Stable tie-break on label so equal values always produce the same output
    eligible.sort(key=lambda r: (-r.get(metric_key, 0), str(r[label_key])))
    leader, runner_up = eligible[0], eligible[1]
    leader_val, runner_val = leader.get(metric_key, 0), runner_up.get(metric_key, 0)
    if leader_val <= 0:
        return None

    gap = _pct_gap(leader_val, runner_val)
    tied = [r for r in eligible if r.get(metric_key, 0) == leader_val]
    similar = len(tied) > 1 or (gap is not None and gap < SIMILAR_PCT)

    return {
        'leader': leader,
        'runner_up': runner_up,
        'leader_value': leader_val,
        'runner_value': runner_val,
        'gap': gap,
        'similar': similar,
        'tied_labels': [str(r[label_key]) for r in tied],
        'group_count': len(eligible),
    }


def _leader_insight(
    ranking: Optional[Dict[str, Any]],
    *,
    insight_id: str,
    category: str,
    label_key: str,
    dimension: str,
    metric: str,
    fmt,
    positive_title: str,
    positive_desc: str,
) -> Optional[Dict[str, Any]]:
    """Builds a 'best X by metric' insight, downgrading to neutral when results are tied or within SIMILAR_PCT."""
    if ranking is None:
        return None

    leader = ranking['leader']
    runner = ranking['runner_up']
    name = str(leader[label_key])
    runner_name = str(runner[label_key])
    sample = int(leader['post_count'])

    if ranking['similar']:
        names = ranking['tied_labels'] if len(ranking['tied_labels']) > 1 else [name, runner_name]
        joined = ' and '.join(names) if len(names) == 2 else ', '.join(names[:-1]) + f", and {names[-1]}"
        exact_tie = len(ranking['tied_labels']) > 1
        return {
            'id': insight_id,
            'title': f"No clear leader by {dimension} on {metric.lower()}",
            'description': (
                f"{joined} {'are tied' if exact_tie else 'perform within ' + str(int(SIMILAR_PCT)) + '% of each other'} "
                f"on {metric.lower()}. The current data does not separate them."
            ),
            'category': category,
            'metric': metric,
            'value': fmt(ranking['leader_value']),
            'comparison': 'Tied' if exact_tie else f"Within {SIMILAR_PCT:.0f}% of the next {dimension}",
            'severity': 'neutral',
            'sampleSize': sample,
        }

    gap = ranking['gap']
    comparison = (
        f"+{gap:.0f}% compared with the next best {dimension} ({runner_name})"
        if gap is not None
        else f"The next best {dimension} ({runner_name}) has a value of 0"
    )
    return {
        'id': insight_id,
        'title': positive_title.format(name=name),
        'description': positive_desc.format(
            name=name, sample=sample, groups=ranking['group_count'], value=fmt(ranking['leader_value'])
        ),
        'category': category,
        'metric': metric,
        'value': fmt(ranking['leader_value']),
        'comparison': comparison,
        'severity': 'positive',
        'sampleSize': sample,
    }


# -------------------------------------------------------------------------
# Rules
# -------------------------------------------------------------------------
def rule_best_content_type_views(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    rows = calculate_content_type_analysis(_drop_missing_labels(df, 'content_type'))
    return _leader_insight(
        _rank_groups(rows, 'content_type', 'average_views'),
        insight_id='content-views',
        category='Content',
        label_key='content_type',
        dimension='content type',
        metric='Average Views',
        fmt=_fmt_number,
        positive_title='{name} posts get the most views',
        positive_desc='{name} posts have the highest average views ({value}) among {groups} content types with enough posts. Based on {sample} {name} posts.',
    )


def rule_best_content_type_engagement(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    rows = calculate_content_type_analysis(_with_reach(_drop_missing_labels(df, 'content_type')))
    return _leader_insight(
        _rank_groups(rows, 'content_type', 'average_engagement_rate'),
        insight_id='content-engagement',
        category='Engagement',
        label_key='content_type',
        dimension='content type',
        metric='Avg Engagement Rate',
        fmt=_fmt_pct,
        positive_title='{name} posts have the highest engagement rate',
        positive_desc='{name} posts average an engagement rate of {value}, the highest of {groups} content types with enough posts. Based on {sample} posts with reach data.',
    )


def rule_best_platform(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    # Engagement rate (not raw views) so platforms with different audience sizes compare fairly
    rows = calculate_platform_analysis(_with_reach(_drop_missing_labels(df, 'platform')))
    return _leader_insight(
        _rank_groups(rows, 'platform', 'average_engagement_rate'),
        insight_id='platform-engagement',
        category='Platform',
        label_key='platform',
        dimension='platform',
        metric='Avg Engagement Rate',
        fmt=_fmt_pct,
        positive_title='{name} has your highest engagement rate',
        positive_desc='Posts on {name} average an engagement rate of {value}, the highest of {groups} platforms with enough posts. Based on {sample} {name} posts.',
    )


def rule_best_category(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    rows = calculate_category_analysis(_drop_missing_labels(df, 'category'))
    return _leader_insight(
        _rank_groups(rows, 'category', 'average_views'),
        insight_id='category-views',
        category='Category',
        label_key='category',
        dimension='category',
        metric='Average Views',
        fmt=_fmt_number,
        positive_title='{name} is your strongest category',
        positive_desc='{name} posts have the highest average views ({value}) among {groups} categories with enough posts. Based on {sample} {name} posts.',
    )


def rule_best_day(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    rows = calculate_day_of_week_analysis(_with_reach(df))
    return _leader_insight(
        _rank_groups(rows, 'day', 'average_engagement_rate'),
        insight_id='timing-day',
        category='Timing',
        label_key='day',
        dimension='day',
        metric='Avg Engagement Rate',
        fmt=_fmt_pct,
        positive_title='{name} posts see the highest engagement',
        positive_desc='Posts published on {name} average an engagement rate of {value}, the highest of {groups} days with at least ' + str(MIN_GROUP_POSTS) + ' posts. Based on {sample} {name} posts.',
    )


def rule_best_hour_window(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    data = _with_reach(df)
    if data.empty:
        return None
    rows = []
    for name, label, hours in HOUR_WINDOWS:
        subset = data[data['posting_hour'].isin(list(hours))]
        rows.append({
            'window': f"{name} ({label})",
            'post_count': int(len(subset)),
            'average_engagement_rate': round(float(subset['engagement_rate'].mean()), 2) if len(subset) else 0.0,
        })
    return _leader_insight(
        _rank_groups(rows, 'window', 'average_engagement_rate'),
        insight_id='timing-hours',
        category='Timing',
        label_key='window',
        dimension='time window',
        metric='Avg Engagement Rate',
        fmt=_fmt_pct,
        positive_title='{name} is your best posting window',
        positive_desc='Posts published in the {name} window average an engagement rate of {value}, the highest of {groups} time windows with enough posts. Based on {sample} posts.',
    )


def rule_strongest_correlation(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    if len(df) < MIN_CORRELATION_POSTS:
        return None

    # Zero-variance columns produce NaN correlations; exclude them up front
    cols = [c for c in CORRELATION_METRICS if c in df.columns and df[c].nunique() > 1]
    if len(cols) < 2:
        return None
    matrix = calculate_correlation_analysis(df[cols]).get('dict', {})

    best = None
    for i, a in enumerate(cols):
        for b in cols[i + 1:]:
            if frozenset((a, b)) in EXCLUDED_CORRELATION_PAIRS:
                continue
            r = matrix.get(a, {}).get(b, 0.0)
            if best is None or abs(r) > abs(best[2]):
                best = (a, b, r)

    if best is None or abs(best[2]) < CORRELATION_MODERATE:
        return None

    a, b, r = best
    strength = 'strong' if abs(r) >= CORRELATION_STRONG else 'moderate'
    direction = 'positive' if r > 0 else 'negative'
    trend = 'tend to have higher' if r > 0 else 'tend to have lower'
    return {
        'id': 'engagement-correlation',
        'title': f"{a.capitalize()} and {b} are {strength}ly correlated",
        'description': (
            f"{a.capitalize()} show a {strength} {direction} correlation with {b} (r = {r:.2f}) across "
            f"{len(df)} posts: posts with more {a} {trend} {b}. This is an association only and does not "
            f"show that one causes the other."
        ),
        'category': 'Engagement',
        'metric': 'Pearson Correlation',
        'value': f"r = {r:.2f}",
        'comparison': f"{strength.capitalize()} {direction} association",
        'severity': 'neutral',
        'sampleSize': int(len(df)),
    }


def rule_top_post(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    top = get_top_performing_posts(df, limit=1, sort_by='views')
    if not top or top[0]['views'] <= 0:
        return None
    post = top[0]
    median = float(df['views'].median())
    if median > 0:
        multiple = post['views'] / median
        comparison = f"{multiple:.1f}× your median post ({_fmt_number(median)} views)"
    else:
        comparison = 'Your median post has 0 views'
    return {
        'id': 'performance-top-post',
        'title': f"{post['post_id']} is your top post",
        'description': (
            f"{post['post_id']} ({post['content_type']} · {post['category']} on {post['platform']}) has the most views "
            f"of your {len(df)} posts, with a {post['engagement_rate']:.1f}% engagement rate."
        ),
        'category': 'Performance',
        'metric': 'Views',
        'value': _fmt_number(post['views']),
        'comparison': comparison,
        'severity': 'positive',
        'sampleSize': int(len(df)),
    }


def rule_underperforming_area(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    overall = float(df['views'].mean())
    if overall <= 0:
        return None

    candidates = []
    for col, label, fn in (
        ('content_type', 'content type', calculate_content_type_analysis),
        ('category', 'category', calculate_category_analysis),
        ('platform', 'platform', calculate_platform_analysis),
    ):
        rows = fn(_drop_missing_labels(df, col))
        eligible = [r for r in rows if r['post_count'] >= MIN_GROUP_POSTS]
        # A single group is the whole dataset; it cannot trail itself
        if len(eligible) < 2:
            continue
        for r in eligible:
            shortfall = (overall - r['average_views']) / overall * 100
            if shortfall >= UNDERPERFORM_PCT:
                candidates.append((shortfall, str(r[col]), label, r))

    if not candidates:
        return None
    # Largest shortfall first; label tie-break keeps output deterministic
    candidates.sort(key=lambda c: (-c[0], c[2], c[1]))
    shortfall, name, label, row = candidates[0]
    return {
        'id': 'performance-underperforming',
        'title': f"{name} posts are trailing",
        'description': (
            f"{name} ({label}) averages {_fmt_number(row['average_views'])} views, well below your overall "
            f"average of {_fmt_number(overall)}. Based on {row['post_count']} posts."
        ),
        'category': 'Performance',
        'metric': 'Average Views',
        'value': _fmt_number(row['average_views']),
        'comparison': f"-{shortfall:.0f}% compared with your overall average",
        'severity': 'warning',
        'sampleSize': int(row['post_count']),
    }


RULES = [
    rule_best_content_type_views,
    rule_best_content_type_engagement,
    rule_best_platform,
    rule_best_category,
    rule_best_day,
    rule_best_hour_window,
    rule_strongest_correlation,
    rule_top_post,
    rule_underperforming_area,
]


# -------------------------------------------------------------------------
# Entry points
# -------------------------------------------------------------------------
def generate_insights(source) -> Dict[str, Any]:
    df = prepare_dataset(source)
    total = int(len(df))

    if total == 0:
        return {'status': 'empty', 'totalPosts': 0, 'minPosts': MIN_DATASET_POSTS, 'insights': []}
    if total < MIN_DATASET_POSTS:
        return {'status': 'insufficient', 'totalPosts': total, 'minPosts': MIN_DATASET_POSTS, 'insights': []}

    insights = [i for i in (rule(df) for rule in RULES) if i is not None]
    return {
        'status': 'ok' if insights else 'insufficient',
        'totalPosts': total,
        'minPosts': MIN_DATASET_POSTS,
        'insights': insights,
    }


def main():
    """Reads a JSON array of posts from stdin and writes the insights payload to stdout."""
    raw = sys.stdin.read().strip()
    try:
        data = json.loads(raw) if raw else []
    except json.JSONDecodeError as e:
        sys.stderr.write(f"Failed to parse input JSON: {e}\n")
        sys.exit(1)
    if not isinstance(data, list):
        sys.stderr.write("Input must be a JSON array of posts\n")
        sys.exit(1)
    print(json.dumps(generate_insights(data)))


if __name__ == '__main__':
    main()

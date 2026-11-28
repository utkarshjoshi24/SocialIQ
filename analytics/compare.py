"""
SocialIQ Compare Engine
Compares two segments (A and B) of a user's posts using the existing analytics functions.

PERCENT CHANGE:
  percentChange = ((B - A) / A) * 100      (A is the baseline)
  When A = 0 the percentage is undefined and returned as null with a note.

PERFORMANCE SCORE:
  Average of the existing per-post score (analytics.calculate_performance_score).
  Both segments are scored against the SAME benchmark (all of the user's posts),
  otherwise the reach component would be relative to different medians and the
  two averages would not be comparable.

INPUT (stdin JSON):
  { "a": {"label": str, "posts": [...]}, "b": {...}, "benchmark": [...] }

OUTPUT:
  { "status": "ok" | "emptyA" | "emptyB" | "bothEmpty",
    "segments": {"a": {"label", "posts"}, "b": {...}},
    "metrics": [ {key, label, unit, a, b, difference, percentChange, note} ],
    "summary": str, "warnings": [str] }
"""

import sys
import json
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from preprocessing import prepare_dataset
from analytics import calculate_overview_kpis, calculate_performance_score, sanitize_value

# Segments smaller than this get a "small sample" warning
SMALL_SEGMENT_POSTS = 3

# (key, label, unit) — key is a calculate_overview_kpis key or 'performance_score'
METRICS = [
    ('total_posts', 'Total Posts', 'count'),
    ('total_views', 'Total Views', 'count'),
    ('average_views', 'Average Views', 'number'),
    ('total_reach', 'Total Reach', 'count'),
    ('total_likes', 'Total Likes', 'count'),
    ('total_comments', 'Total Comments', 'count'),
    ('total_shares', 'Total Shares', 'count'),
    ('total_saves', 'Total Saves', 'count'),
    ('average_engagement_rate', 'Avg Engagement Rate', 'percent'),
    ('performance_score', 'Avg Performance Score', 'score'),
]


def _segment_values(df: pd.DataFrame, benchmark: pd.DataFrame) -> Dict[str, float]:
    values = calculate_overview_kpis(df)
    if df.empty:
        values['performance_score'] = 0.0
    else:
        scores = [calculate_performance_score(row, benchmark)['score'] for _, row in df.iterrows()]
        values['performance_score'] = sanitize_value(round(float(np.mean(scores)), 1))
    return values


def compare_metric(a: float, b: float) -> Dict[str, Any]:
    """Difference (B - A) and percentage change relative to A, safe for a zero baseline."""
    a = float(a or 0)
    b = float(b or 0)
    difference = round(b - a, 2)
    if a == 0:
        note = 'Both values are 0' if b == 0 else 'No baseline: A is 0'
        return {'difference': difference, 'percentChange': None, 'note': note}
    return {'difference': difference, 'percentChange': round((b - a) / a * 100, 2), 'note': None}


def _fmt_change(metric: Dict[str, Any]) -> str:
    if metric['percentChange'] is None:
        return 'n/a'
    sign = '+' if metric['percentChange'] > 0 else ''
    return f"{sign}{metric['percentChange']:.1f}%"


def _summary(label_a: str, label_b: str, metrics: List[Dict[str, Any]]) -> str:
    by_key = {m['key']: m for m in metrics}
    views = by_key['average_views']
    er = by_key['average_engagement_rate']
    er_diff = er['difference']
    er_sign = '+' if er_diff > 0 else ''

    if views['percentChange'] is None:
        views_part = 'average views cannot be compared as a percentage because A has 0 views'
    elif views['difference'] == 0:
        views_part = 'average views are the same'
    else:
        direction = 'higher' if views['difference'] > 0 else 'lower'
        views_part = f"average views are {abs(views['percentChange']):.1f}% {direction}"

    er_part = (
        'average engagement rate is unchanged'
        if er_diff == 0
        else f"average engagement rate differs by {er_sign}{er_diff:.2f} percentage points"
    )
    return f"Compared with {label_a}, {label_b}'s {views_part}, and its {er_part}."


def compare_segments(a_records: List[Dict], b_records: List[Dict], benchmark_records: List[Dict],
                     label_a: str = 'A', label_b: str = 'B') -> Dict[str, Any]:
    df_a = prepare_dataset(a_records or [])
    df_b = prepare_dataset(b_records or [])
    benchmark = prepare_dataset(benchmark_records or [])

    segments = {
        'a': {'label': label_a, 'posts': int(len(df_a))},
        'b': {'label': label_b, 'posts': int(len(df_b))},
    }

    if df_a.empty and df_b.empty:
        status = 'bothEmpty'
    elif df_a.empty:
        status = 'emptyA'
    elif df_b.empty:
        status = 'emptyB'
    else:
        status = 'ok'

    if status != 'ok':
        # Comparing against an empty segment would show misleading -100% / n/a rows
        return {'status': status, 'segments': segments, 'metrics': [], 'summary': None, 'warnings': []}

    values_a = _segment_values(df_a, benchmark)
    values_b = _segment_values(df_b, benchmark)

    metrics = []
    for key, label, unit in METRICS:
        a_val, b_val = values_a.get(key, 0), values_b.get(key, 0)
        metrics.append({'key': key, 'label': label, 'unit': unit, 'a': a_val, 'b': b_val, **compare_metric(a_val, b_val)})

    warnings = []
    for seg_key, seg in segments.items():
        if seg['posts'] < SMALL_SEGMENT_POSTS:
            warnings.append(
                f"{seg['label']} has only {seg['posts']} post{'s' if seg['posts'] != 1 else ''}; "
                "differences may not be meaningful."
            )
    if segments['a']['posts'] != segments['b']['posts']:
        warnings.append(
            'The segments have different numbers of posts, so totals partly reflect volume. '
            'Averages are the fairer comparison.'
        )

    return {
        'status': status,
        'segments': segments,
        'metrics': metrics,
        'summary': _summary(label_a, label_b, metrics),
        'warnings': warnings,
    }


def main():
    raw = sys.stdin.read().strip()
    try:
        payload = json.loads(raw) if raw else {}
    except json.JSONDecodeError as e:
        sys.stderr.write(f"Failed to parse input JSON: {e}\n")
        sys.exit(1)
    if not isinstance(payload, dict):
        sys.stderr.write("Input must be a JSON object\n")
        sys.exit(1)

    a = payload.get('a') or {}
    b = payload.get('b') or {}
    result = compare_segments(
        a.get('posts') or [], b.get('posts') or [], payload.get('benchmark') or [],
        a.get('label') or 'A', b.get('label') or 'B',
    )
    print(json.dumps(result))


if __name__ == '__main__':
    main()

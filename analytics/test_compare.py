"""
Tests for the SocialIQ compare engine (compare.py).

Run from analytics/:
    ./venv/bin/python -m unittest test_compare -v
"""

import json
import os
import subprocess
import sys
import unittest

from compare import compare_metric, compare_segments, METRICS

_counter = [0]


def post(**overrides):
    _counter[0] += 1
    base = {
        'post_id': f"C{_counter[0]:04d}",
        'date': '2026-11-02',
        'platform': 'Instagram',
        'content_type': 'Reel',
        'category': 'Travel',
        'caption_length': 100,
        'hashtags_count': 5,
        'duration_seconds': 30,
        'posting_hour': 19,
        'views': 10000,
        'likes': 500,
        'comments': 50,
        'shares': 30,
        'saves': 20,
        'reach': 8000,
    }
    base.update(overrides)
    return base


def metric(result, key):
    return next(m for m in result['metrics'] if m['key'] == key)


class TestCompareMetric(unittest.TestCase):
    """The formula: percentChange = ((B - A) / A) * 100"""

    def test_higher_b(self):
        self.assertEqual(compare_metric(32400, 41800), {'difference': 9400, 'percentChange': 29.01, 'note': None})

    def test_higher_a_negative_difference(self):
        self.assertEqual(compare_metric(41800, 32400), {'difference': -9400, 'percentChange': -22.49, 'note': None})

    def test_equal_values(self):
        self.assertEqual(compare_metric(500, 500), {'difference': 0, 'percentChange': 0.0, 'note': None})

    def test_zero_baseline(self):
        self.assertEqual(compare_metric(0, 120), {'difference': 120, 'percentChange': None, 'note': 'No baseline: A is 0'})

    def test_both_zero(self):
        self.assertEqual(compare_metric(0, 0), {'difference': 0, 'percentChange': None, 'note': 'Both values are 0'})

    def test_missing_values_treated_as_zero(self):
        self.assertEqual(compare_metric(None, 10)['percentChange'], None)
        self.assertEqual(compare_metric(10, None)['percentChange'], -100.0)

    def test_rates_and_decimals(self):
        self.assertEqual(compare_metric(5.92, 6.84), {'difference': 0.92, 'percentChange': 15.54, 'note': None})


class TestCompareSegments(unittest.TestCase):

    def run_compare(self, a, b, label_a='A', label_b='B'):
        result = compare_segments(a, b, a + b, label_a, label_b)
        json.dumps(result)  # must be JSON-serializable
        return result

    def test_all_metrics_present(self):
        result = self.run_compare([post()], [post()])
        self.assertEqual(result['status'], 'ok')
        self.assertEqual([m['key'] for m in result['metrics']], [k for k, _, _ in METRICS])
        for m in result['metrics']:
            self.assertEqual(set(m), {'key', 'label', 'unit', 'a', 'b', 'difference', 'percentChange', 'note'})

    # 1. Date range comparison (segments are prepared by the backend; engine compares them)
    def test_date_range_comparison(self):
        october = [post(date='2026-10-05', views=10000), post(date='2026-10-12', views=20000)]
        november = [post(date='2026-11-05', views=30000), post(date='2026-11-12', views=30000), post(date='2026-11-19', views=30000)]
        result = self.run_compare(october, november, 'October 2026', 'November 2026')
        self.assertEqual(metric(result, 'total_posts')['difference'], 1)
        self.assertEqual(metric(result, 'average_views'), {
            'key': 'average_views', 'label': 'Average Views', 'unit': 'number',
            'a': 15000.0, 'b': 30000.0, 'difference': 15000.0, 'percentChange': 100.0, 'note': None,
        })
        self.assertIn('November 2026', result['summary'])
        self.assertIn('100.0% higher', result['summary'])

    # 2. Platform comparison
    def test_platform_comparison(self):
        ig = [post(platform='Instagram', likes=800) for _ in range(3)]
        yt = [post(platform='YouTube', likes=400) for _ in range(3)]
        result = self.run_compare(ig, yt, 'Instagram', 'YouTube')
        self.assertEqual(metric(result, 'total_likes'), {
            'key': 'total_likes', 'label': 'Total Likes', 'unit': 'count',
            'a': 2400, 'b': 1200, 'difference': -1200.0, 'percentChange': -50.0, 'note': None,
        })
        self.assertLess(metric(result, 'average_engagement_rate')['difference'], 0)

    # 3. Content type comparison
    def test_content_type_comparison(self):
        reels = [post(content_type='Reel', shares=100) for _ in range(4)]
        images = [post(content_type='Image', shares=50) for _ in range(4)]
        result = self.run_compare(reels, images, 'Reel', 'Image')
        self.assertEqual(metric(result, 'total_shares')['percentChange'], -50.0)
        self.assertNotIn('different numbers of posts', ' '.join(result['warnings']))

    # 4. Category comparison
    def test_category_comparison(self):
        travel = [post(category='Travel', saves=10) for _ in range(3)]
        tech = [post(category='Tech', saves=30) for _ in range(5)]
        result = self.run_compare(travel, tech, 'Travel', 'Tech')
        self.assertEqual(metric(result, 'total_saves')['a'], 30)
        self.assertEqual(metric(result, 'total_saves')['b'], 150)
        self.assertEqual(metric(result, 'total_saves')['percentChange'], 400.0)
        self.assertIn('different numbers of posts', ' '.join(result['warnings']))

    # 5. Empty datasets
    def test_empty_a(self):
        result = self.run_compare([], [post()])
        self.assertEqual(result['status'], 'emptyA')
        self.assertEqual(result['metrics'], [])
        self.assertIsNone(result['summary'])

    def test_empty_b(self):
        self.assertEqual(self.run_compare([post()], [])['status'], 'emptyB')

    def test_both_empty(self):
        result = self.run_compare([], [])
        self.assertEqual(result['status'], 'bothEmpty')
        self.assertEqual(result['segments'], {'a': {'label': 'A', 'posts': 0}, 'b': {'label': 'B', 'posts': 0}})

    # 6. Zero baseline
    def test_zero_baseline(self):
        a = [post(views=0, likes=0, comments=0, shares=0, saves=0, reach=0) for _ in range(3)]
        b = [post() for _ in range(3)]
        result = self.run_compare(a, b)
        views = metric(result, 'total_views')
        self.assertIsNone(views['percentChange'])
        self.assertEqual(views['note'], 'No baseline: A is 0')
        self.assertEqual(views['difference'], 30000)
        self.assertIn('A has 0 views', result['summary'])
        # Totals posts are non-zero on both sides, so that one still has a percentage
        self.assertEqual(metric(result, 'total_posts')['percentChange'], 0.0)

    # 7. Equal values
    def test_equal_segments(self):
        result = self.run_compare([post() for _ in range(3)], [post() for _ in range(3)])
        for m in result['metrics']:
            self.assertEqual(m['difference'], 0, m['key'])
            self.assertEqual(m['percentChange'], 0.0, m['key'])
        self.assertIn('average views are the same', result['summary'])
        self.assertIn('unchanged', result['summary'])

    # 8. Higher A
    def test_higher_a(self):
        result = self.run_compare([post(views=50000, reach=40000) for _ in range(3)], [post() for _ in range(3)])
        views = metric(result, 'average_views')
        self.assertLess(views['difference'], 0)
        self.assertLess(views['percentChange'], 0)
        self.assertIn('lower', result['summary'])

    # 9. Higher B
    def test_higher_b(self):
        result = self.run_compare([post() for _ in range(3)], [post(views=50000, reach=40000) for _ in range(3)])
        self.assertEqual(metric(result, 'average_views')['percentChange'], 400.0)
        self.assertIn('higher', result['summary'])

    def test_performance_score_uses_shared_benchmark(self):
        """Same post must score the same in either segment, regardless of what else is in it."""
        same = post(reach=8000)
        a = [dict(same, post_id='S1')]
        b = [dict(same, post_id='S2'), post(reach=500000)]
        result = compare_segments(a, b[:1], a + b)
        self.assertEqual(metric(result, 'performance_score')['difference'], 0)

    def test_missing_values_in_posts(self):
        a = [post(views=None, likes='', reach=None), post()]
        b = [post(), post(shares=None)]
        result = self.run_compare(a, b)
        self.assertEqual(result['status'], 'ok')
        self.assertNotIn('NaN', json.dumps(result))

    def test_small_sample_warning(self):
        result = self.run_compare([post()], [post() for _ in range(4)], 'Tiny', 'Big')
        self.assertTrue(any('Tiny has only 1 post' in w for w in result['warnings']))

    def test_cli(self):
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'compare.py')
        payload = {'a': {'label': 'X', 'posts': [post()]}, 'b': {'label': 'Y', 'posts': [post(views=20000)]},
                   'benchmark': []}
        proc = subprocess.run([sys.executable, script], input=json.dumps(payload), capture_output=True, text=True, timeout=60)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        out = json.loads(proc.stdout)
        self.assertEqual(out['segments']['a']['label'], 'X')
        self.assertEqual(metric(out, 'total_views')['percentChange'], 100.0)


if __name__ == '__main__':
    unittest.main()

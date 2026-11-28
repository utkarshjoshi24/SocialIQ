"""
Tests for the SocialIQ rule-based insights engine (insights.py).

Run from analytics/:
    ./venv/bin/python -m unittest test_insights -v
"""

import json
import os
import subprocess
import sys
import unittest

from insights import (
    generate_insights,
    MIN_DATASET_POSTS,
    MIN_GROUP_POSTS,
)

REQUIRED_KEYS = {'id', 'title', 'description', 'category', 'metric', 'value', 'comparison', 'severity', 'sampleSize'}
CAUSAL_WORDS = ('cause', 'causes', 'drives', 'increases', 'boosts', 'leads to')

_counter = [0]


def post(**overrides):
    """Builds one post record; views/reach scale so engagement rate stays meaningful."""
    _counter[0] += 1
    base = {
        'post_id': f"T{_counter[0]:04d}",
        'date': '2026-11-02',  # Monday
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


def by_id(result, insight_id):
    return next((i for i in result['insights'] if i['id'] == insight_id), None)


def normal_dataset():
    """24 posts: 3 content types, 3 platforms, 3 categories, varied days/hours."""
    posts = []
    dates = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']
    layouts = [
        ('Reel', 'Instagram', 'Travel', 40000),
        ('Carousel', 'LinkedIn', 'Tech', 20000),
        ('Image', 'YouTube', 'Education', 8000),
    ]
    for i in range(24):
        ctype, platform, cat, views = layouts[i % 3]
        views = views + (i * 137) % 3000
        posts.append(post(
            content_type=ctype, platform=platform, category=cat,
            date=dates[i % 7], posting_hour=[9, 14, 19, 22][i % 4],
            views=views, reach=int(views * 0.8),
            likes=int(views * 0.05), comments=int(views * 0.004),
            shares=int(views * (0.002 + (i % 5) * 0.001)), saves=int(views * 0.003),
        ))
    return posts


class TestInsightsEngine(unittest.TestCase):

    # 1. Normal dataset
    def test_normal_dataset(self):
        result = generate_insights(normal_dataset())
        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['totalPosts'], 24)
        self.assertGreaterEqual(len(result['insights']), 5)
        for insight in result['insights']:
            self.assertEqual(set(insight), REQUIRED_KEYS)
            self.assertIn(insight['severity'], ('positive', 'neutral', 'warning'))
            self.assertIn(insight['category'], ('Content', 'Platform', 'Timing', 'Engagement', 'Category', 'Performance'))
        json.dumps(result)  # must be JSON-serializable

        views = by_id(result, 'content-views')
        self.assertEqual(views['title'], 'Reel posts get the most views')
        self.assertEqual(views['severity'], 'positive')
        self.assertTrue(views['comparison'].startswith('+'))
        self.assertIn('Carousel', views['comparison'])

        under = by_id(result, 'performance-underperforming')
        self.assertIsNotNone(under)
        self.assertEqual(under['severity'], 'warning')

        top = by_id(result, 'performance-top-post')
        self.assertEqual(top['category'], 'Performance')

    def test_deterministic(self):
        data = normal_dataset()
        self.assertEqual(generate_insights(data), generate_insights(data))

    # 2. Empty dataset
    def test_empty_dataset(self):
        result = generate_insights([])
        self.assertEqual(result, {'status': 'empty', 'totalPosts': 0, 'minPosts': MIN_DATASET_POSTS, 'insights': []})

    # 3. Small dataset
    def test_small_dataset_is_insufficient(self):
        result = generate_insights([post() for _ in range(MIN_DATASET_POSTS - 1)])
        self.assertEqual(result['status'], 'insufficient')
        self.assertEqual(result['insights'], [])

    def test_single_saturday_post_is_not_best_day(self):
        """One great Saturday post must not produce 'Saturday is the best day'."""
        posts = [post(date='2026-11-02') for _ in range(4)]       # Monday x4
        posts += [post(date='2026-11-03') for _ in range(4)]      # Tuesday x4
        posts.append(post(date='2026-11-07', likes=5000, reach=8000))  # Saturday x1, huge ER
        day = by_id(generate_insights(posts), 'timing-day')
        if day is not None:
            self.assertNotIn('Saturday', day['title'] + day['description'])

    def test_groups_below_min_sample_are_ignored(self):
        posts = [post(content_type='Reel', views=10000) for _ in range(6)]
        posts += [post(content_type='Video', views=500000) for _ in range(MIN_GROUP_POSTS - 1)]
        views = by_id(generate_insights(posts), 'content-views')
        # Video has too few posts; Reel alone cannot be compared
        self.assertIsNone(views)

    # 4. Tied values
    def test_tied_values_reported_as_neutral(self):
        posts = [post(content_type='Reel', views=20000) for _ in range(4)]
        posts += [post(content_type='Video', views=20000) for _ in range(4)]
        views = by_id(generate_insights(posts), 'content-views')
        self.assertEqual(views['severity'], 'neutral')
        self.assertEqual(views['comparison'], 'Tied')
        self.assertIn('Reel and Video are tied', views['description'])

    def test_near_tie_not_declared_winner(self):
        posts = [post(content_type='Reel', views=20500) for _ in range(4)]
        posts += [post(content_type='Video', views=20000) for _ in range(4)]
        views = by_id(generate_insights(posts), 'content-views')
        self.assertEqual(views['severity'], 'neutral')
        self.assertTrue(views['title'].startswith('No clear leader'))

    # 5. Zero values
    def test_all_zero_metrics(self):
        posts = [post(views=0, likes=0, comments=0, shares=0, saves=0, reach=0, content_type=t)
                 for t in ['Reel', 'Video'] * 4]
        result = generate_insights(posts)
        self.assertEqual(result['status'], 'insufficient')
        self.assertEqual(result['insights'], [])

    def test_zero_runner_up_has_no_percentage(self):
        posts = [post(content_type='Reel', views=10000) for _ in range(4)]
        posts += [post(content_type='Video', views=0) for _ in range(4)]
        views = by_id(generate_insights(posts), 'content-views')
        self.assertEqual(views['severity'], 'positive')
        self.assertNotIn('%', views['comparison'])
        self.assertIn('0', views['comparison'])

    def test_zero_reach_excluded_from_engagement_rate(self):
        """Posts without reach have undefined ER and must not drag a group to 0%."""
        posts = [post(platform='Instagram', reach=0) for _ in range(4)]
        posts += [post(platform='LinkedIn', likes=800) for _ in range(4)]
        posts += [post(platform='YouTube', likes=400) for _ in range(4)]
        platform = by_id(generate_insights(posts), 'platform-engagement')
        self.assertIn('LinkedIn', platform['title'])
        self.assertNotIn('Instagram', platform['description'])

    # 6. Missing values
    def test_missing_values(self):
        posts = normal_dataset()
        posts[0]['views'] = None
        posts[1]['likes'] = ''
        posts[2]['reach'] = None
        posts[3]['category'] = None
        posts[4]['platform'] = ''
        del posts[5]['shares']
        result = generate_insights(posts)
        self.assertEqual(result['status'], 'ok')
        text = json.dumps(result)
        for bad in ('"nan"', 'None ', 'NaN', 'Infinity'):
            self.assertNotIn(bad, text)
        for insight in result['insights']:
            self.assertNotIn('nan', insight['title'].lower().split())

    def test_missing_label_group_is_never_named(self):
        posts = [post(category=None, views=900000) for _ in range(5)]
        posts += [post(category='Travel') for _ in range(4)]
        posts += [post(category='Tech', views=5000) for _ in range(4)]
        cat = by_id(generate_insights(posts), 'category-views')
        self.assertIn('Travel', cat['title'])

    # 7. Different platforms
    def test_platform_leader(self):
        posts = [post(platform='YouTube', likes=1200) for _ in range(4)]
        posts += [post(platform='Instagram', likes=400) for _ in range(4)]
        posts += [post(platform='LinkedIn', likes=600) for _ in range(4)]
        platform = by_id(generate_insights(posts), 'platform-engagement')
        self.assertEqual(platform['title'], 'YouTube has your highest engagement rate')
        self.assertEqual(platform['category'], 'Platform')
        self.assertIn('LinkedIn', platform['comparison'])

    # 8. Different content types
    def test_content_type_leaders_views_and_engagement(self):
        posts = [post(content_type='Video', views=50000, reach=40000, likes=800) for _ in range(4)]
        posts += [post(content_type='Carousel', views=15000, reach=12000, likes=1500) for _ in range(4)]
        posts += [post(content_type='Text', views=5000, reach=4000, likes=100) for _ in range(4)]
        result = generate_insights(posts)
        self.assertIn('Video', by_id(result, 'content-views')['title'])
        self.assertIn('Carousel', by_id(result, 'content-engagement')['title'])

    # 9. Different categories
    def test_category_leader(self):
        posts = [post(category='Finance', views=30000) for _ in range(4)]
        posts += [post(category='Health', views=12000) for _ in range(4)]
        posts += [post(category='Tech', views=9000) for _ in range(4)]
        cat = by_id(generate_insights(posts), 'category-views')
        self.assertEqual(cat['title'], 'Finance is your strongest category')
        self.assertEqual(cat['comparison'], '+150% compared with the next best category (Health)')

    # 10. Correlation cases
    def test_strong_correlation_without_causal_language(self):
        posts = []
        for i in range(12):
            shares = 100 + i * 50
            posts.append(post(shares=shares, likes=500 + (i * 37) % 200, reach=5000 + shares * 20, views=90000 + (i * 7) % 5))
        corr = by_id(generate_insights(posts), 'engagement-correlation')
        self.assertIsNotNone(corr)
        self.assertEqual(corr['severity'], 'neutral')
        self.assertIn('positive correlation', corr['description'])
        self.assertIn('does not show that one causes the other', corr['description'])
        description = corr['description'].replace('causes the other', '')
        for word in CAUSAL_WORDS:
            self.assertNotIn(f" {word} ", description)

    def test_negative_correlation(self):
        posts = []
        for i in range(12):
            posts.append(post(comments=1000 - i * 80, saves=50 + i * 90, likes=500, shares=30, views=10000 + (i % 3), reach=8000 + (i % 2)))
        corr = by_id(generate_insights(posts), 'engagement-correlation')
        self.assertIsNotNone(corr)
        self.assertIn('negative', corr['description'])
        self.assertIn('lower', corr['description'])

    def test_correlation_requires_min_posts(self):
        posts = [post(shares=100 + i * 50, reach=5000 + i * 1000) for i in range(9)]
        self.assertIsNone(by_id(generate_insights(posts), 'engagement-correlation'))

    def test_weak_correlation_not_reported(self):
        # Deterministic, uncorrelated-looking pattern
        vals = [3, 9, 1, 7, 5, 2, 8, 4, 6, 10, 1, 9]
        other = [5, 2, 9, 1, 7, 6, 3, 8, 4, 2, 10, 5]
        posts = [post(likes=vals[i] * 10, comments=other[i] * 10, shares=other[(i + 3) % 12] * 10,
                      saves=vals[(i + 5) % 12] * 10, views=10000 + vals[(i + 7) % 12],
                      reach=8000 + other[(i + 1) % 12]) for i in range(12)]
        corr = by_id(generate_insights(posts), 'engagement-correlation')
        if corr is not None:
            self.assertGreaterEqual(abs(float(corr['value'].split('= ')[1])), 0.5)

    def test_views_reach_pair_excluded(self):
        posts = [post(views=1000 * (i + 1), reach=800 * (i + 1), likes=500, comments=50, shares=30, saves=20)
                 for i in range(12)]
        corr = by_id(generate_insights(posts), 'engagement-correlation')
        if corr is not None:
            self.assertFalse('Views' in corr['title'] and 'reach' in corr['title'])

    # CLI bridge used by the Node backend
    def test_cli_reads_stdin_json(self):
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'insights.py')
        proc = subprocess.run(
            [sys.executable, script], input=json.dumps(normal_dataset()),
            capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(json.loads(proc.stdout)['status'], 'ok')

    def test_cli_rejects_invalid_json(self):
        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'insights.py')
        proc = subprocess.run([sys.executable, script], input='{not json', capture_output=True, text=True, timeout=60)
        self.assertNotEqual(proc.returncode, 0)


if __name__ == '__main__':
    unittest.main()

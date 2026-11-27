"""
Automated Test Suite for SocialIQ Analytics Engine
Tests all 10 analytics functions and validates JSON serialization.
"""

import json
import unittest
import pandas as pd
from analytics import (
    calculate_overview_kpis,
    calculate_descriptive_statistics,
    calculate_content_type_analysis,
    calculate_category_analysis,
    calculate_platform_analysis,
    calculate_day_of_week_analysis,
    calculate_posting_hour_analysis,
    calculate_time_heatmap,
    calculate_correlation_analysis,
    get_top_performing_posts,
    calculate_performance_score,
    run_analytics,
)
from preprocessing import prepare_dataset

SAMPLE_DATA = [
    {
        'post_id': 'P001',
        'date': '2026-11-01',
        'platform': 'Instagram',
        'content_type': 'Reel',
        'category': 'Travel',
        'caption_length': 120,
        'hashtags_count': 7,
        'duration_seconds': 28,
        'posting_hour': 20,
        'views': 120000,
        'likes': 8500,
        'comments': 320,
        'shares': 750,
        'saves': 1100,
        'reach': 95000,
    },
    {
        'post_id': 'P002',
        'date': '2026-11-03',
        'platform': 'Instagram',
        'content_type': 'Image',
        'category': 'Tech',
        'caption_length': 80,
        'hashtags_count': 5,
        'duration_seconds': 0,
        'posting_hour': 14,
        'views': 45000,
        'likes': 3200,
        'comments': 120,
        'shares': 180,
        'saves': 240,
        'reach': 39000,
    },
    {
        'post_id': 'P003',
        'date': '2026-11-05',
        'platform': 'YouTube',
        'content_type': 'Video',
        'category': 'Education',
        'caption_length': 240,
        'hashtags_count': 4,
        'duration_seconds': 420,
        'posting_hour': 18,
        'views': 82000,
        'likes': 5400,
        'comments': 280,
        'shares': 310,
        'saves': 650,
        'reach': 71000,
    },
    {
        'post_id': 'P004',
        'date': '2026-11-08',
        'platform': 'LinkedIn',
        'content_type': 'Carousel',
        'category': 'Tech',
        'caption_length': 310,
        'hashtags_count': 6,
        'duration_seconds': 0,
        'posting_hour': 9,
        'views': 31000,
        'likes': 1900,
        'comments': 95,
        'shares': 140,
        'saves': 320,
        'reach': 28000,
    },
    {
        'post_id': 'P005',
        'date': '2026-11-10',
        'platform': 'Instagram',
        'content_type': 'Reel',
        'category': 'Travel',
        'caption_length': 95,
        'hashtags_count': 8,
        'duration_seconds': 22,
        'posting_hour': 21,
        'views': 160000,
        'likes': 12400,
        'comments': 540,
        'shares': 1200,
        'saves': 1900,
        'reach': 130000,
    },
]

class TestSocialIQAnalytics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.df = prepare_dataset(SAMPLE_DATA)

    def test_overview_kpis(self):
        kpis = calculate_overview_kpis(self.df)
        self.assertEqual(kpis['total_posts'], 5)
        self.assertEqual(kpis['total_views'], 438000)
        self.assertGreater(kpis['average_views'], 0)
        self.assertGreater(kpis['average_engagement_rate'], 0)
        json.dumps(kpis)  # Assert JSON serializable

    def test_descriptive_statistics(self):
        stats = calculate_descriptive_statistics(self.df)
        self.assertEqual(len(stats), 7)
        views_stat = next(s for s in stats if s['metric'] == 'Views')
        self.assertEqual(views_stat['min'], 31000)
        self.assertEqual(views_stat['max'], 160000)
        self.assertGreater(views_stat['mean'], 0)
        json.dumps(stats)

    def test_content_type_analysis(self):
        content_stats = calculate_content_type_analysis(self.df)
        self.assertGreater(len(content_stats), 0)
        types = [c['content_type'] for c in content_stats]
        self.assertIn('Reel', types)
        json.dumps(content_stats)

    def test_category_analysis(self):
        cat_stats = calculate_category_analysis(self.df)
        self.assertGreater(len(cat_stats), 0)
        cats = [c['category'] for c in cat_stats]
        self.assertIn('Travel', cats)
        json.dumps(cat_stats)

    def test_platform_analysis(self):
        plat_stats = calculate_platform_analysis(self.df)
        self.assertGreater(len(plat_stats), 0)
        platforms = [p['platform'] for p in plat_stats]
        self.assertIn('Instagram', platforms)
        json.dumps(plat_stats)

    def test_day_of_week_analysis(self):
        day_stats = calculate_day_of_week_analysis(self.df)
        self.assertEqual(len(day_stats), 7)
        self.assertEqual(day_stats[0]['day'], 'Monday')
        json.dumps(day_stats)

    def test_posting_hour_analysis(self):
        hour_stats = calculate_posting_hour_analysis(self.df)
        self.assertEqual(len(hour_stats), 24)
        heatmap = calculate_time_heatmap(self.df)
        self.assertEqual(len(heatmap['matrix']), 7)
        json.dumps(hour_stats)
        json.dumps(heatmap)

    def test_correlation_analysis(self):
        corr = calculate_correlation_analysis(self.df)
        self.assertIn('table', corr)
        self.assertIn('dict', corr)
        self.assertIn('views', corr['dict'])
        self.assertEqual(corr['dict']['views']['views'], 1.0)
        json.dumps(corr)

    def test_top_performing_posts(self):
        top_posts = get_top_performing_posts(self.df, limit=3)
        self.assertEqual(len(top_posts), 3)
        # First post should have highest views
        self.assertEqual(top_posts[0]['post_id'], 'P005')
        self.assertIn(top_posts[0]['tier'], ['High', 'Medium', 'Low'])
        json.dumps(top_posts)

    def test_performance_score_transparency(self):
        sample_post = self.df.iloc[0]
        score_res = calculate_performance_score(sample_post, self.df)
        self.assertIn('score', score_res)
        self.assertIn('tier', score_res)
        self.assertIn('breakdown', score_res)
        self.assertTrue(0 <= score_res['score'] <= 100)
        self.assertIn('formula', score_res)
        json.dumps(score_res)

    def test_run_analytics_full_pipeline(self):
        full_res = run_analytics(SAMPLE_DATA)
        self.assertIn('overview_kpis', full_res)
        self.assertIn('descriptive_stats', full_res)
        self.assertIn('content_analysis', full_res)
        self.assertIn('category_analysis', full_res)
        self.assertIn('platform_analysis', full_res)
        self.assertIn('day_analysis', full_res)
        self.assertIn('hour_analysis', full_res)
        self.assertIn('heatmap_matrix', full_res)
        self.assertIn('correlation_analysis', full_res)
        self.assertIn('top_posts', full_res)
        self.assertIn('score_distribution', full_res)

        # Critical Check: Verify complete JSON serialization without errors
        serialized = json.dumps(full_res)
        self.assertTrue(len(serialized) > 500)

if __name__ == '__main__':
    unittest.main()

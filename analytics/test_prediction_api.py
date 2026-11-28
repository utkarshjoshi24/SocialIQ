"""
Tests for the SocialIQ Flask prediction API (app.py).

Run from analytics/:
    ./venv/bin/python -m unittest test_prediction_api -v
"""

import unittest
from unittest import mock

import pandas as pd

from app import create_app
from predict import PerformancePredictor, ALL_FEATURES

VALID_PAYLOAD = {
    'platform': 'Instagram',
    'contentType': 'Reel',
    'category': 'Travel',
    'captionLength': 120,
    'hashtagsCount': 8,
    'durationSeconds': 30,
    'postingHour': 19,
    'dayOfWeek': 'Saturday',
}


class TestPredictionAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def post(self, payload):
        return self.client.post('/predict', json=payload)

    def assert_field_error(self, payload, field):
        res = self.post(payload)
        self.assertEqual(res.status_code, 400)
        body = res.get_json()
        self.assertEqual(body['error'], 'Validation failed')
        fields = [d['field'] for d in body['details']]
        self.assertIn(field, fields)
        return body

    # 1. Valid prediction
    def test_valid_prediction(self):
        res = self.post(VALID_PAYLOAD)
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(set(body), {'prediction', 'score', 'model', 'message'})
        self.assertIn(body['prediction'], ('Low', 'Medium', 'High'))
        self.assertIsInstance(body['score'], int)
        self.assertTrue(5 <= body['score'] <= 99)
        self.assertEqual(body['model'], 'Decision Tree Classifier')

    def test_valid_prediction_is_deterministic(self):
        first = self.post(VALID_PAYLOAD).get_json()
        second = self.post(VALID_PAYLOAD).get_json()
        self.assertEqual(first, second)

    def test_case_insensitive_and_twitter_alias(self):
        payload = {**VALID_PAYLOAD, 'platform': 'Twitter/X', 'contentType': 'reel', 'dayOfWeek': 'saturday'}
        self.assertEqual(self.post(payload).status_code, 200)

    # 2. Missing fields
    def test_missing_fields(self):
        for field in VALID_PAYLOAD:
            payload = {k: v for k, v in VALID_PAYLOAD.items() if k != field}
            with self.subTest(field=field):
                self.assert_field_error(payload, field)

    def test_empty_body_lists_all_required_fields(self):
        body = self.assert_field_error({}, 'platform')
        self.assertEqual(len(body['details']), len(VALID_PAYLOAD))

    def test_non_json_body(self):
        res = self.client.post('/predict', data='not json', content_type='text/plain')
        self.assertEqual(res.status_code, 400)
        self.assertIn('error', res.get_json())

    def test_json_array_body(self):
        res = self.post([VALID_PAYLOAD])
        self.assertEqual(res.status_code, 400)

    # 3. Invalid numeric values
    def test_invalid_numeric_values(self):
        cases = [
            ('captionLength', 'abc'),
            ('captionLength', -1),
            ('hashtagsCount', -5),
            ('hashtagsCount', 2.5),
            ('durationSeconds', -10),
            ('durationSeconds', True),
            ('captionLength', '120'),
        ]
        for field, value in cases:
            with self.subTest(field=field, value=value):
                self.assert_field_error({**VALID_PAYLOAD, field: value}, field)

    def test_integral_float_accepted(self):
        self.assertEqual(self.post({**VALID_PAYLOAD, 'captionLength': 120.0}).status_code, 200)

    # 4. Invalid posting hour
    def test_invalid_posting_hour(self):
        for value in (24, -1, 7.5, 'evening'):
            with self.subTest(value=value):
                self.assert_field_error({**VALID_PAYLOAD, 'postingHour': value}, 'postingHour')

    def test_posting_hour_bounds_valid(self):
        for value in (0, 23):
            with self.subTest(value=value):
                self.assertEqual(self.post({**VALID_PAYLOAD, 'postingHour': value}).status_code, 200)

    # 5. Invalid day of week
    def test_invalid_day_of_week(self):
        for value in ('Funday', 'Sat', 5):
            with self.subTest(value=value):
                self.assert_field_error({**VALID_PAYLOAD, 'dayOfWeek': value}, 'dayOfWeek')

    # 6. Invalid platform
    def test_invalid_platform(self):
        # TikTok/Facebook are valid in the Post model but the model was never trained on them
        for value in ('MySpace', 'TikTok', 'Facebook'):
            with self.subTest(value=value):
                self.assert_field_error({**VALID_PAYLOAD, 'platform': value}, 'platform')

    # 7. Invalid category / content type
    def test_invalid_category(self):
        self.assert_field_error({**VALID_PAYLOAD, 'category': 'Gaming'}, 'category')

    def test_invalid_content_type(self):
        self.assert_field_error({**VALID_PAYLOAD, 'contentType': 'Story'}, 'contentType')

    # Data-leakage guard
    def test_outcome_fields_rejected(self):
        for field in ('views', 'likes', 'comments', 'shares', 'saves', 'reach', 'engagementRate'):
            with self.subTest(field=field):
                self.assert_field_error({**VALID_PAYLOAD, field: 1000}, field)

    # 8. Model loading
    def test_health_reports_model_loaded(self):
        res = self.client.get('/health')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()['modelLoaded'])

    def test_model_loaded_once_not_per_request(self):
        with mock.patch('predict.joblib.load') as joblib_load:
            for _ in range(3):
                self.assertEqual(self.post(VALID_PAYLOAD).status_code, 200)
            joblib_load.assert_not_called()

    def test_missing_model_returns_503(self):
        app = create_app(PerformancePredictor(model_path='/nonexistent/model.pkl'))
        client = app.test_client()
        self.assertFalse(client.get('/health').get_json()['modelLoaded'])
        res = client.post('/predict', json=VALID_PAYLOAD)
        self.assertEqual(res.status_code, 503)
        self.assertNotIn('nonexistent', res.get_data(as_text=True))

    def test_internal_error_hides_details(self):
        with mock.patch.object(PerformancePredictor, 'predict_single', side_effect=RuntimeError('secret path /x/y')):
            res = self.post(VALID_PAYLOAD)
        self.assertEqual(res.status_code, 500)
        self.assertEqual(res.get_json(), {'error': 'Internal server error'})

    def test_unknown_route_and_method_return_json(self):
        self.assertEqual(self.client.get('/nope').status_code, 404)
        res = self.client.get('/predict')
        self.assertEqual(res.status_code, 405)
        self.assertIn('error', res.get_json())

    # 9. Preprocessing compatibility
    def test_feature_order_matches_training(self):
        predictor = PerformancePredictor().load()
        self.assertEqual(list(predictor.pipeline.feature_names_in_), ALL_FEATURES)

    def test_api_matches_direct_pipeline_prediction(self):
        """API output must equal running the trained pipeline on the same snake_case row."""
        predictor = PerformancePredictor().load()
        row = pd.DataFrame([{
            'platform': 'Instagram', 'content_type': 'Reel', 'category': 'Travel',
            'day_of_week': 'Saturday', 'caption_length': 120, 'hashtags_count': 8,
            'duration_seconds': 30, 'posting_hour': 19,
        }])[ALL_FEATURES]
        expected = predictor.pipeline.predict(row)[0]
        self.assertEqual(self.post(VALID_PAYLOAD).get_json()['prediction'], expected)

    def test_validated_values_are_known_to_encoder(self):
        """Every value the API accepts must be a category the OneHotEncoder saw in training."""
        predictor = PerformancePredictor().load()
        allowed = predictor.feature_categories()
        self.assertIn('Instagram', allowed['platform'])
        self.assertIn('Reel', allowed['content_type'])
        self.assertIn('Travel', allowed['category'])
        self.assertEqual(len(allowed['day_of_week']), 7)


if __name__ == '__main__':
    unittest.main()

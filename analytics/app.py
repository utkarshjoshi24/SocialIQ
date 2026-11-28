"""
SocialIQ ML — Flask Prediction API
==================================

Thin HTTP layer over the existing PerformancePredictor (predict.py).
Called server-to-server by the Node/Express backend, which remains the
primary application API.

ENDPOINTS:
  GET  /health   — service + model status
  POST /predict  — predict Low / Medium / High performance for a planned post

INPUT (camelCase, pre-publication features ONLY):
  platform, contentType, category, captionLength, hashtagsCount,
  durationSeconds, postingHour, dayOfWeek

  Outcome metrics (views, likes, comments, shares, saves, reach,
  engagementRate) are rejected to prevent data leakage.

OUTPUT:
  {
    "prediction": "High",
    "score": 84,
    "model": "Decision Tree Classifier",
    "message": "..."
  }

SCORE:
  Reuses PerformancePredictor's existing score: an expected tier score
  (Low=20, Medium=55, High=85) weighted by the class proportions of the
  training samples in the decision-tree leaf the input falls into, clipped
  to 5–99. It is a relative performance score, NOT a calibrated probability.

USAGE:
  cd analytics/
  ./venv/bin/python app.py
"""

import os
import json
import logging

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from predict import PerformancePredictor

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

logger = logging.getLogger('socialiq.ml')

# camelCase API field -> snake_case model feature
CATEGORICAL_FIELDS = {
    'platform': 'platform',
    'contentType': 'content_type',
    'category': 'category',
    'dayOfWeek': 'day_of_week',
}
NUMERIC_FIELDS = {
    'captionLength': 'caption_length',
    'hashtagsCount': 'hashtags_count',
    'durationSeconds': 'duration_seconds',
    'postingHour': 'posting_hour',
}
REQUIRED_FIELDS = list(CATEGORICAL_FIELDS) + list(NUMERIC_FIELDS)

OUTCOME_FIELDS = frozenset([
    'views', 'likes', 'comments', 'shares', 'saves', 'reach',
    'engagementRate', 'engagement_rate', 'engagementTotal', 'engagement_total',
])

# The main app uses "Twitter/X"; the model was trained on "Twitter".
PLATFORM_ALIASES = {'twitter/x': 'Twitter', 'x': 'Twitter'}

TIER_MESSAGES = {
    'High': 'These characteristics historically align with high-performing posts.',
    'Medium': 'These characteristics historically align with average-performing posts.',
    'Low': 'These characteristics historically align with lower-performing posts.',
}


def _match_category(value: str, allowed: list):
    """Case-insensitive match against the model's known values; returns canonical value or None."""
    lookup = {v.lower(): v for v in allowed}
    return lookup.get(value.strip().lower())


def validate_payload(payload, allowed: dict):
    """
    Validates a /predict request body.

    Returns:
        (features: dict | None, errors: list[dict])
        features uses the model's snake_case feature names.
    """
    if not isinstance(payload, dict):
        return None, [{'field': None, 'message': 'Request body must be a JSON object'}]

    errors = []
    features = {}

    leaked = sorted(k for k in payload if k in OUTCOME_FIELDS)
    if leaked:
        errors.append({
            'field': ', '.join(leaked),
            'message': 'Post-outcome metrics are not accepted; prediction uses pre-publication features only',
        })

    missing = [f for f in REQUIRED_FIELDS if payload.get(f) is None or payload.get(f) == '']
    for field in missing:
        errors.append({'field': field, 'message': f'{field} is required'})

    for field, feature in CATEGORICAL_FIELDS.items():
        if field in missing:
            continue
        value = payload[field]
        if not isinstance(value, str):
            errors.append({'field': field, 'message': f'{field} must be a string'})
            continue
        if field == 'platform':
            value = PLATFORM_ALIASES.get(value.strip().lower(), value)
        matched = _match_category(value, allowed[feature])
        if matched is None:
            errors.append({
                'field': field,
                'message': f'Unsupported {field} "{payload[field]}". Allowed: {", ".join(allowed[feature])}',
            })
        else:
            features[feature] = matched

    for field, feature in NUMERIC_FIELDS.items():
        if field in missing:
            continue
        value = payload[field]
        # bool is a subclass of int in Python; reject it explicitly
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            errors.append({'field': field, 'message': f'{field} must be a number'})
            continue
        if value != value or value in (float('inf'), float('-inf')) or value != int(value):
            errors.append({'field': field, 'message': f'{field} must be a whole number'})
            continue
        value = int(value)
        if value < 0:
            errors.append({'field': field, 'message': f'{field} cannot be negative'})
            continue
        if field == 'postingHour' and value > 23:
            errors.append({'field': field, 'message': 'postingHour must be between 0 and 23'})
            continue
        features[feature] = value

    if errors:
        return None, errors
    return features, []


def create_app(predictor: PerformancePredictor = None) -> Flask:
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024  # prediction payloads are tiny

    # Load the trained model once at startup — never retrained per request.
    predictor = predictor or PerformancePredictor()
    state = {'predictor': None, 'allowed': None, 'version': None}
    try:
        predictor.load()
        state['allowed'] = predictor.feature_categories()
        state['predictor'] = predictor
        logger.info('Model loaded from %s', predictor.model_path)
    except Exception:
        logger.exception('Failed to load ML model; /predict will return 503')

    # Model version (SHA-256 prefix of model.pkl) recorded by train_model.py
    metrics_path = os.path.join(os.path.dirname(predictor.model_path), 'metrics.json')
    if state['predictor'] is not None and os.path.isfile(metrics_path):
        try:
            with open(metrics_path) as f:
                state['version'] = json.load(f).get('model_info', {}).get('model_version')
        except (OSError, ValueError):
            logger.warning('Could not read model version from %s', metrics_path)

    @app.get('/health')
    def health():
        loaded = state['predictor'] is not None
        return jsonify({
            'status': 'ok' if loaded else 'degraded',
            'modelLoaded': loaded,
            'modelVersion': state['version'],
        }), 200

    @app.post('/predict')
    def predict():
        if state['predictor'] is None:
            return jsonify({'error': 'Prediction model is not available'}), 503

        payload = request.get_json(silent=True)
        if payload is None:
            return jsonify({'error': 'Request body must be valid JSON with Content-Type: application/json'}), 400

        features, errors = validate_payload(payload, state['allowed'])
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        result = state['predictor'].predict_single(features)
        tier = result['tier']
        return jsonify({
            'prediction': tier,
            'score': result['score'],
            'model': result['model'],
            'message': TIER_MESSAGES[tier],
        }), 200

    @app.errorhandler(HTTPException)
    def handle_http_error(err):
        return jsonify({'error': err.description or err.name}), err.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(err):
        # Log full details server-side; never send stack traces to the client.
        logger.exception('Unhandled error in ML service')
        return jsonify({'error': 'Internal server error'}), 500

    return app


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='[SocialIQ ML] %(levelname)s %(message)s')
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', '5002'))
    # debug stays off: the Werkzeug debugger would expose stack traces and a console
    create_app().run(host=host, port=port, debug=False)

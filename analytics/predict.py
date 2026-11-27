"""
SocialIQ ML — Prediction Engine
================================

Loads the trained DecisionTree pipeline and predicts performance class
(Low / Medium / High) for new social-media posts.

INPUT:
  A dict (or list of dicts) containing ONLY pre-publication features:
    platform, content_type, category, day_of_week,
    caption_length, hashtags_count, duration_seconds, posting_hour

OUTPUT:
  Predicted tier, confidence (%), score (0–100), class probabilities,
  and an interpretability explanation from the decision tree path.

USAGE (Python):
    from predict import PerformancePredictor
    predictor = PerformancePredictor()
    result = predictor.predict_single({
        'platform': 'Instagram',
        'content_type': 'Reel',
        'category': 'Travel',
        'caption_length': 120,
        'hashtags_count': 7,
        'duration_seconds': 28,
        'posting_hour': 20,
        'day_of_week': 'Friday',
    })

USAGE (CLI — JSON from stdin):
    echo '{"platform":"Instagram","content_type":"Reel",...}' | python predict.py
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'model.pkl')
THRESHOLDS_PATH = os.path.join(MODELS_DIR, 'thresholds.json')

FEATURE_COLS_CATEGORICAL = ['platform', 'content_type', 'category', 'day_of_week']
FEATURE_COLS_NUMERICAL = ['caption_length', 'hashtags_count', 'duration_seconds', 'posting_hour']
ALL_FEATURES = FEATURE_COLS_CATEGORICAL + FEATURE_COLS_NUMERICAL

CLASS_ORDER = ['Low', 'Medium', 'High']


class PerformancePredictor:
    """
    Wraps the trained sklearn Pipeline for single or batch prediction.
    """

    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.pipeline = None
        self.thresholds = None
        self._loaded = False

    def load(self):
        """Load the serialized model and thresholds from disk."""
        if not os.path.isfile(self.model_path):
            raise FileNotFoundError(
                f"Model artifact not found at {self.model_path}. "
                "Run `python train_model.py` first."
            )
        self.pipeline = joblib.load(self.model_path)

        if os.path.isfile(THRESHOLDS_PATH):
            with open(THRESHOLDS_PATH) as f:
                self.thresholds = json.load(f)

        self._loaded = True
        return self

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    # -----------------------------------------------------------------
    # Single prediction
    # -----------------------------------------------------------------
    def predict_single(self, post_params: dict) -> dict:
        """
        Predict performance class for a single post.

        Args:
            post_params: dict with keys from ALL_FEATURES.

        Returns:
            {
              'tier': 'High' | 'Medium' | 'Low',
              'score': int (0–100),
              'confidence': float (0–100 %),
              'probabilities': {'Low': float, 'Medium': float, 'High': float},
              'explanation': str,
              'model': str,
            }
        """
        self._ensure_loaded()

        # Build input DataFrame with correct column order
        input_data = {}
        for col in ALL_FEATURES:
            val = post_params.get(col)
            if col in FEATURE_COLS_NUMERICAL:
                input_data[col] = [int(float(val)) if val is not None else 0]
            else:
                input_data[col] = [str(val) if val is not None else 'Unknown']

        input_df = pd.DataFrame(input_data)

        # Predict
        probabilities = self.pipeline.predict_proba(input_df)[0]
        classes = list(self.pipeline.classes_)

        # Map probabilities to class names
        prob_dict = {}
        for cls, prob in zip(classes, probabilities):
            prob_dict[cls] = round(float(prob) * 100, 1)

        predicted_class = classes[int(np.argmax(probabilities))]
        confidence = float(np.max(probabilities)) * 100

        # Score (0–100): weighted average based on class probabilities
        tier_scores = {'Low': 20, 'Medium': 55, 'High': 85}
        score = sum(
            prob_dict.get(cls, 0) / 100.0 * tier_scores.get(cls, 50)
            for cls in CLASS_ORDER
        )
        score = int(round(max(5, min(99, score))))

        # Explanation
        explanation = self._build_explanation(post_params, predicted_class, prob_dict)

        return {
            'tier': predicted_class,
            'score': score,
            'confidence': round(confidence, 1),
            'probabilities': prob_dict,
            'explanation': explanation,
            'model': 'Decision Tree Classifier',
        }

    # -----------------------------------------------------------------
    # Batch prediction
    # -----------------------------------------------------------------
    def predict_batch(self, posts: list) -> list:
        """Predict for multiple posts. Returns list of result dicts."""
        return [self.predict_single(p) for p in posts]

    # -----------------------------------------------------------------
    # Explanation builder
    # -----------------------------------------------------------------
    def _build_explanation(self, params: dict, tier: str, probs: dict) -> str:
        """
        Generates a human-readable explanation of the prediction.
        """
        parts = []

        platform = params.get('platform', 'Unknown')
        content_type = params.get('content_type', 'Unknown')
        category = params.get('category', 'Unknown')
        hour = params.get('posting_hour', 12)
        day = params.get('day_of_week', 'Monday')

        parts.append(
            f"Based on historical patterns, a {content_type} post about {category} "
            f"on {platform} published at {_format_hour(hour)} on {day} "
            f"is predicted to perform at the {tier} level."
        )

        # Confidence commentary
        conf = probs.get(tier, 50)
        if conf >= 70:
            parts.append(f"The model is fairly confident ({conf:.0f}%) in this prediction.")
        elif conf >= 45:
            parts.append(f"Moderate confidence ({conf:.0f}%) — the outcome could vary.")
        else:
            parts.append(
                f"Low confidence ({conf:.0f}%) — the model is uncertain. "
                "Consider this a rough estimate."
            )

        # Thresholds context
        if self.thresholds:
            q_low = self.thresholds.get('q_low', 0)
            q_high = self.thresholds.get('q_high', 0)
            parts.append(
                f"Classes are defined by engagement rate thresholds: "
                f"Low < {q_low:.1f}%, Medium {q_low:.1f}–{q_high:.1f}%, High ≥ {q_high:.1f}%."
            )

        return ' '.join(parts)


def _format_hour(h: int) -> str:
    """Formats hour (0–23) as human-readable string."""
    h = int(h) % 24
    if h == 0:
        return '12 AM'
    elif h < 12:
        return f'{h} AM'
    elif h == 12:
        return '12 PM'
    else:
        return f'{h - 12} PM'


# ---------------------------------------------------------------------------
# CLI entry point — reads JSON from stdin
# ---------------------------------------------------------------------------
def main():
    """
    Reads a JSON object (single post) or JSON array (batch) from stdin,
    runs prediction, and prints the result as JSON to stdout.
    """
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({'error': 'No input provided'}))
            sys.exit(1)

        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON: {str(e)}'}))
        sys.exit(1)

    predictor = PerformancePredictor()

    if isinstance(data, list):
        results = predictor.predict_batch(data)
        print(json.dumps(results, indent=2))
    else:
        result = predictor.predict_single(data)
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()

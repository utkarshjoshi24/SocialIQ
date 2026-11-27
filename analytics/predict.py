"""
SocialIQ Prediction Engine
Loads the trained decision tree model and predicts performance tier with confidence score.

Note: Executed in Phase 5 / Phase 6.
"""

import os
import joblib
import pandas as pd

DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "model.joblib")

class PerformancePredictor:
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        self.model_path = model_path
        self.model = None

    def load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model artifact not found at {self.model_path}. Train model in Phase 5.")
        self.model = joblib.load(self.model_path)
        return self

    def predict_single(self, post_params: dict) -> dict:
        """
        Accepts post parameters dictionary:
        {
            'platform': 'Instagram',
            'content_type': 'Reel',
            'category': 'Travel',
            'caption_length': 120,
            'hashtags_count': 7,
            'duration_seconds': 28,
            'posting_hour': 20,
            'day_of_week': 'Friday'
        }
        Returns predicted tier, confidence score (0-100), and explanation.
        """
        if self.model is None:
            self.load_model()

        input_df = pd.DataFrame([post_params])
        probabilities = self.model.predict_proba(input_df)[0]
        classes = self.model.classes_

        top_idx = probabilities.argmax()
        predicted_tier = classes[top_idx]
        confidence = float(probabilities[top_idx])

        # Score mapping (0 - 100)
        tier_base_scores = {'High': 85, 'Medium': 55, 'Low': 25}
        score = int(tier_base_scores.get(predicted_tier, 50) + (confidence * 15) - 7.5)
        score = max(5, min(99, score))

        return {
            'tier': predicted_tier,
            'score': score,
            'confidence': round(confidence * 100, 1),
            'model': 'Decision Tree Classifier'
        }

if __name__ == "__main__":
    print("[SocialIQ ML] Predict engine initialized. Ready for inference in Phase 5.")

"""
SocialIQ ML Model Training Pipeline
Prepares features and trains a DecisionTree classifier to predict post performance tiers.

Note: Executed in Phase 5.
"""

import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

FEATURE_COLS_CATEGORICAL = ['platform', 'content_type', 'category', 'day_of_week']
FEATURE_COLS_NUMERICAL = ['caption_length', 'hashtags_count', 'duration_seconds', 'posting_hour']

def create_target_labels(df: pd.DataFrame) -> pd.Series:
    """
    Labels posts into High, Medium, or Low performance based on engagement rate quantiles.
    """
    if 'engagement_rate' not in df.columns:
        raise ValueError("engagement_rate column missing from dataset")
        
    q33 = df['engagement_rate'].quantile(0.33)
    q66 = df['engagement_rate'].quantile(0.66)
    
    def assign_tier(val):
        if val >= q66:
            return 'High'
        elif val >= q33:
            return 'Medium'
        return 'Low'
        
    return df['engagement_rate'].apply(assign_tier)

def build_model_pipeline() -> Pipeline:
    """
    Constructs an end-to-end preprocessing + DecisionTreeClassifier pipeline.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), FEATURE_COLS_CATEGORICAL),
            ('num', 'passthrough', FEATURE_COLS_NUMERICAL)
        ]
    )
    
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', DecisionTreeClassifier(max_depth=6, random_state=42))
    ])
    
    return pipeline

def train_and_save(df: pd.DataFrame, model_output_path: str = "models/model.joblib") -> dict:
    """
    Trains the decision tree pipeline and serializes model artifact.
    """
    X = df[FEATURE_COLS_CATEGORICAL + FEATURE_COLS_NUMERICAL]
    y = create_target_labels(df)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    pipeline = build_model_pipeline()
    pipeline.fit(X_train, y_train)
    
    y_pred = pipeline.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(pipeline, model_output_path)
    print(f"[SocialIQ ML] Model trained and exported to {model_output_path}")
    
    return report

if __name__ == "__main__":
    print("[SocialIQ ML] Training pipeline defined. Run with dataset in Phase 5.")

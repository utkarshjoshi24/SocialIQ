# SocialIQ — Analytics & Machine Learning Module

This module provides data cleaning, descriptive statistics, aggregation algorithms, and machine learning models for the SocialIQ platform.

## Architecture

```
analytics/
├── app.py                      # Flask ML API: GET /health, POST /predict
├── predict.py                  # Loads models/model.pkl, predicts Low/Medium/High + score
├── train_model.py              # Training pipeline (writes models/*)
├── generate_training_data.py   # Synthetic training dataset generator (seeded)
├── preprocessing.py            # Load / clean / derive engagement fields
├── analytics.py                # KPIs, descriptive stats, group analyses, heatmap, correlations
├── run_analytics_bridge.py     # stdin→stdout JSON bridge used by GET /api/analytics
├── insights.py                 # Rule-based insights engine (GET /api/analytics/insights)
├── compare.py                  # Segment comparison engine (GET /api/analytics/compare)
├── data/synthetic_training_data.csv
├── models/                     # model.pkl, thresholds.json, metrics.json
├── test_*.py                   # unittest suites (81 tests)
└── requirements.txt            # Pinned to the versions model.pkl was trained with
```

## Setup & Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Module Responsibilities

1. **`preprocessing.py`**:
   - Parses incoming CSV datasets conforming to the SocialIQ schema.
   - Cleans null/missing values and normalizes platform strings.
   - Derives calculated fields:
     - `engagement_total = likes + comments + shares + saves`
     - `engagement_rate = (engagement_total / reach) * 100`
     - `day_of_week = date.strftime('%A')`

2. **`analytics.py`**:
   - Computes descriptive statistics (Mean, Median, Standard Deviation, Minimum, Maximum) for numerical metrics.
   - Generates Day × Hour heatmap density metrics.
   - Calculates format and category performance benchmarks.
   - Computes Pearson correlation matrix across engagement signals.

3. **`train_model.py`**:
   - Prepares feature matrices and performance target classes (High, Medium, Low).
   - Trains Decision Tree classifier with Scikit-learn.
   - Evaluates accuracy and exports serialized artifact to `models/model.pkl`.

4. **`predict.py`**:
   - Loads the serialized pipeline once and predicts from the 8 pre-publication features.
   - Returns the predicted tier, a relative 5–99 score, the class mix of the matching
     decision-tree leaf, and a plain-language explanation (the Flask API returns tier,
     score, model name and message).

## ML Model

| Item | Value |
|---|---|
| Task | Classify a planned post as **Low / Medium / High** performance before publishing |
| Features (pre-publication only) | platform, content_type, category, day_of_week, caption_length, hashtags_count, duration_seconds, posting_hour |
| Excluded (outcomes → leakage) | views, likes, comments, shares, saves, reach, engagement_rate |
| Target | `engagement_rate` split at the 33rd / 66th percentiles of the **training split** (5.64% / 7.89%, `models/thresholds.json`) |
| Model | `OneHotEncoder` (categoricals) + `DecisionTreeClassifier(max_depth=8, min_samples_leaf=5, min_samples_split=10, class_weight='balanced', random_state=42)` in one sklearn `Pipeline` |
| Data | 500 synthetic rows (`data/synthetic_training_data.csv`), 80/20 split, `random_state=42` |
| Test results | accuracy 0.50 (majority-class baseline 0.38), macro precision 0.49, recall 0.49, F1 0.49 |
| Known limitation | train accuracy 0.755 vs test 0.50 → overfitting flagged; synthetic data, so not representative of real platforms |
| Version | `models/metrics.json → model_info.model_version` (SHA-256 prefix of model.pkl), also returned by `GET /health` |

Retrain with `./venv/bin/python train_model.py`; with the same data and pinned libraries it
reproduces a byte-identical `model.pkl`.

## Prediction API (Flask)

```bash
./venv/bin/python app.py            # http://127.0.0.1:5002 (FLASK_HOST / FLASK_PORT)
./venv/bin/python -m unittest test_prediction_api
```

`POST /predict` accepts only pre-publication features (camelCase):
`platform`, `contentType`, `category`, `captionLength`, `hashtagsCount`,
`durationSeconds`, `postingHour`, `dayOfWeek`. Outcome metrics (views, likes,
comments, shares, saves, reach, engagementRate) are rejected to prevent leakage.
Categorical values must be ones the model was trained on (case-insensitive;
`Twitter/X` maps to `Twitter`).

```json
{ "prediction": "High", "score": 85, "model": "Decision Tree Classifier",
  "message": "These characteristics historically align with high-performing posts." }
```

**score** is a relative performance score (5–99): the tier values Low=20,
Medium=55, High=85 weighted by the class proportions of the training samples in
the decision-tree leaf the input falls into. It is **not** a calibrated probability.

The Node backend exposes this to the frontend as authenticated
`POST /api/prediction`, forwarding to `FLASK_ANALYTICS_URL`.

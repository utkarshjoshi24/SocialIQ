# SocialIQ — Analytics & Machine Learning Module

This module provides data cleaning, descriptive statistics, aggregation algorithms, and machine learning models for the SocialIQ platform.

## Architecture

```
analytics/
├── models/             # Directory for trained model artifacts (model.pkl, thresholds.json, metrics.json)
├── app.py              # Flask prediction API (POST /predict)
├── preprocessing.py    # CSV cleaning, validation, and feature derivation
├── analytics.py        # Statistics, aggregations, correlation matrix
├── train_model.py      # Scikit-learn model training pipeline (Decision Tree)
├── predict.py          # Prediction inference logic and scoring
├── requirements.txt    # Python dependencies
└── README.md
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
   - Loads serialized model and encodes input features (platform, format, duration, tags, hour, day).
   - Returns predicted performance tier, confidence score (0–100), and feature impact notes.

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

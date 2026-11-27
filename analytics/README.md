# SocialIQ — Analytics & Machine Learning Module

This module provides data cleaning, descriptive statistics, aggregation algorithms, and machine learning models for the SocialIQ platform.

## Architecture

```
analytics/
├── models/             # Directory for serialized ML models (model.joblib)
├── services/           # Flask API endpoints and service orchestration
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
   - Evaluates accuracy and exports serialized artifact to `models/model.joblib`.

4. **`predict.py`**:
   - Loads serialized model and encodes input features (platform, format, duration, tags, hour, day).
   - Returns predicted performance tier, confidence score (0–100), and feature impact notes.

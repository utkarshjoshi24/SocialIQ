# SocialIQ — Social Media Analytics & Performance Prediction Platform

SocialIQ is a precision dark analytics and performance prediction SaaS platform engineered for content creators, organizations, and digital teams. The platform follows the progression: **DATA → ANALYSIS → INSIGHT**.

## Architecture

The project is structured with clean separation of responsibilities:

```
SocialIQ/
├── frontend/        # React + Vite + Tailwind CSS (Stitch UI blueprint)
├── backend/         # Node.js + Express + MongoDB (Auth, CRUD, Ingestion)
├── analytics/       # Python + Pandas + Scikit-learn + Flask (Analytics & ML prediction)
├── docs/            # Project specifications (PRD, SRS, Architecture, Data Dictionary)
├── Stitch/          # Approved Stitch UI design source of truth & HTML blueprints
├── .env.example     # Master environment configuration template
├── .gitignore       # Git ignore rules
└── README.md        # Project overview & documentation
```

## Quick Start

Requires Node.js 18+, Python 3.11+ (tested on 3.13) and a running MongoDB (local or Atlas).

### 1. Analytics & ML Service (Python + Flask)
```bash
cd analytics
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py            # ML prediction API on http://127.0.0.1:5002
```

### 2. Backend (Node.js + Express)
```bash
cd backend
cp .env.example .env     # set JWT_SECRET (32+ chars) to keep sessions across restarts
npm install
npm run dev
```
Health check endpoint: `GET http://localhost:5050/api/health`

### 3. Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
Local dev server runs at `http://localhost:5173` and proxies `/api` to the backend on port 5050.

## Testing

```bash
# Python analytics, insights, compare and ML API unit tests
cd analytics && ./venv/bin/python -m unittest test_analytics test_insights test_compare test_prediction_api

# End-to-end API suite (needs all three services running against a THROWAWAY database,
# e.g. MONGODB_URI=mongodb://localhost:27017/socialiq_test, and the backend's JWT_SECRET)
JWT_SECRET=<backend secret> MONGO_DB=socialiq_test python3 tests/api_test.py
```

## API Reference

All `/api` routes except health, register and login require `Authorization: Bearer <token>`.
The implemented API consolidates the per-section analytics endpoints sketched in
`docs/04_SocialIQ_Database_API.docx` into one `GET /api/analytics` payload.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| POST | `/api/auth/register`, `/api/auth/login` | Create account / sign in (returns JWT) |
| GET, PUT | `/api/auth/me` | Current user / update name and email |
| GET, POST | `/api/posts` | List (filters: `search`, `platform`, `contentType`, `category`, `sort`) / create |
| GET, PUT, DELETE | `/api/posts/:id` | One post by MongoDB `_id` or `postId` |
| DELETE | `/api/posts?confirm=DELETE` | Delete all of the user's posts |
| POST | `/api/upload/csv` | Import a CSV (`file` field, max 10,000 rows) |
| GET | `/api/analytics` | KPIs, statistics, trends, breakdowns, heatmap, correlations (filters: `platform`, `contentType`, `category`, `startDate`, `endDate`) |
| GET | `/api/analytics/insights` | Rule-based insights |
| GET | `/api/analytics/compare` | Compare two months, platforms, content types or categories (`type`, `a`, `b`) |
| POST | `/api/prediction` | Low/Medium/High prediction from pre-publication features (proxied to Flask `POST /predict`) |

The Flask ML service (`analytics/app.py`) exposes `GET /health` (including `modelVersion`) and `POST /predict`; it is called only by the Node backend.

## Approved Visual Design System
SocialIQ is designed following the precision dark Stitch design system:
- **Base Surface**: `#050505` to `#171A20`
- **Primary Accent**: Electric Cyan (`#22D3EE`)
- **Secondary Accent**: Violet (`#A78BFA`)
- **Typography**: Alata (Display/KPIs), Instrument Sans (Body/Controls), Spline Sans Mono (Data)

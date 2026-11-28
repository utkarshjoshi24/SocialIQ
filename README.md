# SocialIQ — Social Media Analytics & Performance Prediction Platform

SocialIQ is a precision dark analytics and performance prediction SaaS platform engineered for content creators, organizations, and digital teams. The platform follows the progression: **DATA → ANALYSIS → INSIGHT**.

## Architecture

The project is structured with clean separation of responsibilities:

```
SocialIQ/
├── frontend/        # React + Vite + Tailwind CSS (Stitch UI)
├── backend/         # Node.js + Express + Mongoose (auth, posts, CSV import, analytics/ML orchestration)
├── analytics/       # Python: pandas analytics, insights, compare, scikit-learn model, Flask /predict
├── tests/           # End-to-end API test suite (api_test.py)
├── docs/            # Project specifications (PRD, SRS, architecture, data dictionary, ML plan…)
├── Files/           # Copy of docs/
├── Stitch/          # Approved Stitch UI designs (HTML blueprints + design system)
├── .env.example     # Environment variable reference for all services
└── README.md
```

Request flow: React → Express (`/api`) → MongoDB. For analytics, insights and compare the
backend runs the Python scripts in `analytics/` as child processes; for predictions it calls
the Flask ML service (`POST /predict`). The browser never talks to Python directly.

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

## Deployment

Each service is configured with environment variables (see the `.env.example` files);
secrets are never committed.

| Service | Host (per docs/03) | Required settings |
|---|---|---|
| MongoDB | MongoDB Atlas | Create a database user; use its connection string as `MONGODB_URI` |
| Flask ML API | Render / Railway | `pip install -r analytics/requirements.txt`, run `python app.py` with `FLASK_HOST=0.0.0.0`, `FLASK_PORT`; keep it reachable **only** by the backend (it has no auth of its own) |
| Node backend | Render / Railway | `NODE_ENV=production`, `JWT_SECRET` (32+ random chars, required), `MONGODB_URI`, `CLIENT_URL` (frontend origin), `FLASK_ANALYTICS_URL`, `TRUST_PROXY=1` behind the host's proxy. **The host also needs Python 3.11+ with `analytics/requirements.txt` installed** (or `PYTHON_PATH` pointing at it), because analytics, insights and compare run as Python child processes |
| Frontend | Vercel | Root `frontend/`, build `npm run build`, output `dist/`, `VITE_API_URL` = backend origin. `frontend/vercel.json` rewrites all routes to `index.html` for client-side routing |

The Flask development server is used as-is; for higher traffic run `app:create_app()` under a WSGI server such as gunicorn.

## Approved Visual Design System
SocialIQ is designed following the precision dark Stitch design system:
- **Base Surface**: `#050505` to `#171A20`
- **Primary Accent**: Electric Cyan (`#22D3EE`)
- **Secondary Accent**: Violet (`#A78BFA`)
- **Typography**: Alata (Display/KPIs), Instrument Sans (Body/Controls), Spline Sans Mono (Data)

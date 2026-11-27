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

## Quick Start (Phase 1 Baseline)

### 1. Backend (Node.js + Express)
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Health check endpoint: `GET http://localhost:5000/api/health`

### 2. Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Local dev server runs at: `http://localhost:5173`

### 3. Analytics & ML Service (Python)
```bash
cd analytics
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Approved Visual Design System
SocialIQ is designed following the precision dark Stitch design system:
- **Base Surface**: `#050505` to `#171A20`
- **Primary Accent**: Electric Cyan (`#22D3EE`)
- **Secondary Accent**: Violet (`#A78BFA`)
- **Typography**: Alata (Display/KPIs), Instrument Sans (Body/Controls), Spline Sans Mono (Data)

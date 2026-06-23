# Conflux - Predictive Event Traffic Command Center

**Flipkart GRiDLOCK Hackathon 2.0 - Round 2 (Prototype Phase)**
**Theme 2 - Event-Driven Congestion (Planned & Unplanned)**

> *How can historical and real-time data be used to forecast event-related traffic impact and recommend optimal manpower, barricading, and diversion plans?*

Conflux transforms an event (cricket match, concert, political rally, marathon, protest, etc.) into a space-time congestion forecast for Bengaluru and an actionable deployment plan before the event occurs. It is designed specifically for a Bengaluru Traffic Police planning officer.

![Dashboard](docs/screenshots/01-dashboard.png)

---

## The Three Pillars

| Pillar | Function | Pain Point Addressed |
|--------|----------|----------------------|
| **1. FORECAST** | An ML model predicts per-junction congestion over time (arrival to peak to dispersal), expected delay, impact radius, and the most-affected corridors. | "Event impact is not quantified in advance." |
| **2. RECOMMEND** | Converts the forecast into a plan: manpower allocation (optimized against a staffing budget), barricade points, and diversion routes drawn on the map. | "Resource deployment is experience-driven." |
| **3. LEARN** | A predicted-vs-actual replay for past events with accuracy metrics. | "No post-event learning system." |

In addition, a live scenario simulator allows users to adjust attendance, start times, and weather conditions, updating the forecast and deployment plan instantly.

---

## Machine Learning Implementation

Because real CCTV and ANPR feeds are not available during the prototype phase, Conflux is trained on a grounded synthetic dataset. However, the model is built to handle real-world complexity:

1. **Spatial Backbone**: 38 real Bengaluru junctions (Silk Board, Hebbal, KR Puram, MG Road, Cubbon Park, etc.) are integrated into a road network graph featuring lane counts, capacities, and betweenness centrality, alongside 8 real venues with accurate capacities.

2. **Generative Model**: A physical model produces baseline traffic depending on the time of day and day of the week. An event surcharge is then applied based on attendance, event type, distance-decay from the venue, network funnel effects, an arrival/dispersal temporal curve, and weather conditions.

3. **Feature Mapping**: The model only processes raw, knowable-in-advance features (attendance, type, distance, time, weather). Two HistGradientBoostingRegressor models (for congestion and delay) are trained and evaluated on held-out, unseen events to prevent data leakage.

### Model Performance
*(Evaluated on a held-out set of 79 unseen events, approx. 103k samples)*

| Target | R-Squared | Mean Absolute Error (MAE) | Skill vs. Mean-Baseline |
|--------|-----------|---------------------------|-------------------------|
| **Congestion Index** (0-100) | **0.94** | **3.05 pts** | **+77.5%** |
| **Avg Delay** (min) | **0.82** | **0.49 min** | +53.7% |

**Post-Event Replay Accuracy** (Predicted vs. observed peak, % of junctions within 10 points):

| Event | MAE | Within 10 pts |
|-------|-----|---------------|
| RCB vs CSK - IPL Night Match | 5.7 | 87% |
| Arijit Singh at Palace Grounds | 4.2 | 90% |
| Farmers' Rally at Freedom Park | 3.0 | 100% |
| Bengaluru FC Derby at Kanteerava | 2.9 | 100% |
| TCS World 10K Marathon | 6.9 | 74% |
| Mass Protest at Vidhana Soudha | 6.3 | 74% |

*(Note: Marathons and protests are inherently more challenging to predict as they are route-based rather than point-source. The model correctly reflects higher uncertainty in these scenarios.)*

---

## Recommendation Engine

- **Manpower**: Utilizes greedy marginal-utility allocation. Officers are dispatched to the junction with the highest remaining benefit (priority calculated by event-surge * congestion * centrality, incorporating diminishing returns). Expected delay reductions per junction are reported.
- **Barricades**: Identifies inflow-control points on the most heavily impacted corridors near the venue, scored by a combination of impact and proximity.
- **Diversions**: Employs congestion-aware re-routing. It compares the normal shortest path against a path that penalizes impacted edges, surfacing optimal reroutes to keep event corridors clear.

---

## Architecture

```text
[ web/ (Next.js 16) ]         REST/JSON        [ api/ (FastAPI & Python) ]
- Command-center UI          --------->        - /simulate (forecast & plan)
- Leaflet map (OSM)                            - /events/{id}/replay
- Recharts timelines         <---------        - HistGradientBoosting model
- Scenario simulator                           - NetworkX routing engine
(Deploy: Vercel)                               (Deploy: Docker Container)
```

**Tech Stack**: Next.js 16 (App Router), TypeScript, Tailwind v4, React-Leaflet, Recharts, FastAPI, scikit-learn, NetworkX, pandas, numpy.

---

## Local Setup

### Option A - Docker (Recommended)

```bash
docker compose up --build
```

- Web Dashboard: `http://localhost:3000`
- API Backend: `http://localhost:8000` (Interactive documentation available at `/docs`)

### Option B - Manual Setup

**Terminal 1 (API Server)**
```bash
cd api
python -m venv .venv
# Windows: .venv\Scripts\activate | macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (Web Client)**
```bash
cd web
npm install
npm run dev
```

*Note: The web client defaults to `http://127.0.0.1:8000` for the API. You can override this using the `NEXT_PUBLIC_API_URL` environment variable.*

---

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/venues` | List supported venues |
| `GET` | `/api/event-types` | List supported event types |
| `GET` | `/api/graph` | Fetch junction and road network graph |
| `GET` | `/api/metrics` | Retrieve model metrics and predicted-vs-actual sample data |
| `POST` | `/api/simulate` | Generate forecast and deployment plan for a scenario |
| `GET` | `/api/events` | List curated historical events |
| `GET` | `/api/events/{id}/replay` | Retrieve predicted-vs-actual post-event analysis |

---

## Project Structure

```text
Conflux/
|-- api/                      # Python ML & FastAPI backend
|   |-- app/
|   |   |-- data/             # Venue information and Bengaluru road graph
|   |   |-- ml/               # Feature engineering, generative model, inference, and optimization
|   |   |-- artifacts/        # Trained ML models and metrics
|   |   |-- schemas.py        # API request schemas
|   |   |-- main.py           # FastAPI application entrypoint
|   |-- requirements.txt
|   |-- Dockerfile
|-- web/                      # Next.js frontend
|   |-- src/
|   |   |-- components/       # UI components (Dashboard, MapView, ScenarioPanel, etc.)
|   |   |-- lib/              # API client and formatting utilities
|   |   |-- app/              # Next.js App Router pages
|-- docs/                     # Documentation and screenshots
|-- docker-compose.yml
|-- README.md
```

---

## Deployment

- **Web (Vercel)**: Set the root directory to `web`, and configure the `NEXT_PUBLIC_API_URL` environment variable to point to your deployed API. Next.js settings are automatically detected.
- **API (Containerized)**: Build the `api/` image and deploy to any container host (e.g., Render, Railway, Fly, Cloud Run). The service listens on port 8000, and model artifacts are pre-bundled within the image.

---

## Evaluation Criteria

- **Robustness**: Utilizes real machine learning with leakage-free, held-out evaluation (R-Squared 0.94) alongside a transparent post-event accuracy loop.
- **Innovation**: Isolates event-attributable impact, applies marginal-utility algorithms for manpower optimization, and implements congestion-aware diversion routing.
- **Prototype Clarity**: A fully functional, demo-ready command center that can be spun up with a single command.
- **Scalability**: The graph and tabular model design generalizes easily to any venue and event type. The architecture seamlessly accepts real ANPR/CCTV feeds in place of the synthetic data generator.
- **Real-World Viability**: Delivers exactly what a planning officer needs - precise numbers on how many officers to deploy, where to place barricades, and which routes to divert traffic to.

## Future Scope

- **Real Data Integration**: Transition from synthetic ground truth to real-time feed ingestion.
- **Route-Based Event Modeling**: Enhance prediction models for moving events such as marathons and processions.
- **Workflow Tools**: Add historical event calendar imports and shift-roster exports for field deployment.

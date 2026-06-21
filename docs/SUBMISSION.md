# Conflux — Submission Copy (Round 2 form)

Paste-ready content for each field of the "Create Submission" form.

---

## Title
```
Conflux — Predictive Event-Traffic Command Center for Bengaluru
```
*(Alt: "Conflux — Forecast Event Traffic, Plan the Response, Learn After")*

---

## Theme
```
Event-Driven Congestion (Planned & Unplanned)
```

---

## Description
*(The editor supports formatting + links — keep the headings/bold/bullets.)*

**Conflux turns any city event — a cricket match, concert, political rally, marathon, or sudden protest — into a space-time traffic forecast and a ready-to-execute police deployment plan, *before* the event happens.**

Today, event traffic in Bengaluru is managed reactively: impact isn't quantified in advance, manpower and barricading are decided by experience, and there's no system to learn from each event. Conflux closes all three gaps.

**Three pillars (mapped 1:1 to the problem statement):**

- **Forecast** — A machine-learning model predicts per-junction congestion across 38 real Bengaluru junctions over the full event timeline (arrival → peak → dispersal), isolating the event's *attributable* impact from normal baseline traffic, with expected delay and impact radius.
- **Recommend** — It converts the forecast into an actionable plan: optimal **manpower allocation** (marginal-utility optimization against a staffing budget), **barricade points**, and **diversion routes** — all rendered live on the map.
- **Learn** — A **predicted-vs-actual** replay for past events with accuracy metrics, closing the post-event learning loop.

Plus a **live scenario simulator**: drag attendance, start time, or weather and watch the forecast and the entire deployment plan update instantly — perfect for "what-if" planning.

**How the model works (honestly):** Conflux is trained on a *grounded synthetic dataset* (real CCTV/ANPR feeds aren't available in a prototype), but the ML does real work. A real road graph (lane counts, capacities, betweenness centrality) and a physics-based generator produce the "reality"; the model sees only raw, knowable-in-advance features (attendance, event type, distance, clock time, weather) and must *learn* the mapping. It's evaluated on **held-out, unseen events** (split by event, not row — no leakage):

- **Congestion index:** R² **0.94**, MAE **3.0 / 100** (+77.5% skill vs. baseline)
- **Delay:** R² **0.82**, MAE **0.49 min**
- Validated on **79 unseen events** (~103k samples)

The exact same pipeline accepts **real ANPR / CCTV / loop-detector feeds** in place of the synthetic generator — so it scales from prototype to production without re-architecting.

**Tech:** Next.js + TypeScript + Leaflet + Recharts (command-center dashboard) · FastAPI + scikit-learn + NetworkX (forecasting + routing).

**Impact:** Conflux gives a planning officer exactly what they need — *how many officers where, what to barricade, what to divert* — ahead of time, and gets sharper after every event.

---

## Instructions to Run
*(Numbered steps for reviewers.)*

**Option A — Docker (one command):**

1. Install Docker Desktop and ensure it's running.
2. From the project root, run: `docker compose up --build`
3. Open the web app at **http://localhost:3000** (API runs at http://localhost:8000, docs at /docs).

**Option B — Manual (two terminals):**

1. **API** — `cd api`, create a venv, `pip install -r requirements.txt`, then `uvicorn app.main:app --port 8000`. (The trained model is committed; to retrain, run `python -m app.ml.train`.)
2. **Web** — `cd web`, `npm install`, `npm run dev`.
3. Open **http://localhost:3000**. The web app defaults to the API at http://127.0.0.1:8000 (override via `NEXT_PUBLIC_API_URL`).

**Try it:** Pick a venue + event on the left (or use a preset), press **Run Forecast & Plan**, scrub the timeline with ▶, and open a **Replay Real Event** to see predicted-vs-actual accuracy.

---

## Snapshots (upload these)
- `docs/screenshots/01-dashboard.png`
- `docs/screenshots/00-map-closeup.png`
- `docs/screenshots/03-replay-accuracy.png`
- `docs/screenshots/02-peak.png`

---

## Still needs your accounts
- **Video URL** — record a 2–3 min demo (script to be provided).
- **Presentation** — pitch deck (to be built).
- **Demo Link** — deploy web to Vercel.
- **Repository URL** — push to GitHub.
- **Source Code** — `conflux-source.zip` (generated at repo root).

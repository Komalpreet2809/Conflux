# Conflux — Demo Video Teleprompter (~2:45)

Each beat: **🎙️ SAY** (read aloud) + **🖱️ SHOW** (do on screen) at the same time.

## Before you hit record
- Wake the API: open `https://conflux-api.onrender.com/health` (so the demo is instant).
- Open the live app `https://conflux-chi-orpin.vercel.app/` in **dark mode**, browser at **1080p**, hide the bookmarks bar, close other tabs.
- Let the default forecast finish loading **before** recording.
- Record with Loom or OBS. Do one practice run — it flows better the second time.

---

### 1 · Hook — 0:00–0:15
**🖱️ SHOW:** Full dashboard, already loaded. Don't touch anything yet.
**🎙️ SAY:** "Every week, Bengaluru hosts cricket matches, concerts, rallies, marathons — and every one of them gridlocks the city. Today, traffic police plan for these events from experience. This is **Conflux** — it forecasts event traffic and plans the response *before* the event happens."

### 2 · Orient — 0:15–0:25
**🖱️ SHOW:** Slowly sweep the mouse: left panel → map → right panel.
**🎙️ SAY:** "On the left you configure an event. In the center, the city-wide forecast on a live map. On the right, the deployment plan."

### 3 · Set up the event — 0:25–0:55
**🖱️ SHOW:** On the left: Venue = **Chinnaswamy Stadium**, Event = **Cricket Match**, drag **Attendance ≈ 36k**, Start time **7:30 PM**, Day = **Sat**. Then click **Run Forecast & Plan**.
**🎙️ SAY:** "Let's plan a Saturday-night cricket match at Chinnaswamy Stadium — about thirty-six thousand fans, 7:30 PM. I hit **Run Forecast and Plan**… and Conflux predicts the impact across 38 real Bengaluru junctions."

### 4 · Forecast over time — 0:55–1:25
**🖱️ SHOW:** Press **▶** on the timeline; let it animate. Then click **Peak**. Hover a red node near the venue.
**🎙️ SAY:** "This isn't one snapshot — it's the whole timeline. Watch congestion build as fans arrive, hold during the match, then spike at dispersal when everyone leaves at once. The model isolates the event's *own* impact from normal traffic — peak congestion over ninety out of a hundred at Cubbon Park, a five-and-a-half kilometre impact radius."

### 5 · The deployment plan — 1:25–1:55
**🖱️ SHOW:** Right panel, **Deployment Plan** tab. Click **Manpower** (show the list), then **Barricades**, then **Diversions** (routes light up on the map).
**🎙️ SAY:** "Now the part that matters to an officer — the plan. It allocates a sixty-officer budget to the highest-impact junctions, with the expected delay reduction at each. It flags which corridors to barricade, and reroutes cross-city traffic around the event zone — drawn live on the map."

### 6 · Proof it's accurate — 1:55–2:25
**🖱️ SHOW:** On the left, click **RCB vs CSK — IPL Night Match** under *Replay Real Events*. The right panel switches to **Accuracy** — point at the scatter and the MAE / within-10 numbers.
**🎙️ SAY:** "Is it actually accurate? Here's the post-event learning loop. We replay a past event and compare the forecast against what actually happened — predicted versus actual, hugging the diagonal. Across seventy-nine unseen events, the model scores an R-squared of zero-point-nine-four."

### 7 · Live what-if + scale — 2:25–2:40
**🖱️ SHOW:** Set Weather to **Heavy Rain** (or bump Attendance), click **Run Forecast & Plan** again — show the KPIs / plan change.
**🎙️ SAY:** "And it's a live what-if tool — change the weather or the crowd, and the whole plan updates. Today it runs on a grounded simulation; the same pipeline plugs straight into real ANPR and CCTV feeds."

### 8 · Close — 2:40–2:50
**🖱️ SHOW:** Settle on the full dashboard.
**🎙️ SAY:** "**Conflux turns event traffic from reactive chaos into a plan — before the first car arrives.**"

---

## After recording → get the URL
- **Loom:** the share link is your URL — paste into **Video URL**.
- **YouTube:** upload → set visibility **Unlisted** → paste the watch link (most reliable, no expiry).
- **Google Drive:** upload → Share → *Anyone with the link* → paste.

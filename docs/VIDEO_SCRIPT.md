# Conflux — Demo / Pitch Video Script (~2:45)

Record at **1080p, dark mode**, app running (localhost:3000 or deployed). Each block =
[what's on screen] + word-for-word narration. Speak at a steady pace; total ≈ 2m45s.

---

### 0:00–0:18 · Hook (screen: dashboard, idle)
> "Every week Bengaluru hosts cricket matches, concerts, rallies, marathons — and every one of them gridlocks the city. Today, traffic police plan for these events from experience: impact isn't quantified in advance, and there's no way to learn from the last event. This is **Conflux** — it forecasts event traffic and plans the response *before* the event happens."

### 0:18–0:30 · The idea (screen: pan the 3 areas — controls, map, plan)
> "Three things: it **forecasts** congestion across the city, **recommends** exactly where to put officers, barricades and diversions, and **learns** from every past event."

### 0:30–1:00 · Set up an event (screen: left panel)
> "Let's plan a Saturday-night cricket match at Chinnaswamy Stadium — 36,000 attendees, 7:30 PM."
- Pick venue, event type, drag attendance, set time.
> "I press **Run Forecast and Plan** — and Conflux predicts the impact across 38 real Bengaluru junctions."
- Click **Run Forecast & Plan**. Map fills with colored nodes + routes.

### 1:00–1:30 · Forecast over time (screen: press ▶ on timeline)
> "This isn't a single snapshot — it's the whole timeline. Watch the congestion build during arrival, peak, and then this huge dispersal spike when 36,000 people leave at once."
- Press play; let it animate. Hover a red junction.
> "The model isolates the event's *own* impact from normal traffic. Peak congestion 90 out of 100 at Cubbon Park, a 5-and-a-half kilometre impact radius."
- Point at the KPI strip.

### 1:30–2:00 · The deployment plan (screen: right panel tabs)
> "Now the part that matters to a planning officer — the plan."
- Click **Manpower** tab.
> "It optimally allocates a 60-officer budget to the highest-impact, highest-centrality junctions, with the expected delay reduction at each."
- Click **Barricades**, then **Diversions** (routes highlight on map).
> "It flags which corridors to barricade, and reroutes cross-city traffic around the event zone — drawn live on the map."

### 2:00–2:30 · Proof it's accurate (screen: click a Replay event)
> "Is it actually right? Here's the post-event learning loop."
- Click **RCB vs CSK — IPL Night Match** under Replay Real Events.
> "We replay a past event and compare the forecast against what actually happened — predicted versus actual, hugging the diagonal. Across 79 unseen events the model scores an R-squared of 0.94."
- Point at the scatter + MAE / within-10 metrics.

### 2:30–2:45 · Scale + close (screen: drag a slider, e.g. rain → Heavy)
> "And it's a live what-if tool — change the weather, the crowd, the time, and the whole plan updates. Today it runs on a grounded simulation; the same pipeline plugs straight into real ANPR and CCTV feeds. **Conflux turns event traffic from reactive chaos into a plan — before the first car arrives.**"

---

## How to record + get a URL

**Record (pick one):**
- **Loom** (easiest) — loom.com, records screen + mic, gives a shareable link instantly.
- **OBS Studio** (free) — record to MP4, best quality.
- **Windows Game Bar** — press `Win + G`, record the screen.

**Tips:** dark mode on; browser at 1080p, no bookmarks bar; do one practice run; keep it under 3 min.

**Host → get the link (pick one):**
- **YouTube → Unlisted** (recommended): upload, set visibility to *Unlisted*, paste the watch URL. No expiry, always plays.
- **Google Drive**: upload MP4, Share → *Anyone with the link*, paste link.
- **Loom**: the share link is your URL.

Paste that URL into the **Video URL** field.

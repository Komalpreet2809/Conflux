# Conflux — Deploy Guide (live Demo Link + Repository URL)

Two services: **web → Vercel**, **API → Render**. Order matters — deploy the API
first to get its URL, then give that URL to the web build.

---

## Step 1 · GitHub (Repository URL)
Push the repo (Claude can do this for you via `gh`, or):
```bash
git add -A
git commit -m "Conflux — Round 2 prototype"
gh repo create conflux --public --source=. --push
```
→ The repo URL (e.g. `https://github.com/<you>/conflux`) goes in **Repository URL**.

---

## Step 2 · API → Render (get the API URL)
1. Go to **render.com** → sign up (free) → **New → Blueprint**.
2. Connect GitHub, pick the `conflux` repo. Render reads `render.yaml` and creates
   the **conflux-api** Docker service.
3. Click **Apply** and wait for the build (first build ~3–5 min).
4. Copy the service URL, e.g. `https://conflux-api.onrender.com`.
5. Verify: open `https://conflux-api.onrender.com/health` → should return `{"status":"ok","modelTrained":true}`.

> **Free-tier note:** the service sleeps after ~15 min idle (cold start ~50s).
> Before demoing, open `/health` once to wake it. Optional: set up a free
> **UptimeRobot** monitor pinging `/health` every 10 min to keep it warm.

---

## Step 3 · Web → Vercel (the Demo Link)
1. Go to **vercel.com** → **Add New → Project** → import the `conflux` repo.
2. **Root Directory:** set to **`web`** (important — the Next.js app lives there).
3. **Environment Variables:** add
   `NEXT_PUBLIC_API_URL = https://conflux-api.onrender.com`  *(your Step 2 URL, no trailing slash)*
4. **Deploy.** Vercel auto-detects Next.js.
5. Your Demo Link is the Vercel URL, e.g. `https://conflux.vercel.app` → goes in **Demo Link**.

> If you change `NEXT_PUBLIC_API_URL` later, **redeploy** the web project — the
> value is baked into the client bundle at build time.

---

## Final checks
- Open the Vercel URL → the dashboard should auto-run the default forecast.
- If the map loads but data doesn't: the API is asleep (hit `/health`) or
  `NEXT_PUBLIC_API_URL` is wrong → fix env + redeploy web.
- CORS is already open (`allow_origins=["*"]`), so no extra config needed.

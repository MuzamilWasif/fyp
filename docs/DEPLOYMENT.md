# Deploying VigilantEye

The portal deploys as two pieces: the FastAPI backend on Render (free tier, includes
PostgreSQL and WebSocket support) and the React frontend on Vercel. The detection engine
is not deployed to the cloud — it runs on-premises next to the cameras, exactly as the
scope document intends, and posts alerts to the hosted backend.

## 1. Backend on Render (do this first)

1. Go to render.com and sign in with GitHub.
2. Click **New → Blueprint**, select the `fyp` repository.
3. Render reads `render.yaml` and shows two resources: `vigilanteye-api` and
   `vigilanteye-db`. Click **Apply**.
4. Wait for the first deploy (~5 min). The database is created and seeded automatically
   with the demo accounts (password123).
5. Copy the service URL, e.g. `https://vigilanteye-api.onrender.com`, and verify
   `<url>/api/health` returns `{"status":"ok"}`.

Free-tier notes: the service sleeps after 15 minutes idle (first request wakes it in
~40s), and uploaded evidence files are stored on ephemeral disk, so they reset on
redeploys. Fine for demos and FYP evaluation; for production use S3-style storage.

## 2. Frontend on Vercel

1. Go to vercel.com and sign in with GitHub.
2. Click **Add New → Project**, import the `fyp` repository.
3. Set **Root Directory** to `frontend` (Framework preset: Vite is auto-detected).
4. Under **Environment Variables**, add:
   `VITE_API_URL` = your Render URL (no trailing slash), e.g.
   `https://vigilanteye-api.onrender.com`
5. Click **Deploy**. Your portal is live at the Vercel URL.

## 3. Detection engine (on-premises)

On the machine connected to the cameras:

```bash
cd detection
pip install -r requirements.txt
BACKEND_URL=https://vigilanteye-api.onrender.com CAM_SOURCE=0 python run.py
```

Alerts and evidence clips flow to the hosted backend; note that with a hosted backend the
evidence clip path saved by the local engine is only viewable on that machine, so upload
evidence through the portal for hosted demos, or point `EVIDENCE_DIR` at shared storage.
The MJPEG stream at `http://<engine-host>:8090/stream/<camera_id>` is LAN-only; set each
camera's Stream URL in the portal to that LAN address for the Live Monitoring page.

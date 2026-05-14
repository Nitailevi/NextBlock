# NextBlock

NextBlock is an ADHD-friendly planning app designed to reduce overwhelm, surface the real `now`, and make daily planning feel calmer and more believable.

It combines:
- a React + Vite frontend
- a lightweight local planner backend
- a separate AI-ready coaching service
- a local-first/offline-capable PWA path
- a Capacitor iPhone app wrapper path

## What It Does

- Shows the current task first, then the rest of the day in order
- Supports day, week, and month planning
- Lets users add recurring rules with constraints like time, energy, motivation, difficulty, and importance
- Includes `Get unstuck` logic with structured support and built-in fallback coaching
- Celebrates completed tasks and tracks wins
- Falls back to local planner data when backend services are unavailable

## Project Structure

- `frontend/` - React + Vite app, PWA assets, and Capacitor iOS project
- `backend/` - local task/planning API on `http://localhost:8080`
- `ai-service/` - AI/planning microservice on `http://localhost:8090`
- `run-dev.sh` - local convenience launcher

## Run Locally

Everything:

```bash
./run-dev.sh
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
npm start
```

AI service:

```bash
cd ai-service
npm start
```

## GitHub / CI

This repo now includes CI to validate the main app build and basic service syntax on push and pull request.

The workflow lives at:

- `.github/workflows/ci.yml`

## Deploy As A Hosted PWA

If you want the app to open on iPhone without your computer being on, the strongest web path is to host the frontend over HTTPS.

The frontend is ready for static deployment and includes:

- `frontend/vercel.json`
- `frontend/netlify.toml`
- `frontend/public/manifest.webmanifest`
- `frontend/public/sw.js`

Build it:

```bash
cd frontend
npm install
npm run build
```

Then deploy the `frontend` app to a host like Vercel or Netlify.

Production env vars, if you later host backend services too:

```bash
VITE_API_BASE_URL=https://YOUR-BACKEND/api/task-blocks
VITE_AI_SERVICE_URL=https://YOUR-AI-SERVICE/api/ai
```

If you do not host backend or AI services, NextBlock still works in local-first mode with built-in planner and unstuck fallbacks.

## Build As A Real iPhone App

The iPhone app wrapper is already scaffolded with Capacitor.

Important files:

- `frontend/capacitor.config.ts`
- `frontend/ios/`
- `frontend/ios/App/App.xcodeproj`

Sync the web app into the native shell:

```bash
cd frontend
npm install
npm run cap:sync
```

Open the iOS project in Xcode:

```bash
cd frontend
npx cap open ios
```

Or directly:

```bash
open ios/App/App.xcodeproj
```

From Xcode:

1. Select the `App` target
2. Open `Signing & Capabilities`
3. Choose your Apple ID team
4. Let Xcode manage signing
5. Run on simulator or your physical iPhone

## Local iPhone Testing

For same-network testing from your Mac:

1. Start the local services
2. Open the frontend from your Mac's LAN IP
3. Add it to Home Screen from Safari

Example:

```text
http://YOUR-MAC-IP:5173
```

This is good for testing, but true standalone iPhone use is better through:

- hosted HTTPS deployment, or
- the Capacitor iPhone app

## Notes

- Backend data is stored locally in `backend/data/task-blocks.json`
- AI service can run in heuristic mode or OpenAI-backed mode
- OpenAI-backed mode uses:
  - `AI_PROVIDER=openai`
  - `OPENAI_API_KEY=...`
- The app now includes local planner and local AI fallbacks, so core flows stay usable when services are down

## Repo

GitHub:

- `https://github.com/Nitailevi/NextBlock`

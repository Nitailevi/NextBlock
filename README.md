# NextBlock

This project now lives at:

- `frontend/` - React + Vite planner UI
- `backend/` - lightweight local API server on `http://localhost:8080`
- `ai-service/` - AI microservice for planning suggestions, coaching, and smart arrange support on `http://localhost:8090`

## Run it

Both together:

```bash
./run-dev.sh
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

Frontend:

```bash
cd frontend
npm run dev
```

## Standalone App Paths

If you want NextBlock to keep working without your computer being on, use one of these:

1. Deploy the `frontend` to a real HTTPS host
2. Build the iPhone app wrapper from the Capacitor project

The app is already local-first, so once hosted or packaged, it can keep using saved planner data and the built-in coach without depending on your Mac.

## Deploy The PWA

The frontend is ready for static hosting and includes:

- `frontend/vercel.json`
- `frontend/netlify.toml`
- PWA manifest and service worker

Build it:

```bash
cd frontend
npm install
npm run build
```

Then deploy `frontend/dist` or connect the `frontend` folder to a host like Vercel or Netlify.

Recommended production env vars if you later host backend services too:

```bash
VITE_API_BASE_URL=https://YOUR-BACKEND/api/task-blocks
VITE_AI_SERVICE_URL=https://YOUR-AI-SERVICE/api/ai
```

If you do not host the backend or AI service, the app still works in local-first mode with built-in planning and unstuck fallbacks.

## iPhone App With Capacitor

The iOS wrapper is now scaffolded at:

- `frontend/ios`
- Xcode project: `frontend/ios/App/App.xcodeproj`

Setup and sync:

```bash
cd frontend
npm install
npm run cap:sync
```

Open in Xcode:

```bash
cd frontend
npx cap open ios
```

Or directly:

```bash
open ios/App/App.xcodeproj
```

From Xcode you can run it on:

- an iPhone simulator
- your physical iPhone

Once built that way, it no longer depends on your Mac staying on just to launch.

## Notes

- The backend persists task blocks to `backend/data/task-blocks.json`
- The AI service can run in `local` mode or `openai` mode
- The frontend talks to `http://localhost:8080/api/task-blocks` by default
- The AI service endpoints live under `http://localhost:8090/api/ai`
- You can override the frontend API base with `VITE_API_BASE_URL`
- For OpenAI-backed AI responses, set `AI_PROVIDER=openai` and `OPENAI_API_KEY`

## Local iPhone Testing

- The frontend is now PWA-ready, with a manifest, service worker, and Apple touch icon
- Backend and AI service now bind to `0.0.0.0` by default so your phone can reach them on the same Wi‑Fi network
- The frontend API defaults follow the current hostname, so opening the app from your Mac's LAN IP will point the phone at the right backend and AI service

For local phone testing:

1. Start everything with:

```bash
./run-dev.sh
```

2. Find your Mac's local IP address and open:

```text
http://YOUR-MAC-IP:5173
```

3. In Safari on iPhone, use Share -> Add to Home Screen

For the most reliable installable-app experience, deploy the frontend over HTTPS. iPhone Home Screen apps work best when the site is hosted securely.

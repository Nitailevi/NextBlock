# Deploying NextBlock

## Option 1: Hosted Web App

Best when you want:
- a stable URL
- iPhone Home Screen install from HTTPS
- the app to open without your computer being on

### Vercel

1. Push this repo to GitHub
2. Go to Vercel and create a new project
3. Import `Nitailevi/NextBlock`
4. Set the root directory to:

```text
frontend
```

5. Build command:

```text
npm run build
```

6. Output directory:

```text
dist
```

7. Optional env vars:

```text
VITE_API_BASE_URL=https://YOUR-BACKEND/api/task-blocks
VITE_AI_SERVICE_URL=https://YOUR-AI-SERVICE/api/ai
```

### Netlify

1. Create a new site from GitHub
2. Choose this repo
3. Set base directory to:

```text
frontend
```

4. Build command:

```text
npm run build
```

5. Publish directory:

```text
frontend/dist
```

## Option 2: Real iPhone App

Best when you want:
- a true app installed through Xcode
- no dependency on a browser tab or local network

### Sync The Web App

```bash
cd frontend
npm install
npm run cap:sync
```

### Open In Xcode

```bash
cd frontend
npx cap open ios
```

### Inside Xcode

1. Select the `App` target
2. Open `Signing & Capabilities`
3. Choose your Apple ID team
4. Let Xcode manage signing
5. Choose simulator or your phone
6. Press Run

### If Xcode CLI Tools Are Not Set

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

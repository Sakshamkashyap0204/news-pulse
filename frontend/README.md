# Frontend

Next.js 15 timeline interface for News Pulse.

Displays topic clusters on a proportionally-positioned visual timeline. Supports source filtering, cluster detail drawer, and on-demand ingestion with live job status polling.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Run

```bash
npm run dev      # development (port 3000)
npm run build    # production build
npm start        # serve production build
```

## Test

```bash
npm test
```

Uses vitest. Tests cover timeline layout, source filtering, and date formatting. No live API required.

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Express API. Defaults to `http://localhost:4000`. Must be set to the Render URL in production. |

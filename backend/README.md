# Backend

Node.js/Express REST API and ingestion job runner for News Pulse.

The API exposes five endpoints (`/clusters`, `/clusters/:id`, `/timeline`, `/ingest/trigger`, `/ingest/status/:jobId`) backed by MongoDB. When ingestion is triggered, the backend spawns `scraper/main.py` as a child process and tracks the job status in the `ingestion_jobs` collection.

## Local setup

```bash
npm install
cp .env.example .env
# Set MONGODB_URI in .env
```

## Run

```bash
npm run dev    # development with nodemon (auto-restart)
npm start      # production
```

API listens on port 4000 by default (`PORT` env var to override).

## Test

```bash
npm test
```

Uses Node's built-in test runner with supertest. No live database required.

## Environment variables

See `.env.example` for all available variables. `MONGODB_URI` is the only required variable — the server will not start without it.

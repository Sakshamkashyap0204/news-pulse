# News Pulse

News Pulse ingests live RSS news feeds, groups articles into persistent topic clusters using keyword overlap, and presents cluster activity on an interactive visual timeline.

---

## Features

- Fetches articles from three real public RSS feeds (BBC News, NPR, The Guardian)
- Extracts full article text using [trafilatura](https://trafilatura.readthedocs.io/)
- Deduplicates articles across repeated ingestion runs
- Groups articles into topic clusters using Jaccard keyword similarity
- Persists clusters across runs — new articles join existing clusters
- REST API with five endpoints covering clusters, timeline, and ingestion jobs
- Visual timeline showing each cluster's activity window, proportionally positioned
- Source filter to narrow the timeline to specific news outlets
- On-demand ingestion triggered from the UI with live job status polling

---

## Architecture

```
Browser (Next.js)
      │
      │  REST API calls
      ▼
Node.js / Express API  ──── spawns ────▶  Python scraper
      │                                        │
      │  reads/writes                          │  reads/writes
      ▼                                        ▼
                    MongoDB (Atlas)
                 ┌──────────────────┐
                 │  articles        │
                 │  clusters        │
                 │  ingestion_jobs  │
                 └──────────────────┘
```

**Data flow for one ingestion run:**

1. User clicks "Refresh data" in the browser.
2. Frontend POSTs `/ingest/trigger` to the Node API.
3. Node creates an `ingestion_jobs` record and spawns `scraper/main.py` as a child process, passing the job ID.
4. Python fetches each RSS feed, normalises articles, deduplicates, extracts full text, assigns to clusters, and saves to MongoDB.
5. Python marks the job `completed` (or `failed`) in MongoDB.
6. Frontend polls `/ingest/status/:jobId` every 3 seconds until the job finishes.
7. Frontend fetches `/timeline` and re-renders the timeline.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | Node.js 20, Express 4 |
| Scraper | Python 3.11+, feedparser, trafilatura |
| Database | MongoDB 6 (Atlas in production) |
| Container | Docker (Node 20 / Debian Bookworm) |

---

## Repository Structure

```
xpo/
├── backend/          Node.js/Express REST API and ingestion job runner
│   ├── src/
│   │   ├── app.js                Express app factory
│   │   ├── config/settings.js    Environment-based configuration
│   │   ├── controllers/          Request handlers
│   │   ├── jobs/                 Python subprocess management
│   │   ├── middleware/           Error handling
│   │   ├── routes/               Route definitions
│   │   ├── services/             MongoDB query logic
│   │   └── utils/responses.js    Consistent JSON response helpers
│   ├── tests/api.test.js         Integration tests (Node built-in runner)
│   └── server.js                 Entry point — connects MongoDB, starts HTTP
│
├── scraper/          Python RSS ingestion pipeline
│   ├── clustering/   Keyword tokenisation and Jaccard similarity grouping
│   ├── config/       Feed sources and environment settings
│   ├── database/     MongoDB repository (articles, clusters, jobs)
│   ├── deduplication/Identity key generation (GUID → URL → hash)
│   ├── extraction/   Full article text extraction via trafilatura
│   ├── feeds/        RSS feed fetching and feedparser integration
│   ├── normalization/Article field normalisation and URL cleaning
│   ├── tests/        pytest test suite with XML fixture
│   ├── utils/        Logging configuration
│   └── main.py       Entry point — orchestrates one ingestion run
│
├── frontend/         Next.js timeline interface
│   ├── app/          Next.js App Router (page, layout, global CSS)
│   ├── components/   Timeline, ClusterDrawer, SourceFilter
│   ├── hooks/        useTimeline, useIngestionJob
│   ├── lib/          API client, timeline layout algorithm, TypeScript types
│   └── tests/        vitest tests for timeline logic
│
├── Dockerfile        Builds backend + scraper into a single container
└── README.md         This file
```

---

## Prerequisites

- Node.js 20 or newer
- Python 3.11 or newer
- MongoDB — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier

---

## Local Setup

### 1. Clone and enter the repository

```bash
git clone <your-repo-url>
cd xpo
```

### 2. Python scraper

```bash
cd scraper
python -m venv .venv

# Windows
.\.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and set MONGODB_URI to your local or Atlas connection string
```

### 3. Node backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set MONGODB_URI
```

Start the API:

```bash
npm run dev      # development (nodemon)
npm start        # production
```

The API listens on port 4000 by default.

### 4. Next.js frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Start the frontend:

```bash
npm run dev      # development (port 3000)
npm run build && npm start   # production
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Required | Description |
|---|---|---|---|
| `MONGODB_URI` | — | **Yes** | MongoDB connection string |
| `MONGODB_DATABASE` | `news_pulse` | No | Database name |
| `PORT` | `4000` | No | HTTP port |
| `CORS_ORIGIN` | `http://localhost:3000` | No | Allowed frontend origin — **must be set in production** |
| `PYTHON_PATH` | `python` | No | Python executable (`python3` on Linux/Docker) |
| `SCRAPER_PATH` | `../scraper/main.py` | No | Absolute or relative path to `main.py` |
| `SCRAPER_WORKING_DIRECTORY` | `../scraper` | No | Working directory for the Python process |
| `INGESTION_TIMEOUT_MS` | `300000` | No | Maximum ingestion duration before the process is killed (5 min) |

### Scraper (`scraper/.env`)

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/news_pulse` | MongoDB connection string |
| `MONGODB_DATABASE` | `news_pulse` | Database name |
| `RSS_REQUEST_TIMEOUT_SECONDS` | `15` | Timeout for fetching each RSS feed |
| `EXTRACTION_TIMEOUT_SECONDS` | `20` | Timeout for fetching each article page |
| `REQUEST_DELAY_SECONDS` | `0.3` | Polite delay between article page requests |
| `MIN_SHARED_KEYWORDS` | `3` | Minimum shared keywords to consider a cluster match |
| `MIN_JACCARD_SIMILARITY` | `0.20` | Minimum Jaccard similarity score to join a cluster |
| `MAX_CLUSTER_LABEL_WORDS` | `3` | Number of top keywords used to generate a cluster label |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | Base URL of the Express API |

---

## RSS Sources

Three public feeds are configured in `scraper/config/feeds.py`:

| Source | Feed URL |
|---|---|
| BBC News | `https://feeds.bbci.co.uk/news/rss.xml` |
| NPR | `https://feeds.npr.org/1001/rss.xml` |
| The Guardian | `https://www.theguardian.com/world/rss` |

To add a new source, append a `FeedSource` entry to the `FEED_SOURCES` tuple in `scraper/config/feeds.py`.

---

## Scraper Pipeline

Each ingestion run performs these steps for every article in every feed:

1. **Fetch** — RSS feed is fetched with a configurable timeout. A failed feed is logged and skipped; other feeds continue.
2. **Normalise** — Title, URL, summary, publication date, and source are extracted into a consistent schema. UTM tracking parameters are stripped from URLs. Entries missing a title or URL are discarded.
3. **Deduplicate** — An identity key is computed: feed GUID (preferred) → normalised URL → SHA-256 hash of source + title + date. If the key already exists in MongoDB, the article is skipped.
4. **Extract** — The full article page is fetched and parsed by trafilatura. If extraction fails or returns empty content, the RSS summary is used as a fallback.
5. **Cluster** — Keywords are tokenised from the title, summary, and first 3000 characters of content. Stop words and short tokens are removed. The article is compared against existing clusters using Jaccard similarity. If a match is found, the cluster is updated; otherwise a new cluster is created.
6. **Save** — The article is inserted with a reference to its cluster. A unique index on `identityKey` prevents duplicates even under concurrent runs.

---

## Topic Clustering

### Method

Articles are grouped by keyword overlap using Jaccard similarity.

**Tokenisation:** The title, summary, and first 3000 characters of article content are combined. Tokens are extracted with the regex `[a-zA-Z][a-zA-Z'-]{2,}` (minimum 3 characters, allows hyphens and apostrophes). A hardcoded stop-word list removes common English function words. The result is a set of lowercase keyword strings.

**Similarity:** For each new article, its keyword set is compared against the `representativeKeywords` of every existing cluster using Jaccard similarity:

```
similarity = |article_keywords ∩ cluster_keywords| / |article_keywords ∪ cluster_keywords|
```

**Assignment:** An article joins the best-matching cluster if both conditions are met:
- Shared keyword count ≥ `MIN_SHARED_KEYWORDS` (default: **3**)
- Jaccard similarity ≥ `MIN_JACCARD_SIMILARITY` (default: **0.20**)

If no cluster matches, a new cluster is created.

**Cluster labels** are generated from the top-N most frequent keywords across all articles in the cluster (default: top **3** words, title-cased). Labels update as new articles are added.

**Cluster persistence:** Clusters are stored in MongoDB with stable ObjectId `_id` values. New articles can join existing clusters on every ingestion run. Keyword counts and representative keywords are updated incrementally.

### Known Limitation

Keyword-only clustering without stemming or semantic understanding can produce false groupings. Two unrelated political stories that share common vocabulary — such as "government", "minister", "policy" — may be assigned to the same cluster. Conversely, articles covering the same event using different vocabulary (e.g., "ceasefire" vs "peace agreement") may end up in separate clusters. This is a known trade-off of the approach. A future improvement would be to use sentence embeddings (e.g., a small local model) for semantic similarity instead of raw keyword overlap.

---

## API Endpoints

All responses follow the structure `{ success: true, data: {...} }` or `{ success: false, error: { code, message } }`.

### GET /health

Returns API liveness status.

```json
{ "success": true, "data": { "status": "ok" } }
```

### GET /clusters

Returns all topic clusters sorted by most recent activity.

```json
{
  "success": true,
  "data": {
    "clusters": [
      {
        "id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "label": "Ukraine Russia War",
        "articleCount": 14,
        "earliestPublishedAt": "2024-03-10T08:00:00.000Z",
        "latestPublishedAt": "2024-03-12T16:30:00.000Z",
        "sources": ["BBC News", "NPR", "The Guardian"]
      }
    ]
  }
}
```

### GET /clusters/:id

Returns a single cluster with its full article list and representative keywords.

**Errors:** `400 INVALID_CLUSTER_ID` | `404 CLUSTER_NOT_FOUND`

```json
{
  "success": true,
  "data": {
    "cluster": {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "label": "Ukraine Russia War",
      "articleCount": 14,
      "keywords": ["ukraine", "russia", "war", "ceasefire", "troops"],
      "articles": [
        {
          "id": "65f1a2b3c4d5e6f7a8b9c0d2",
          "title": "Ukraine ceasefire talks resume",
          "source": "BBC News",
          "publishedAt": "2024-03-12T16:30:00.000Z",
          "url": "https://www.bbc.co.uk/news/...",
          "summary": "Talks resumed in...",
          "extractionStatus": "succeeded"
        }
      ]
    }
  }
}
```

### GET /timeline

Returns all clusters with time-span and intensity data for the timeline UI.

Each record includes `start`, `end`, `intensity` (1–5), and a lightweight `articles` array (source + publishedAt only).

### POST /ingest/trigger

Triggers a new ingestion run. Returns `409` if a job is already running.

```json
{ "success": true, "data": { "job": { "id": "uuid", "status": "queued", ... } } }
```

**Status codes:** `202 Accepted` | `409 INGESTION_ALREADY_RUNNING`

### GET /ingest/status/:jobId

Returns the current status of an ingestion job.

**Job statuses:** `queued` → `running` → `completed` | `failed`

**Errors:** `404 JOB_NOT_FOUND`

---

## Running Tests

### Backend

```bash
cd backend
npm test
```

Uses Node's built-in test runner with supertest. No live database required — all tests use an in-memory mock.

### Python scraper

```bash
cd scraper
python -m pytest tests/ -v
```

Uses pytest with a local XML fixture. No live RSS feeds or database required.

### Frontend

```bash
cd frontend
npm test
```

Uses vitest. Tests cover timeline layout, source filtering, and date formatting.

---

## Deployment

### Overview

| Component | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-detected as Next.js |
| Backend + Scraper | Render (Docker) | Single container |
| Database | MongoDB Atlas | Free M0 tier is sufficient |

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write access.
3. Add `0.0.0.0/0` to the IP access list (or restrict to Render's IP range).
4. Copy the connection string: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/`.
5. Indexes are created automatically on the first ingestion run.

### Render (Backend + Scraper)

1. Create a new **Web Service** on [render.com](https://render.com).
2. Connect your GitHub repository.
3. Set **Dockerfile path** to `./Dockerfile` (root of the repo).
4. Set **Port** to `4000`.
5. Add these environment variables:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `MONGODB_DATABASE` | `news_pulse` |
| `CORS_ORIGIN` | Your Vercel frontend URL (e.g. `https://news-pulse.vercel.app`) |
| `PYTHON_PATH` | `/app/.venv/bin/python` (already set in Dockerfile) |
| `SCRAPER_PATH` | `/app/scraper/main.py` (already set in Dockerfile) |
| `SCRAPER_WORKING_DIRECTORY` | `/app/scraper` (already set in Dockerfile) |

6. Verify deployment by visiting `https://<your-render-url>/health` — it should return `{"success":true,"data":{"status":"ok"}}`.

### Vercel (Frontend)

1. Import your GitHub repository at [vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework will be auto-detected as Next.js.
4. Add this environment variable:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Your Render backend URL (e.g. `https://news-pulse-api.onrender.com`) |

5. Deploy. Vercel runs `npm run build` automatically.

### CORS Configuration

The backend's `CORS_ORIGIN` environment variable must be set to the exact Vercel frontend URL (including `https://`, without a trailing slash). If this is not set, the browser will block all API calls from the deployed frontend.

---

## Troubleshooting

**Ingestion job stays "running" after backend restart**
The backend automatically marks stale jobs as failed on startup. If you see a permanently stuck job from before this fix was applied, update it manually in MongoDB Atlas:
```
db.ingestion_jobs.updateMany(
  { status: { $in: ["queued", "running"] } },
  { $set: { status: "failed", error: "Manually cleared." } }
)
```

**"Refresh data" returns 409 immediately**
A previous job is still marked active. See above.

**Timeline is empty after ingestion completes**
Check the ingestion job stats in the job notice — if `inserted: 0`, the feeds may have returned articles that were all duplicates from a previous run. This is normal on repeated runs with the same feed content.

**Article extraction is slow**
Each article page is fetched sequentially with a 0.3-second polite delay between requests. A full run across ~90 articles takes 2–4 minutes. The ingestion timeout is 5 minutes.

**Docker build fails with pip error**
The Dockerfile uses a Python virtual environment (`/app/.venv`) to avoid PEP 668 conflicts with Debian Bookworm's system Python. If you see pip errors, ensure you are using the Dockerfile in the repository root without modification.

---

## Assumptions

- Ingestion is on-demand (triggered by the user) rather than scheduled. A cron job or scheduled Render service could be added to run ingestion automatically.
- No authentication is required. The API is intended for a single trusted user (the assessment reviewer).
- Article extraction is best-effort. If a news site blocks scraping or returns no extractable content, the RSS summary is used as a fallback.
- Cluster labels are generated from keyword frequency and may not always read as natural English phrases.

---

## Future Improvements

- **Semantic clustering:** Replace keyword Jaccard similarity with sentence embeddings (e.g., a small local model via `sentence-transformers`) for more accurate topic grouping.
- **Scheduled ingestion:** Add a cron-based trigger so the timeline updates automatically without user action.
- **Pagination:** Add cursor-based pagination to `/clusters` and the article list in `/clusters/:id` for large datasets.
- **More RSS sources:** The feed list in `scraper/config/feeds.py` is trivial to extend.
- **Cluster merging:** Detect when two clusters have grown to be highly similar and merge them.

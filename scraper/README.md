# Scraper

Python RSS ingestion pipeline for News Pulse.

Fetches articles from BBC News, NPR, and The Guardian. Normalises fields, deduplicates by identity key, extracts full article text via trafilatura, assigns articles to topic clusters using Jaccard keyword similarity, and persists everything to MongoDB.

Run directly for a standalone ingestion:

```bash
python main.py
```

Or triggered automatically by the Node backend via `POST /ingest/trigger`.

## Local setup

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Set MONGODB_URI in .env
```

## Run

```bash
python main.py
# or with an explicit job ID (used by the backend):
python main.py --job-id <uuid>
```

## Test

```bash
python -m pytest tests/ -v
```

No live RSS feeds or database required — tests use a local XML fixture and in-memory data.

## Configuration

All clustering thresholds and network timeouts are configurable via environment variables. See `.env.example` for the full list with defaults.

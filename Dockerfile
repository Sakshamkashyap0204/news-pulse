FROM node:20-bookworm

WORKDIR /app

# ── Node dependencies (production only) ──────────────────────────────────────
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# ── Python virtual environment ────────────────────────────────────────────────
RUN apt-get update && apt-get install -y python3-venv && rm -rf /var/lib/apt/lists/*
COPY scraper/requirements.txt ./scraper/
RUN python3 -m venv /app/.venv \
 && /app/.venv/bin/pip install --no-cache-dir -r scraper/requirements.txt

# ── Application source ────────────────────────────────────────────────────────
COPY backend ./backend
COPY scraper ./scraper

# ── Runtime configuration ─────────────────────────────────────────────────────
WORKDIR /app/backend

ENV PYTHON_PATH=/app/.venv/bin/python
ENV SCRAPER_PATH=/app/scraper/main.py
ENV SCRAPER_WORKING_DIRECTORY=/app/scraper

EXPOSE 4000

CMD ["node", "server.js"]

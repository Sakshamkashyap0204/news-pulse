FROM node:20-bookworm

WORKDIR /app

# ── Node dependencies (production only) ──────────────────────────────────────
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# ── Python virtual environment ────────────────────────────────────────────────
# A venv avoids PEP 668 "externally managed environment" errors on Debian
# Bookworm and keeps scraper dependencies isolated from the system Python.
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

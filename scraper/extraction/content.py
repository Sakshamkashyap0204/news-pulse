import logging
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import trafilatura

LOGGER = logging.getLogger(__name__)
USER_AGENT = "NewsPulseAssessment/1.0 (+https://github.com/)"
MAX_RESPONSE_BYTES = 5_000_000


def extract_article_content(url: str, timeout_seconds: int, delay_seconds: float):
    """Return extracted article text and transparent failure metadata."""
    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        return {"content": "", "status": "failed", "error": "Invalid article URL"}

    try:
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
        with urlopen(request, timeout=timeout_seconds) as response:
            html = response.read(MAX_RESPONSE_BYTES + 1)
        if len(html) > MAX_RESPONSE_BYTES:
            return {"content": "", "status": "failed", "error": "Article response exceeded size limit"}
        content = trafilatura.extract(html, url=url, include_comments=False, include_tables=False) or ""
        if not content.strip():
            return {"content": "", "status": "failed", "error": "No main article content found"}
        return {"content": content.strip(), "status": "succeeded", "error": None}
    except Exception as error:
        LOGGER.info("Article extraction failed for %s: %s", url, error)
        return {"content": "", "status": "failed", "error": str(error)[:200]}
    finally:
        if delay_seconds:
            time.sleep(delay_seconds)

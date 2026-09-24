import logging
from urllib.request import Request, urlopen

import feedparser

from config.feeds import FeedSource

LOGGER = logging.getLogger(__name__)
USER_AGENT = "NewsPulseAssessment/1.0 (+https://github.com/)"


def parse_feed(source: FeedSource, timeout_seconds: int):
    """Fetch and parse one RSS feed without allowing one failed feed to stop the run."""
    request = Request(source.url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml"})
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            payload = response.read()
        parsed_feed = feedparser.parse(payload)
    except Exception as error:
        LOGGER.warning("Could not fetch %s: %s", source.name, error)
        return []

    if parsed_feed.bozo:
        LOGGER.warning("%s returned malformed RSS: %s", source.name, parsed_feed.bozo_exception)

    entries = list(parsed_feed.entries or [])
    LOGGER.info("%s returned %s entries", source.name, len(entries))
    return entries

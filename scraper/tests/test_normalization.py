from datetime import UTC, datetime
from pathlib import Path

import feedparser

from deduplication.identity import build_article_identity
from normalization.article import normalize_article, normalize_published_date, normalize_url


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_entry(**kwargs):
    """Return a minimal dict that normalize_article accepts."""
    base = {"title": "Test Article", "link": "https://example.com/test", "summary": "A summary."}
    base.update(kwargs)
    return base


# ---------------------------------------------------------------------------
# Fixture-based tests (existing, kept intact)
# ---------------------------------------------------------------------------

def test_normalizes_realistic_feed_entry():
    fixture = Path(__file__).parent / "fixtures" / "sample_feed.xml"
    entry = feedparser.parse(fixture.read_bytes()).entries[0]
    article = normalize_article(entry, "Fixture News", "fixture")

    assert article["title"] == "City Council Approves Transit Plan"
    assert article["summary"] == "The council approved a transit plan."
    assert article["normalizedUrl"] == "https://example.com/story"
    assert article["publishedAt"] == datetime(2024, 3, 12, 10, 30, tzinfo=UTC)
    assert build_article_identity(article) == "guid:fixture:story-1"


def test_skips_entry_without_a_title():
    fixture = Path(__file__).parent / "fixtures" / "sample_feed.xml"
    entry = feedparser.parse(fixture.read_bytes()).entries[1]
    assert normalize_article(entry, "Fixture News", "fixture") is None


def test_rejects_invalid_article_url():
    assert normalize_url("javascript:alert(1)") == ""


# ---------------------------------------------------------------------------
# URL normalization
# ---------------------------------------------------------------------------

def test_normalize_url_strips_utm_parameters():
    url = "https://example.com/story?utm_source=rss&utm_medium=feed&utm_campaign=news"
    assert normalize_url(url) == "https://example.com/story"


def test_normalize_url_strips_trailing_slash():
    assert normalize_url("https://example.com/story/") == "https://example.com/story"


def test_normalize_url_preserves_non_utm_query_params():
    url = "https://example.com/story?page=2&utm_source=rss"
    assert normalize_url(url) == "https://example.com/story?page=2"


def test_normalize_url_rejects_empty_string():
    assert normalize_url("") == ""


# ---------------------------------------------------------------------------
# Date normalization
# ---------------------------------------------------------------------------

def test_missing_pubdate_returns_none():
    """An entry with no date fields must return None without raising."""
    entry = _make_entry()
    article = normalize_article(entry, "Test", "test")
    assert article is not None
    assert article["publishedAt"] is None


def test_malformed_date_string_returns_none():
    """A garbage date string must not raise — it must return None."""
    result = normalize_published_date({"published": "not-a-date-at-all"})
    assert result is None


def test_iso_date_string_is_parsed():
    result = normalize_published_date({"published": "2024-03-12T10:30:00Z"})
    assert result == datetime(2024, 3, 12, 10, 30, tzinfo=UTC)


def test_rfc2822_date_string_is_parsed():
    result = normalize_published_date({"published": "Tue, 12 Mar 2024 10:30:00 GMT"})
    assert result == datetime(2024, 3, 12, 10, 30, tzinfo=UTC)


# ---------------------------------------------------------------------------
# content:encoded / content field
# ---------------------------------------------------------------------------

def test_content_encoded_field_is_extracted():
    """feedparser maps content:encoded to entry.content list."""
    entry = _make_entry(content=[{"value": "<p>Full article body.</p>", "type": "text/html"}])
    article = normalize_article(entry, "Test", "test")
    assert article is not None
    # rssContent should contain the cleaned text from the content field
    assert "Full article body" in article["rssContent"]


# ---------------------------------------------------------------------------
# Deduplication identity
# ---------------------------------------------------------------------------

def test_identity_uses_guid_when_present():
    article = {"sourceId": "bbc", "externalId": "story-42", "normalizedUrl": "https://example.com/story"}
    key = build_article_identity(article)
    assert key == "guid:bbc:story-42"


def test_identity_falls_back_to_url_when_no_guid():
    article = {"sourceId": "bbc", "externalId": None, "normalizedUrl": "https://example.com/story"}
    key = build_article_identity(article)
    assert key == "url:https://example.com/story"


def test_identity_falls_back_to_hash_when_no_guid_or_url():
    article = {"sourceId": "bbc", "externalId": None, "normalizedUrl": "", "title": "Test", "publishedAt": None}
    key = build_article_identity(article)
    assert key.startswith("hash:")
    assert len(key) == 5 + 64  # "hash:" + 64 hex chars


def test_identity_is_deterministic():
    article = {"sourceId": "bbc", "externalId": None, "normalizedUrl": "", "title": "Test", "publishedAt": None}
    assert build_article_identity(article) == build_article_identity(article)

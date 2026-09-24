import html
import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from time import struct_time
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def normalize_article(entry, source_name: str, source_id: str):
    title = clean_text(get_first(entry, "title"))
    url = normalize_url(get_first(entry, "link"))
    if not title or not url:
        return None

    summary = clean_text(get_first(entry, "summary", "description"))
    content = get_content_value(entry)
    external_id = clean_text(get_first(entry, "id", "guid"))
    published_at = normalize_published_date(entry)

    return {
        "source": source_name,
        "sourceId": source_id,
        "externalId": external_id or None,
        "title": title,
        "summary": summary,
        "url": url,
        "normalizedUrl": url,
        "publishedAt": published_at,
        "rssContent": clean_text(content),
    }


def get_first(entry, *field_names):
    for field_name in field_names:
        value = entry.get(field_name) if hasattr(entry, "get") else None
        if value:
            return value
    return ""


def get_content_value(entry):
    contents = entry.get("content", []) if hasattr(entry, "get") else []
    if contents:
        first_item = contents[0]
        if isinstance(first_item, dict):
            return first_item.get("value", "")
    return get_first(entry, "summary", "description")


def clean_text(value) -> str:
    if not value:
        return ""
    plain_text = re.sub(r"<[^>]+>", " ", str(value))
    return re.sub(r"\s+", " ", html.unescape(plain_text)).strip()


def normalize_published_date(entry):
    for parsed_field in ("published_parsed", "updated_parsed"):
        parsed_value = entry.get(parsed_field) if hasattr(entry, "get") else None
        if isinstance(parsed_value, struct_time):
            return datetime(*parsed_value[:6], tzinfo=UTC)

    for text_field in ("published", "updated", "pubDate"):
        raw_value = get_first(entry, text_field)
        if not raw_value:
            continue
        try:
            parsed = parsedate_to_datetime(str(raw_value))
            return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
        except (TypeError, ValueError, IndexError):
            try:
                parsed = datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
                return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
            except ValueError:
                continue
    return None


def normalize_url(raw_url: str) -> str:
    if not raw_url:
        return ""
    try:
        parts = urlsplit(str(raw_url).strip())
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            return ""
        retained_query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if not key.lower().startswith("utm_")]
        return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/") or "/", urlencode(retained_query), ""))
    except ValueError:
        return ""

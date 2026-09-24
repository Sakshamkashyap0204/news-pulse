import hashlib


def build_article_identity(article: dict) -> str:
    """Prefer stable feed identity, then normalized URL, then a deterministic fallback."""
    if article.get("externalId"):
        return f"guid:{article['sourceId']}:{article['externalId']}"
    if article.get("normalizedUrl"):
        return f"url:{article['normalizedUrl']}"

    fallback = "|".join((article.get("sourceId", ""), article.get("title", ""), str(article.get("publishedAt", ""))))
    return f"hash:{hashlib.sha256(fallback.encode('utf-8')).hexdigest()}"

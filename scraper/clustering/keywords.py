import re
from collections import Counter

STOP_WORDS = frozenset({"about", "after", "again", "against", "also", "and", "are", "as", "at", "be", "been", "before", "but", "by", "can", "could", "for", "from", "has", "have", "in", "into", "is", "it", "its", "more", "new", "not", "of", "on", "or", "out", "over", "said", "says", "that", "the", "their", "there", "they", "this", "to", "was", "were", "what", "when", "which", "who", "will", "with", "would", "you", "your"})


def tokenize_article(title: str, summary: str, content: str = "") -> set[str]:
    # Titles and summaries are usually the most focused description of the story.
    text = " ".join(part for part in (title, summary, content[:3000]) if part)
    tokens = re.findall(r"[a-zA-Z][a-zA-Z'-]{2,}", text.lower())
    return {token for token in tokens if token not in STOP_WORDS and not token.isdigit()}


def calculate_similarity(article_keywords: set[str], cluster_keywords: set[str]) -> tuple[int, float]:
    if not article_keywords or not cluster_keywords:
        return 0, 0.0
    shared_count = len(article_keywords & cluster_keywords)
    union_count = len(article_keywords | cluster_keywords)
    return shared_count, shared_count / union_count


def build_cluster_label(keyword_counts: dict, max_words: int) -> str:
    most_common = [word for word, _ in Counter(keyword_counts).most_common(max_words)]
    return " ".join(word.title() for word in most_common) or "Uncategorized Topic"

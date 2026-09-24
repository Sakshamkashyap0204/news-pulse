from clustering.keywords import build_cluster_label, calculate_similarity


def find_matching_cluster(article_keywords: set[str], clusters: list[dict], min_shared_keywords: int, min_similarity: float):
    best_match = None
    best_score = (0, 0.0)
    for cluster in clusters:
        shared_count, similarity = calculate_similarity(article_keywords, set(cluster.get("representativeKeywords", [])))
        if shared_count >= min_shared_keywords and similarity >= min_similarity and (shared_count, similarity) > best_score:
            best_match = cluster
            best_score = (shared_count, similarity)
    return best_match


def merge_keyword_counts(existing_counts: dict, new_keywords: set[str]) -> dict:
    merged = dict(existing_counts or {})
    for keyword in new_keywords:
        merged[keyword] = merged.get(keyword, 0) + 1
    return merged


def cluster_update_fields(cluster: dict, article: dict, keywords: set[str], max_label_words: int) -> dict:
    keyword_counts = merge_keyword_counts(cluster.get("keywordCounts", {}), keywords)
    dates = [value for value in (cluster.get("earliestPublishedAt"), article.get("publishedAt")) if value]
    latest_dates = [value for value in (cluster.get("latestPublishedAt"), article.get("publishedAt")) if value]
    representative = sorted(keyword_counts, key=keyword_counts.get, reverse=True)[:20]
    return {
        "label": build_cluster_label(keyword_counts, max_label_words),
        "keywordCounts": keyword_counts,
        "representativeKeywords": representative,
        "articleCount": cluster.get("articleCount", 0) + 1,
        "earliestPublishedAt": min(dates) if dates else None,
        "latestPublishedAt": max(latest_dates) if latest_dates else None,
        "sources": sorted(set(cluster.get("sources", [])) | {article["source"]}),
    }

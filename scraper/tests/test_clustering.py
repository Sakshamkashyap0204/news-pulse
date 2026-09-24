from clustering.assignment import cluster_update_fields, find_matching_cluster
from clustering.keywords import build_cluster_label, calculate_similarity, tokenize_article


# ---------------------------------------------------------------------------
# Tokenization
# ---------------------------------------------------------------------------

def test_tokenization_removes_stop_words():
    tokens = tokenize_article("The Council Approves Transit Plan", "The plan is approved by the city")
    assert "council" in tokens
    assert "transit" in tokens
    assert "the" not in tokens
    assert "is" not in tokens
    assert "by" not in tokens


def test_tokenization_returns_set():
    tokens = tokenize_article("Test title", "Test summary")
    assert isinstance(tokens, set)


def test_tokenization_with_empty_inputs_returns_empty_set():
    assert tokenize_article("", "") == set()


def test_tokenization_minimum_token_length():
    # Regex requires at least 3 chars total (1 letter + 2 more)
    tokens = tokenize_article("Go do it", "")
    assert "go" not in tokens  # 2 chars — below minimum
    assert "do" not in tokens


# ---------------------------------------------------------------------------
# Similarity
# ---------------------------------------------------------------------------

def test_similarity_calculates_jaccard_correctly():
    keywords = {"council", "transit", "plan", "approved"}
    shared, similarity = calculate_similarity(keywords, {"council", "transit", "plan", "budget"})
    assert shared == 3
    assert similarity == 0.6  # 3 shared / 5 union


def test_similarity_with_empty_sets_returns_zero():
    shared, similarity = calculate_similarity(set(), {"council", "transit"})
    assert shared == 0
    assert similarity == 0.0

    shared, similarity = calculate_similarity({"council"}, set())
    assert shared == 0
    assert similarity == 0.0


def test_similarity_with_identical_sets():
    keywords = {"council", "transit", "plan"}
    shared, similarity = calculate_similarity(keywords, keywords)
    assert shared == 3
    assert similarity == 1.0


# ---------------------------------------------------------------------------
# Cluster matching
# ---------------------------------------------------------------------------

def test_cluster_match_returns_best_matching_cluster():
    keywords = {"council", "transit", "plan", "approved"}
    cluster = {"_id": "cluster-1", "representativeKeywords": ["council", "transit", "plan", "budget"]}
    result = find_matching_cluster(keywords, [cluster], min_shared_keywords=3, min_similarity=0.2)
    assert result == cluster


def test_cluster_match_returns_none_when_below_shared_keyword_threshold():
    keywords = {"council", "transit", "plan", "approved"}
    cluster = {"_id": "cluster-1", "representativeKeywords": ["council", "transit"]}  # only 2 shared
    result = find_matching_cluster(keywords, [cluster], min_shared_keywords=3, min_similarity=0.2)
    assert result is None


def test_cluster_match_returns_none_when_below_similarity_threshold():
    # 3 shared but very large union → low Jaccard
    keywords = {"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"}
    cluster = {"_id": "cluster-1", "representativeKeywords": ["a", "b", "c", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w"]}
    result = find_matching_cluster(keywords, [cluster], min_shared_keywords=3, min_similarity=0.5)
    assert result is None


def test_cluster_match_returns_none_for_empty_cluster_list():
    keywords = {"council", "transit", "plan"}
    result = find_matching_cluster(keywords, [], min_shared_keywords=3, min_similarity=0.2)
    assert result is None


def test_cluster_match_picks_best_when_multiple_candidates():
    keywords = {"council", "transit", "plan", "approved"}
    weak = {"_id": "weak", "representativeKeywords": ["council", "transit", "plan", "other1", "other2", "other3", "other4", "other5"]}
    strong = {"_id": "strong", "representativeKeywords": ["council", "transit", "plan", "approved"]}
    result = find_matching_cluster(keywords, [weak, strong], min_shared_keywords=3, min_similarity=0.2)
    assert result["_id"] == "strong"


# ---------------------------------------------------------------------------
# Cluster label generation
# ---------------------------------------------------------------------------

def test_build_cluster_label_returns_top_words_title_cased():
    counts = {"transit": 5, "council": 4, "plan": 3, "budget": 2}
    label = build_cluster_label(counts, max_words=3)
    assert label == "Transit Council Plan"


def test_build_cluster_label_with_empty_counts_returns_fallback():
    assert build_cluster_label({}, max_words=3) == "Uncategorized Topic"


def test_build_cluster_label_respects_max_words():
    counts = {"a": 5, "b": 4, "c": 3, "d": 2, "e": 1}
    label = build_cluster_label(counts, max_words=2)
    assert label == "A B"


# ---------------------------------------------------------------------------
# Cluster update fields
# ---------------------------------------------------------------------------

def test_cluster_update_fields_increments_article_count():
    initial = {"articleCount": 0, "keywordCounts": {}, "representativeKeywords": [], "sources": []}
    article = {"source": "BBC News", "publishedAt": None}
    fields = cluster_update_fields(initial, article, {"transit", "plan"}, max_label_words=3)
    assert fields["articleCount"] == 1


def test_cluster_update_fields_accumulates_keyword_counts():
    initial = {"articleCount": 1, "keywordCounts": {"transit": 1}, "representativeKeywords": ["transit"], "sources": []}
    article = {"source": "NPR", "publishedAt": None}
    fields = cluster_update_fields(initial, article, {"transit", "plan"}, max_label_words=3)
    assert fields["keywordCounts"]["transit"] == 2
    assert fields["keywordCounts"]["plan"] == 1


def test_cluster_update_fields_tracks_sources():
    initial = {"articleCount": 0, "keywordCounts": {}, "representativeKeywords": [], "sources": ["BBC News"]}
    article = {"source": "NPR", "publishedAt": None}
    fields = cluster_update_fields(initial, article, set(), max_label_words=3)
    assert "BBC News" in fields["sources"]
    assert "NPR" in fields["sources"]


def test_cluster_update_fields_tracks_date_range():
    initial = {
        "articleCount": 1,
        "keywordCounts": {},
        "representativeKeywords": [],
        "sources": [],
        "earliestPublishedAt": "2024-03-01T00:00:00Z",
        "latestPublishedAt": "2024-03-01T00:00:00Z",
    }
    article = {"source": "NPR", "publishedAt": "2024-03-05T00:00:00Z"}
    fields = cluster_update_fields(initial, article, set(), max_label_words=3)
    assert fields["earliestPublishedAt"] == "2024-03-01T00:00:00Z"
    assert fields["latestPublishedAt"] == "2024-03-05T00:00:00Z"

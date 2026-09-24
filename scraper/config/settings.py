import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/news_pulse")
    mongodb_database: str = os.getenv("MONGODB_DATABASE", "news_pulse")
    rss_request_timeout_seconds: int = int(os.getenv("RSS_REQUEST_TIMEOUT_SECONDS", "15"))
    extraction_timeout_seconds: int = int(os.getenv("EXTRACTION_TIMEOUT_SECONDS", "20"))
    request_delay_seconds: float = float(os.getenv("REQUEST_DELAY_SECONDS", "0.3"))
    min_shared_keywords: int = int(os.getenv("MIN_SHARED_KEYWORDS", "3"))
    min_jaccard_similarity: float = float(os.getenv("MIN_JACCARD_SIMILARITY", "0.20"))
    max_cluster_label_words: int = int(os.getenv("MAX_CLUSTER_LABEL_WORDS", "3"))


settings = Settings()

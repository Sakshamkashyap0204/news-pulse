import argparse
import logging
import sys
import uuid
from datetime import UTC, datetime

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

from clustering.assignment import cluster_update_fields, find_matching_cluster
from clustering.keywords import tokenize_article
from config.feeds import FEED_SOURCES
from config.settings import settings
from database.repository import NewsRepository
from deduplication.identity import build_article_identity
from extraction.content import extract_article_content
from feeds.parser import parse_feed
from normalization.article import normalize_article
from utils.logging import configure_logging

LOGGER = logging.getLogger(__name__)


def process_article(repository: NewsRepository, raw_entry, source, clusters: list[dict], stats: dict) -> None:
    article = normalize_article(raw_entry, source.name, source.identifier)
    if not article:
        stats["skipped"] += 1
        return

    article["identityKey"] = build_article_identity(article)
    if repository.article_exists(article["identityKey"]):
        stats["duplicates"] += 1
        return

    extraction = extract_article_content(article["url"], settings.extraction_timeout_seconds, settings.request_delay_seconds)
    article["content"] = extraction["content"] or article["rssContent"]
    article["extraction"] = {"status": extraction["status"], "error": extraction["error"]}
    article["clusteringText"] = " ".join(value for value in (article["title"], article["summary"], article["content"]) if value)
    keywords = tokenize_article(article["title"], article["summary"], article["content"])
    article["keywords"] = sorted(keywords)
    article["ingestedAt"] = datetime.now(UTC)

    matching_cluster = find_matching_cluster(
        keywords, clusters, settings.min_shared_keywords, settings.min_jaccard_similarity
    )
    if matching_cluster:
        fields = cluster_update_fields(matching_cluster, article, keywords, settings.max_cluster_label_words)
        repository.update_cluster(matching_cluster["_id"], fields)
        matching_cluster.update(fields)
        cluster = matching_cluster
    else:
        cluster = repository.create_cluster(article, keywords, settings.max_cluster_label_words)
        clusters.append(cluster)

    article["clusterId"] = cluster["_id"]
    try:
        repository.save_article(article)
        stats["inserted"] += 1
        LOGGER.info("Saved article '%s' in cluster '%s'", article["title"][:80], cluster["label"])
    except DuplicateKeyError:
        # A second concurrent process may insert after the preliminary lookup.
        stats["duplicates"] += 1


def run_ingestion(job_id: str) -> dict:
    client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=10_000)
    client.admin.command("ping")
    repository = NewsRepository(client, settings.mongodb_database)
    repository.ensure_indexes()
    repository.mark_job_running(job_id)
    stats = {"feedsProcessed": 0, "discovered": 0, "inserted": 0, "duplicates": 0, "skipped": 0}

    try:
        clusters = repository.get_clusters()
        for source in FEED_SOURCES:
            entries = parse_feed(source, settings.rss_request_timeout_seconds)
            stats["feedsProcessed"] += 1
            stats["discovered"] += len(entries)
            for entry in entries:
                try:
                    process_article(repository, entry, source, clusters, stats)
                except Exception as error:
                    stats["skipped"] += 1
                    LOGGER.warning("Skipping malformed article from %s: %s", source.name, error)
        repository.complete_job(job_id, stats)
        LOGGER.info("Ingestion job %s completed: %s", job_id, stats)
        return stats
    except Exception as error:
        repository.fail_job(job_id, str(error))
        LOGGER.exception("Ingestion job %s failed", job_id)
        raise
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest RSS articles into News Pulse.")
    parser.add_argument("--job-id", default=str(uuid.uuid4()), help="Existing ingestion job ID created by the API")
    arguments = parser.parse_args()
    try:
        run_ingestion(arguments.job_id)
        return 0
    except Exception as error:
        print(f"Ingestion failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    configure_logging()
    raise SystemExit(main())

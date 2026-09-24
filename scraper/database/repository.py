from datetime import UTC, datetime

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING, MongoClient


class NewsRepository:
    def __init__(self, client: MongoClient, database_name: str):
        database = client[database_name]
        self.articles = database["articles"]
        self.clusters = database["clusters"]
        self.jobs = database["ingestion_jobs"]

    def ensure_indexes(self) -> None:
        self.articles.create_index([("identityKey", ASCENDING)], unique=True)
        self.articles.create_index([("clusterId", ASCENDING), ("publishedAt", ASCENDING)])
        self.articles.create_index([("source", ASCENDING), ("publishedAt", DESCENDING)])
        self.clusters.create_index([("latestPublishedAt", DESCENDING)])
        self.jobs.create_index([("status", ASCENDING), ("startedAt", DESCENDING)])

    def article_exists(self, identity_key: str) -> bool:
        return self.articles.find_one({"identityKey": identity_key}, {"_id": 1}) is not None

    def get_clusters(self) -> list[dict]:
        return list(self.clusters.find().sort("latestPublishedAt", DESCENDING))

    def create_cluster(self, article: dict, keywords: set[str], max_label_words: int) -> dict:
        from clustering.assignment import cluster_update_fields

        now = datetime.now(UTC)
        initial = {"articleCount": 0, "keywordCounts": {}, "representativeKeywords": [], "sources": []}
        fields = cluster_update_fields(initial, article, keywords, max_label_words)
        cluster = {**fields, "createdAt": now, "updatedAt": now}
        inserted = self.clusters.insert_one(cluster)
        cluster["_id"] = inserted.inserted_id
        return cluster

    def update_cluster(self, cluster_id: ObjectId, fields: dict) -> None:
        self.clusters.update_one({"_id": cluster_id}, {"$set": {**fields, "updatedAt": datetime.now(UTC)}})

    def save_article(self, article: dict) -> None:
        now = datetime.now(UTC)
        article["createdAt"] = now
        article["updatedAt"] = now
        self.articles.insert_one(article)

    def mark_job_running(self, job_id: str) -> None:
        now = datetime.now(UTC)
        self.jobs.update_one(
            {"_id": job_id},
            {"$set": {"status": "running", "startedAt": now, "error": None}, "$setOnInsert": {"createdAt": now, "stats": {}}},
            upsert=True,
        )

    def complete_job(self, job_id: str, stats: dict) -> None:
        self.jobs.update_one(
            {"_id": job_id},
            {"$set": {"status": "completed", "completedAt": datetime.now(UTC), "stats": stats, "error": None}},
        )

    def fail_job(self, job_id: str, error: str) -> None:
        self.jobs.update_one(
            {"_id": job_id},
            {"$set": {"status": "failed", "completedAt": datetime.now(UTC), "error": error[:500]}},
        )

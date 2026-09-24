"""One-time script to resync cluster articleCount and sources from actual articles."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient
from config.settings import settings

client = MongoClient(settings.mongodb_uri)
db = client[settings.mongodb_database]

pipeline = [
    {"$group": {
        "_id": "$clusterId",
        "count": {"$sum": 1},
        "sources": {"$addToSet": "$source"},
        "earliest": {"$min": "$publishedAt"},
        "latest": {"$max": "$publishedAt"},
    }}
]

updated = 0
for row in db.articles.aggregate(pipeline):
    if row["_id"] is None:
        continue
    db.clusters.update_one(
        {"_id": row["_id"]},
        {"$set": {
            "articleCount": row["count"],
            "sources": sorted(row["sources"]),
            "earliestPublishedAt": row["earliest"],
            "latestPublishedAt": row["latest"],
        }}
    )
    updated += 1

print(f"Resynced {updated} clusters.")
client.close()

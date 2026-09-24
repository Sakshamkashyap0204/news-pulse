const { ObjectId } = require("mongodb");

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapArticle(article) {
  return {
    id: article._id.toString(),
    title: article.title,
    source: article.source,
    publishedAt: toIso(article.publishedAt),
    url: article.url,
    summary: article.summary,
    extractionStatus: article.extraction?.status || "unknown",
  };
}

function mapCluster(cluster) {
  return {
    id: cluster._id.toString(),
    label: cluster.label,
    articleCount: cluster.articleCount,
    earliestPublishedAt: toIso(cluster.earliestPublishedAt),
    latestPublishedAt: toIso(cluster.latestPublishedAt),
    sources: cluster.sources || [],
  };
}

function createClusterService(database) {
  const clusters = database.collection("clusters");
  const articles = database.collection("articles");

  async function listClusters() {
    const records = await clusters.find().sort({ latestPublishedAt: -1 }).toArray();
    return records.map(mapCluster);
  }

  async function getCluster(id) {
    if (!ObjectId.isValid(id)) return { invalidId: true };
    const cluster = await clusters.findOne({ _id: new ObjectId(id) });
    if (!cluster) return null;
    const records = await articles.find({ clusterId: cluster._id }).sort({ publishedAt: 1, createdAt: 1 }).toArray();
    return { ...mapCluster(cluster), keywords: cluster.representativeKeywords || [], articles: records.map(mapArticle) };
  }

  async function getTimeline() {
    const [clusterRecords, articleRecords] = await Promise.all([
      clusters.find().sort({ latestPublishedAt: -1 }).toArray(),
      articles.find({}, { projection: { clusterId: 1, source: 1, publishedAt: 1 } }).toArray(),
    ]);
    const articlesByCluster = new Map();
    for (const article of articleRecords) {
      const key = article.clusterId?.toString();
      if (!key) continue;
      if (!articlesByCluster.has(key)) articlesByCluster.set(key, []);
      articlesByCluster.get(key).push({ source: article.source, publishedAt: toIso(article.publishedAt) });
    }
    return clusterRecords.map((cluster) => ({
      ...mapCluster(cluster),
      start: toIso(cluster.earliestPublishedAt),
      end: toIso(cluster.latestPublishedAt),
      intensity: Math.min(5, Math.max(1, cluster.articleCount || 1)),
      articles: articlesByCluster.get(cluster._id.toString()) || [],
    }));
  }

  return { listClusters, getCluster, getTimeline };
}

module.exports = { createClusterService };

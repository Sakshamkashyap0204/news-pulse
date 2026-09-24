export type TimelineArticle = { source: string; publishedAt: string | null };

export type TimelineCluster = {
  id: string;
  label: string;
  articleCount: number;
  earliestPublishedAt: string | null;
  latestPublishedAt: string | null;
  start: string | null;
  end: string | null;
  intensity: number;
  sources: string[];
  articles: TimelineArticle[];
};

export type ClusterArticle = {
  id: string;
  title: string;
  source: string;
  publishedAt: string | null;
  url: string;
  summary: string;
  extractionStatus: string;
};

export type ClusterDetail = Omit<TimelineCluster, "start" | "end" | "intensity" | "articles"> & {
  keywords: string[];
  articles: ClusterArticle[];
};

export type IngestionJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  stats: Record<string, number>;
  error: string | null;
};

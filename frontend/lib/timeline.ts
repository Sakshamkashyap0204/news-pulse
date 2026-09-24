import { TimelineCluster } from "./types";

export type PositionedCluster = TimelineCluster & { startMs: number; endMs: number; lane: number; left: number; width: number };

function toTime(value: string | null) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

export function filterTimelineBySources(clusters: TimelineCluster[], selectedSources: string[]) {
  if (!selectedSources.length) return clusters;
  const selected = new Set(selectedSources);
  return clusters.flatMap((cluster) => {
    const articles = cluster.articles.filter((article) => selected.has(article.source));
    const dates = articles.map((article) => toTime(article.publishedAt)).filter((time): time is number => time !== null);
    if (!articles.length || !dates.length) return [];
    return [{ ...cluster, articles, articleCount: articles.length, sources: [...new Set(articles.map((article) => article.source))], start: new Date(Math.min(...dates)).toISOString(), end: new Date(Math.max(...dates)).toISOString(), intensity: Math.min(5, Math.max(1, articles.length)) }];
  });
}

export function layoutTimeline(clusters: TimelineCluster[]): PositionedCluster[] {
  const records = clusters.flatMap((cluster) => {
    const start = toTime(cluster.start);
    const end = toTime(cluster.end);
    return start === null || end === null ? [] : [{ ...cluster, startMs: start, endMs: Math.max(start, end) }];
  }).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  if (!records.length) return [];

  const minimum = Math.min(...records.map((record) => record.startMs));
  const maximum = Math.max(...records.map((record) => record.endMs));
  const padding = minimum === maximum ? 12 * 60 * 60 * 1000 : Math.max((maximum - minimum) * 0.04, 60 * 60 * 1000);
  const rangeStart = minimum - padding;
  const range = maximum - minimum + padding * 2;
  const laneEnds: number[] = [];

  return records.map((record) => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= record.startMs);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = record.endMs;
    const left = ((record.startMs - rangeStart) / range) * 100;
    const rawWidth = ((record.endMs - record.startMs) / range) * 100;
    return { ...record, lane, left, width: Math.max(3, rawWidth) };
  });
}

export function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "Unknown time";
}

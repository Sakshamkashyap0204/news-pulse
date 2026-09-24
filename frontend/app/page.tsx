"use client";

import { useEffect, useMemo, useState } from "react";
import { ClusterDrawer } from "../components/cluster-drawer";
import { SourceFilter } from "../components/source-filter";
import { Timeline } from "../components/timeline";
import { useIngestionJob } from "../hooks/use-ingestion-job";
import { useTimeline } from "../hooks/use-timeline";
import { getCluster } from "../lib/api";
import { filterTimelineBySources } from "../lib/timeline";
import { ClusterDetail } from "../lib/types";

export default function HomePage() {
  const { timeline, loading, error, reload } = useTimeline();
  const ingestion = useIngestionJob();

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const sources = useMemo(
    () => [...new Set(timeline.flatMap((c) => c.articles.map((a) => a.source)))].sort(),
    [timeline],
  );

  const filteredTimeline = useMemo(
    () => filterTimelineBySources(timeline, selectedSources),
    [timeline, selectedSources],
  );

  // Load cluster detail when a cluster is selected
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setSelectedCluster(null);
    getCluster(selectedId)
      .then(({ cluster }) => { if (!cancelled) setSelectedCluster(cluster); })
      .catch((err) => { if (!cancelled) setDetailError(err instanceof Error ? err.message : "Could not load cluster details."); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function refreshData() {
    try {
      await ingestion.triggerAndWait();
      await reload();
    } catch {
      // The hook surfaces the user-facing error message via ingestion.error
    }
  }

  function clearSelection() {
    setSelectedId(null);
    setSelectedCluster(null);
    setDetailError(null);
  }

  const jobDone = ingestion.job?.status === "completed" || ingestion.job?.status === "failed";

  return (
    <main>
      <header className="site-header">
        <div>
          <p className="eyebrow">Live news intelligence</p>
          <h1>News Pulse</h1>
          <p className="subtitle">A timeline of the stories moving across your selected news sources.</p>
        </div>
        <button className="refresh-button" type="button" onClick={refreshData} disabled={ingestion.active}>
          {ingestion.active ? "Refreshing…" : "Refresh data"}
        </button>
      </header>

      <section className="control-bar">
        <SourceFilter sources={sources} selectedSources={selectedSources} onChange={setSelectedSources} />
        <p className="result-summary">
          {filteredTimeline.length} topic {filteredTimeline.length === 1 ? "cluster" : "clusters"}
        </p>
      </section>

      {ingestion.job && (
        <p className="job-notice" role="status">
          Ingestion job: <strong>{ingestion.job.status}</strong>
          {ingestion.job.status === "completed" && ` · ${ingestion.job.stats.inserted ?? 0} new articles added`}
          {jobDone && (
            <button
              type="button"
              onClick={ingestion.clearJob}
              aria-label="Dismiss job notice"
              style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "1rem", padding: 0 }}
            >
              ×
            </button>
          )}
        </p>
      )}

      {ingestion.error && (
        <p className="error-banner" role="alert">
          Refresh failed: {ingestion.error}
          <button
            type="button"
            onClick={ingestion.clearJob}
            aria-label="Dismiss error"
            style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "1rem", padding: 0 }}
          >
            ×
          </button>
        </p>
      )}

      {loading && (
        <section className="empty-state">
          <h2>Loading timeline…</h2>
          <p>Fetching the latest stored topic clusters.</p>
        </section>
      )}

      {error && (
        <section className="empty-state error-state">
          <h2>Could not reach News Pulse</h2>
          <p>{error}</p>
          <button type="button" onClick={reload}>Try again</button>
        </section>
      )}

      {!loading && !error && (
        <>
          <Timeline clusters={filteredTimeline} selectedId={selectedId} onSelect={setSelectedId} />
          <p className="timeline-scroll-hint">← Scroll to explore the full timeline →</p>
        </>
      )}

      <ClusterDrawer cluster={selectedCluster} loading={detailLoading} error={detailError} onClose={clearSelection} />
    </main>
  );
}

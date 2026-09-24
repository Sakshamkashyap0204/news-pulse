"use client";

import { useState, useMemo } from "react";
import { formatDate, layoutTimeline } from "../lib/timeline";
import { TimelineCluster } from "../lib/types";

type SortOrder = "newest" | "oldest" | "largest";

type Props = {
  clusters: TimelineCluster[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const SOURCE_COLORS: Record<string, string> = {
  "BBC News": "#c0392b",
  "NPR": "#2e7d32",
  "The Guardian": "#1565c0",
};

function getSourceColor(source: string) {
  return SOURCE_COLORS[source] ?? "#5d6c81";
}

function MiniTimeline({ clusters }: { clusters: TimelineCluster[] }) {
  const positioned = layoutTimeline(clusters);
  if (!positioned.length) return null;
  const laneCount = Math.max(...positioned.map((c) => c.lane)) + 1;

  return (
    <div className="mini-timeline" aria-hidden="true">
      <div
        className="mini-timeline-canvas"
        style={{ height: `${laneCount * 18 + 12}px` }}
      >
        {positioned.map((cluster) => (
          <div
            key={cluster.id}
            className="mini-cluster-bar"
            style={{
              left: `${cluster.left}%`,
              width: `${Math.max(1.5, cluster.width)}%`,
              top: `${6 + cluster.lane * 18}px`,
              opacity: 0.55 + cluster.intensity * 0.09,
            }}
            title={cluster.label}
          />
        ))}
      </div>
      <div className="mini-timeline-labels">
        <span>Earlier</span>
        <span>Later</span>
      </div>
    </div>
  );
}

export function Timeline({ clusters, selectedId, onSelect }: Props) {
  const [sort, setSort] = useState<SortOrder>("newest");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? clusters.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.sources.some((s) => s.toLowerCase().includes(q)),
        )
      : clusters;
  }, [clusters, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "newest") copy.sort((a, b) => new Date(b.latestPublishedAt ?? 0).getTime() - new Date(a.latestPublishedAt ?? 0).getTime());
    if (sort === "oldest") copy.sort((a, b) => new Date(a.earliestPublishedAt ?? 0).getTime() - new Date(b.earliestPublishedAt ?? 0).getTime());
    if (sort === "largest") copy.sort((a, b) => b.articleCount - a.articleCount);
    return copy;
  }, [filtered, sort]);

  if (!clusters.length) {
    return (
      <div className="empty-state">
        <h2>No matching news activity</h2>
        <p>Try selecting another source, or refresh the feed data.</p>
      </div>
    );
  }

  return (
    <section className="timeline-section" aria-label="Topic activity timeline">
      {/* Mini overview timeline at the top */}
      <MiniTimeline clusters={clusters} />

      {/* Toolbar */}
      <div className="timeline-toolbar">
        <div className="timeline-search-wrap">
          <svg className="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            className="timeline-search"
            type="search"
            placeholder="Search clusters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search topic clusters"
          />
          {search && (
            <button
              className="search-clear"
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="sort-group" role="group" aria-label="Sort clusters">
          <span className="sort-label">Sort:</span>
          {(["newest", "oldest", "largest"] as SortOrder[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`sort-btn ${sort === option ? "active" : ""}`}
              onClick={() => setSort(option)}
            >
              {option === "newest" ? "Newest" : option === "oldest" ? "Oldest" : "Most articles"}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="cluster-count" role="status">
        {sorted.length === clusters.length
          ? `${clusters.length} topic cluster${clusters.length === 1 ? "" : "s"}`
          : `${sorted.length} of ${clusters.length} clusters`}
      </p>

      {sorted.length === 0 && (
        <div className="empty-state" style={{ borderRadius: 12 }}>
          <h2>No clusters match "{search}"</h2>
          <p>Try a different keyword or clear the search.</p>
        </div>
      )}

      {/* Cluster cards */}
      <ol className="cluster-list" aria-label="Topic clusters">
        {sorted.map((cluster) => {
          const isSelected = selectedId === cluster.id;
          const spanMs =
            cluster.latestPublishedAt && cluster.earliestPublishedAt
              ? new Date(cluster.latestPublishedAt).getTime() -
                new Date(cluster.earliestPublishedAt).getTime()
              : 0;
          const spanHours = Math.round(spanMs / 3_600_000);

          return (
            <li key={cluster.id}>
              <button
                type="button"
                className={`cluster-card intensity-${cluster.intensity} ${isSelected ? "selected" : ""}`}
                onClick={() => onSelect(cluster.id)}
                aria-pressed={isSelected}
              >
                {/* Left accent bar showing intensity */}
                <div className="card-accent" aria-hidden="true" />

                <div className="card-body">
                  {/* Top row: label + article count badge */}
                  <div className="card-top">
                    <span className="card-label">{cluster.label}</span>
                    <span className="card-badge" aria-label={`${cluster.articleCount} articles`}>
                      {cluster.articleCount}
                      <span className="badge-unit"> art.</span>
                    </span>
                  </div>

                  {/* Time range row */}
                  <div className="card-time">
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="time-icon">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span>{formatDate(cluster.earliestPublishedAt)}</span>
                    {spanHours > 0 && (
                      <>
                        <span className="time-arrow">→</span>
                        <span>{formatDate(cluster.latestPublishedAt)}</span>
                        <span className="time-span">({spanHours}h span)</span>
                      </>
                    )}
                  </div>

                  {/* Source pills */}
                  <div className="card-sources">
                    {cluster.sources.map((source) => (
                      <span
                        key={source}
                        className="source-pill"
                        style={{ "--pill-color": getSourceColor(source) } as React.CSSProperties}
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right chevron */}
                <svg className="card-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

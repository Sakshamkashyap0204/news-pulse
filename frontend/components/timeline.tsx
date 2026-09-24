"use client";

import { formatDate, layoutTimeline } from "../lib/timeline";
import { TimelineCluster } from "../lib/types";

type Props = { clusters: TimelineCluster[]; selectedId: string | null; onSelect: (id: string) => void };

export function Timeline({ clusters, selectedId, onSelect }: Props) {
  const positioned = layoutTimeline(clusters);
  if (!positioned.length) return <div className="empty-state"><h2>No matching news activity</h2><p>Try selecting another source, or refresh the feed data.</p></div>;
  const laneCount = Math.max(...positioned.map((cluster) => cluster.lane)) + 1;
  return <section className="timeline-card" aria-label="Topic activity timeline">
    <div className="timeline-key"><span>Earlier</span><span>Topic activity window</span><span>Later</span></div>
    <div className="timeline-canvas" style={{ minHeight: `${laneCount * 86 + 62}px` }}>
      <div className="timeline-axis" />
      {positioned.map((cluster) => <button key={cluster.id} type="button" className={`timeline-cluster intensity-${cluster.intensity} ${selectedId === cluster.id ? "selected" : ""}`} style={{ left: `${cluster.left}%`, width: `${cluster.width}%`, top: `${32 + cluster.lane * 86}px` }} onClick={() => onSelect(cluster.id)} aria-pressed={selectedId === cluster.id}>
        <span className="cluster-label">{cluster.label}</span><span className="cluster-meta">{cluster.articleCount} article{cluster.articleCount === 1 ? "" : "s"} · {formatDate(cluster.start)}</span>
      </button>)}
    </div>
  </section>;
}

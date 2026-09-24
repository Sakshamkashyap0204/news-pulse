"use client";

import { useEffect } from "react";
import { formatDate } from "../lib/timeline";
import { ClusterDetail } from "../lib/types";

type Props = { cluster: ClusterDetail | null; loading: boolean; error: string | null; onClose: () => void };

export function ClusterDrawer({ cluster, loading, error, onClose }: Props) {
  useEffect(() => {
    if (!cluster && !loading && !error) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cluster, loading, error, onClose]);

  if (!cluster && !loading && !error) return null;

  return (
    <aside className="cluster-drawer" aria-label="Cluster details">
      <button className="drawer-close" type="button" onClick={onClose} aria-label="Close cluster details">×</button>
      {loading && <p className="drawer-state">Loading cluster details…</p>}
      {error && <p className="drawer-state error-text">{error}</p>}
      {cluster && (
        <>
          <p className="eyebrow">Topic cluster</p>
          <h2>{cluster.label}</h2>
          <p className="drawer-range">
            {cluster.articleCount} {cluster.articleCount === 1 ? "article" : "articles"} · {formatDate(cluster.earliestPublishedAt)} — {formatDate(cluster.latestPublishedAt)}
          </p>
          {cluster.keywords.length > 0 && (
            <div className="keywords">
              {cluster.keywords.slice(0, 8).map((keyword) => <span key={keyword}>{keyword}</span>)}
            </div>
          )}
          <ol className="article-list">
            {cluster.articles.map((article) => (
              <li key={article.id}>
                <p className="article-meta">{article.source} · {formatDate(article.publishedAt)}</p>
                <a href={article.url} target="_blank" rel="noreferrer">
                  {article.title}<span aria-hidden="true"> ↗</span>
                </a>
                {article.summary && <p>{article.summary}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
    </aside>
  );
}

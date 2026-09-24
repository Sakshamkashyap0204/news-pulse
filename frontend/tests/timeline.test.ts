import { describe, expect, it } from "vitest";
import { filterTimelineBySources, formatDate, layoutTimeline } from "../lib/timeline";
import type { TimelineCluster } from "../lib/types";

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const cluster: TimelineCluster = {
  id: "cluster-1",
  label: "Transit Plan",
  articleCount: 2,
  earliestPublishedAt: "2024-03-01T10:00:00Z",
  latestPublishedAt: "2024-03-02T10:00:00Z",
  start: "2024-03-01T10:00:00Z",
  end: "2024-03-02T10:00:00Z",
  intensity: 2,
  sources: ["BBC News", "NPR"],
  articles: [
    { source: "BBC News", publishedAt: "2024-03-01T10:00:00Z" },
    { source: "NPR", publishedAt: "2024-03-02T10:00:00Z" },
  ],
};

// ---------------------------------------------------------------------------
// filterTimelineBySources
// ---------------------------------------------------------------------------

describe("filterTimelineBySources", () => {
  it("returns all clusters when no sources are selected", () => {
    const result = filterTimelineBySources([cluster], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("cluster-1");
  });

  it("recalculates a cluster span for a single selected source", () => {
    const filtered = filterTimelineBySources([cluster], ["NPR"]);
    expect(filtered[0].articleCount).toBe(1);
    expect(filtered[0].start).toBe("2024-03-02T10:00:00.000Z");
  });

  it("removes a cluster entirely when no articles match the selected source", () => {
    const result = filterTimelineBySources([cluster], ["Reuters"]);
    expect(result).toHaveLength(0);
  });

  it("keeps all articles when all sources are selected", () => {
    const result = filterTimelineBySources([cluster], ["BBC News", "NPR"]);
    expect(result[0].articleCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// layoutTimeline
// ---------------------------------------------------------------------------

describe("layoutTimeline", () => {
  it("places overlapping clusters in separate lanes", () => {
    const second = { ...cluster, id: "cluster-2", start: "2024-03-01T12:00:00Z", end: "2024-03-03T10:00:00Z" };
    const positioned = layoutTimeline([cluster, second]);
    expect(positioned[0].lane).not.toBe(positioned[1].lane);
  });

  it("places non-overlapping clusters in the same lane", () => {
    const second = { ...cluster, id: "cluster-2", start: "2024-03-03T00:00:00Z", end: "2024-03-04T00:00:00Z" };
    const positioned = layoutTimeline([cluster, second]);
    expect(positioned[0].lane).toBe(positioned[1].lane);
  });

  it("returns an empty array for an empty input", () => {
    expect(layoutTimeline([])).toHaveLength(0);
  });

  it("handles a single cluster without error", () => {
    const positioned = layoutTimeline([cluster]);
    expect(positioned).toHaveLength(1);
    expect(positioned[0].lane).toBe(0);
    expect(positioned[0].left).toBeGreaterThanOrEqual(0);
    expect(positioned[0].width).toBeGreaterThan(0);
  });

  it("silently excludes clusters with null start or end", () => {
    const nullDates = { ...cluster, id: "cluster-null", start: null, end: null };
    const positioned = layoutTimeline([cluster, nullDates]);
    expect(positioned).toHaveLength(1);
    expect(positioned[0].id).toBe("cluster-1");
  });

  it("enforces a minimum width of 3% for very short clusters", () => {
    // A cluster spanning 1 second in a 24-hour range would be < 0.01% wide
    const tiny = { ...cluster, id: "tiny", start: "2024-03-01T10:00:00Z", end: "2024-03-01T10:00:01Z" };
    const wide = { ...cluster, id: "wide", start: "2024-03-01T00:00:00Z", end: "2024-03-02T00:00:00Z" };
    const positioned = layoutTimeline([tiny, wide]);
    const tinyPositioned = positioned.find((c) => c.id === "tiny");
    expect(tinyPositioned?.width).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("returns 'Unknown time' for null", () => {
    expect(formatDate(null)).toBe("Unknown time");
  });

  it("returns a non-empty string for a valid ISO date", () => {
    const result = formatDate("2024-03-12T10:30:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("Unknown time");
  });
});

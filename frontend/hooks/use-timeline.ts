"use client";

import { useCallback, useEffect, useState } from "react";
import { getTimeline } from "../lib/api";
import { TimelineCluster } from "../lib/types";

export function useTimeline() {
  const [timeline, setTimeline] = useState<TimelineCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setTimeline((await getTimeline()).timeline); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load timeline data."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  return { timeline, loading, error, reload };
}

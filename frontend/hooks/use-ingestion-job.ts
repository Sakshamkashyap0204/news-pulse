"use client";

import { useCallback, useState } from "react";
import { getIngestionJob, triggerIngestion } from "../lib/api";
import { IngestionJob } from "../lib/types";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 100;

export function useIngestionJob() {
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const triggerAndWait = useCallback(async () => {
    setError(null);
    setActive(true);
    try {
      let currentJob = (await triggerIngestion()).job;
      setJob(currentJob);
      for (let poll = 0; poll < MAX_POLLS; poll += 1) {
        if (currentJob.status === "completed") return currentJob;
        if (currentJob.status === "failed") throw new Error(currentJob.error || "Ingestion failed.");
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
        currentJob = (await getIngestionJob(currentJob.id)).job;
        setJob(currentJob);
      }
      throw new Error("Ingestion is taking longer than five minutes. Check the backend job status.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh news data.";
      setError(message);
      throw error;
    } finally {
      setActive(false);
    }
  }, []);

  const clearJob = useCallback(() => {
    setJob(null);
    setError(null);
  }, []);

  return { job, error, active, triggerAndWait, clearJob };
}

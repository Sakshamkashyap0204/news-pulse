import { ClusterDetail, IngestionJob, TimelineCluster } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal, headers: { "Content-Type": "application/json", ...options?.headers } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || "The API request failed.");
    return payload.data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The API request timed out.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export const getTimeline = () => request<{ timeline: TimelineCluster[] }>("/timeline");
export const getCluster = (id: string) => request<{ cluster: ClusterDetail }>(`/clusters/${id}`);
export const triggerIngestion = () => request<{ job: IngestionJob }>("/ingest/trigger", { method: "POST" });
export const getIngestionJob = (id: string) => request<{ job: IngestionJob }>(`/ingest/status/${id}`);

import { isActive } from "../services/publicationGeneration";
import type { GenerationJob } from "../types/publicationGeneration";

// Preserve sub-millisecond database precision when creation instants tie in JS.
const fraction = (timestamp: string) => (timestamp.match(/\.(\d+)/)?.[1] ?? "").padEnd(9, "0");

export function selectGenerationJob(jobs: GenerationJob[]): GenerationJob | undefined {
  return jobs.reduce<GenerationJob | undefined>((selected, job) => {
    if (!selected) return job;
    if (isActive(job) !== isActive(selected)) return isActive(job) ? job : selected;
    // Immediate RPC summaries have no creation date. Prefer the last accepted
    // submission until restoration supplies server time; never invent a date.
    if (!job.createdAt) return job;
    if (!selected.createdAt) return selected;
    const time = Date.parse(job.createdAt) - Date.parse(selected.createdAt);
    const precision = fraction(job.createdAt).localeCompare(fraction(selected.createdAt));
    return (time || precision || job.jobId.localeCompare(selected.jobId)) > 0 ? job : selected;
  }, undefined);
}

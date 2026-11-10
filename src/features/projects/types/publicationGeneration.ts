import type { GenerationAttempt } from "./publicationGenerationDiagnostics";

export type GenerationRequest = {
  projectId: string;
  action: "start" | "retry_failed";
  requestId: string;
  jobId?: string;
};

export type SlotState = "queued" | "running" | "succeeded" | "failed";
export type JobStatus = SlotState | "partial";
export type GenerationIssue = { code: string; uncertain?: boolean };
export type GenerationSlot = {
  slot: number;
  state: SlotState;
  attempts: number;
  previewId: string | null;
  errorCode: string | null;
  retryable: boolean;
  actualModel: string | null;
  attemptDiagnostics?: GenerationAttempt[];
};
export type GenerationJob = {
  jobId: string;
  projectId: string;
  status: JobStatus;
  total: number;
  retryCount: number;
  updatedAt: string;
  requestedModel: string;
  promptVersion: string;
  succeeded: number;
  failed: number;
  pending: number;
  canRetry: boolean;
  slots: GenerationSlot[];
  // Jobs and slots are separate SELECTs: don't announce a torn snapshot as settled.
  consistent: boolean;
};

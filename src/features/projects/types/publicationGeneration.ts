import type { GenerationAttempt } from "./publicationGenerationDiagnostics";

export type GenerationConfiguration = {
  publicationsCount: number;
  requiresAI: boolean;
  promptId: string | null;
};

export type GenerationRequest = {
  projectId: string;
  action: "start" | "retry_failed";
  requestId: string;
  jobId?: string;
  // Missing only for pre-modal receipts or retries; never a new start.
  configuration?: GenerationConfiguration;
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
  // Present on database reads; existing start/retry/replay summaries omit it.
  createdAt?: string;
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

export type PersistedGenerationJob = GenerationJob & { createdAt: string };

export type GenerationHistoryPage = {
  jobs: PersistedGenerationJob[];
  // One-based; page size is fixed, not caller-configurable.
  page: number;
  pageSize: 10;
  totalCount: number;
};

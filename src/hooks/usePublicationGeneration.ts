import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateProjectPreview } from "@/redux/actions/ProjectActions";
import {
  acknowledgeGenerationRequest, isActive, outstandingRequests, prepareGenerationRequest,
  readGenerationJob, restoreGenerationJobs, safeGenerationIssue,
} from "@/features/projects/services/publicationGeneration";
import type { GenerationConfiguration, GenerationIssue, GenerationJob, GenerationRequest } from "@/features/projects/types/publicationGeneration";

type View = {
  actor: string;
  jobs: GenerationJob[];
  requests: GenerationRequest[];
  issues: Record<string, GenerationIssue>;
  busy: string[];
  readIssue?: GenerationIssue;
  loading: boolean;
};
type Session = {
  actor: string;
  alive: boolean;
  authorized: boolean;
  busy: Set<string>;
  jobs: GenerationJob[];
  revision: number;
  signal: AbortSignal;
  refresh: () => void;
  accept: (jobs: GenerationJob[]) => void;
};
const empty = (actor = ""): View => ({ actor, jobs: [], requests: [], issues: {}, busy: [], loading: true });

export function usePublicationGeneration(onResultsChanged: () => void) {
  const actor = useAppSelector((state) => state.auth.user?.uid) ?? "";
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>(() => empty());
  const session = useRef<Session | null>(null);
  const notify = useRef(onResultsChanged);
  useEffect(() => { notify.current = onResultsChanged; }, [onResultsChanged]);

  useEffect(() => {
    const controller = new AbortController();
    const context: Session = {
      actor, alive: true, authorized: true, busy: new Set(), jobs: [], revision: 0,
      signal: controller.signal, refresh: () => {}, accept: () => {},
    };
    session.current = context;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reading = false;
    let readAgain = false;
    const signatures = new Map<string, string>();
    // Redux can switch actors before passive-effect cleanup. Check the live store
    // as well as the lifecycle token before acknowledging or showing responses.
    const current = () => context.alive && session.current === context
      && dispatch((_, getState) => getState().auth.user?.uid) === actor;
    const update = (change: Partial<View>) => {
      if (current()) setView((previous) => ({ ...(previous.actor === actor ? previous : empty(actor)), ...change }));
    };
    context.accept = (jobs) => {
      if (!current()) return;
      jobs = jobs.map((job) => {
        const known = context.jobs.find((previous) => previous.jobId === job.jobId);
        return !job.createdAt && known?.createdAt ? { ...job, createdAt: known.createdAt } : job;
      });
      context.jobs = jobs;
      update({ jobs });
      let changed = false;
      for (const job of jobs) {
        if (!job.consistent) continue;
        const signature = JSON.stringify([
          job.slots.map((slot) => slot.previewId).filter(Boolean),
          isActive(job) ? null : job.status,
        ]);
        if ((job.succeeded > 0 || !isActive(job)) && signatures.get(job.jobId) !== signature) changed = true;
        signatures.set(job.jobId, signature);
      }
      if (changed && current()) notify.current();
    };
    const refresh = async () => {
      if (!actor || !current() || !context.authorized) return;
      if (reading) { readAgain = true; return; }
      reading = true;
      clearTimeout(timer);
      const revision = context.revision;
      try {
        const jobs = await restoreGenerationJobs(actor, controller.signal);
        if (!current()) return;
        if (revision === context.revision) {
          context.accept(jobs);
          update({ readIssue: undefined, loading: false });
        } else readAgain = true;
      } catch (error) {
        if (!current()) return;
        const failure = safeGenerationIssue(error);
        if (failure.code === "unauthorized") context.authorized = false;
        update({ readIssue: failure.code === "internal_error" ? { code: "read_failed" } : failure, loading: false });
      } finally {
        reading = false;
        if (current() && context.authorized && (readAgain || context.jobs.some(isActive))) {
          timer = setTimeout(() => { void refresh(); }, readAgain ? 0 : 5000);
        }
        readAgain = false;
      }
    };
    context.refresh = () => { void refresh(); };
    let requests: GenerationRequest[] = [];
    let readIssue: GenerationIssue | undefined;
    if (actor) {
      try { requests = outstandingRequests(actor); } catch (error) { readIssue = safeGenerationIssue(error); }
    }
    // A storage limitation must remain visible even when server restoration succeeds.
    setView({ ...empty(actor), requests, issues: readIssue ? { storage: readIssue } : {}, loading: Boolean(actor) });
    if (actor) void refresh();
    return () => {
      context.alive = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [actor, dispatch]);

  const start = useCallback(async (
    projectId: string, retryJob?: GenerationJob, configuration?: GenerationConfiguration,
  ) => {
    const context = session.current;
    if (!context?.alive || context.actor !== actor || !actor || context.busy.has(projectId)) return;
    if (!context.authorized || dispatch((_, getState) => getState().auth.user?.uid) !== actor) return;
    // Synchronous lock, before storage or the first await, prevents double-click starts.
    context.busy.add(projectId);
    const current = () => context.alive && session.current === context
      && dispatch((_, getState) => getState().auth.user?.uid) === actor;
    const patch = (change: Partial<View>) => {
      if (current()) setView((previous) => ({ ...previous, ...change }));
    };
    let request: GenerationRequest | undefined;
    try {
      let pending = outstandingRequests(actor).find((r) => r.projectId === projectId);
      if (!pending && context.jobs.some((job) => job.projectId === projectId && isActive(job))) return;
      if (retryJob && !pending) {
        patch({ busy: [...context.busy] });
        const [latest, restored] = await Promise.all([
          readGenerationJob(actor, retryJob.jobId, context.signal),
          restoreGenerationJobs(actor, context.signal),
        ]);
        if (!current()) return;
        // A receipt created during validation still wins over a new retry.
        pending = outstandingRequests(actor).find((r) => r.projectId === projectId);
        if (!pending) {
          if (!latest || latest.projectId !== projectId) throw { code: "forbidden" };
          if ([...restored, ...context.jobs].some((job) => job.projectId === projectId && isActive(job))) {
            throw { code: "conflict" };
          }
          if (!latest.canRetry || !latest.consistent) throw { code: "conflict" };
          retryJob = latest;
        }
      }
      request = prepareGenerationRequest(actor, projectId, retryJob, configuration);
      patch({ requests: outstandingRequests(actor), busy: [...context.busy] });
      if (current()) setView((previous) => ({ ...previous, issues: { ...previous.issues, [projectId]: { code: "" } } }));
      const job = await dispatch(updateProjectPreview({ actor, request })).unwrap();
      if (!current()) return; // Keep receipt for replay after navigation/actor switch.
      context.revision++;
      const accepted = !job.createdAt && retryJob?.jobId === job.jobId && retryJob.createdAt
        ? { ...job, createdAt: retryJob.createdAt } : job;
      context.accept([...context.jobs.filter((old) => old.projectId !== projectId), accepted]);
      acknowledgeGenerationRequest(actor, request.requestId);
      patch({ requests: outstandingRequests(actor) });
      context.refresh();
    } catch (error) {
      if (!current()) return;
      let failure = safeGenerationIssue(error);
      if (failure.code === "unauthorized") context.authorized = false;
      // A competing active job may use different settings; restore it, never
      // present those newly selected settings as accepted.
      if (failure.code === "conflict") context.refresh();
      if (request && !failure.uncertain && failure.code !== "storage") {
        try {
          acknowledgeGenerationRequest(actor, request.requestId);
          patch({ requests: outstandingRequests(actor) });
        } catch { failure = { code: "storage" }; }
      }
      setView((previous) => ({ ...previous, issues: { ...previous.issues, [projectId]: failure } }));
    } finally {
      context.busy.delete(projectId);
      patch({ busy: [...context.busy] });
    }
  }, [actor, dispatch]);

  const refresh = useCallback(() => {
    if (session.current?.actor === actor) session.current.refresh();
  }, [actor]);
  // No stale actor data is rendered, even before effect cleanup runs.
  return { ...(view.actor === actor ? view : empty(actor)), start, refresh };
}

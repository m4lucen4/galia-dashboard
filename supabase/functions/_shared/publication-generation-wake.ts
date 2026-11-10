import type { Environment } from "./publication-generation-store.ts";

// Latency optimization only: persisted jobs and cron remain the recovery path.
export async function wakeWorker(env: Environment, fetcher: typeof fetch): Promise<void> {
  try {
    const secret = env("PUBLICATION_GENERATION_WORKER_SECRET");
    const base = env("SUPABASE_URL");
    if (!base || !secret || secret.length !== 64 || !/^[0-9a-f]{64}$/iu.test(secret)) return;
    const target = new URL("/functions/v1/process-publication-generation", base);
    if (target.protocol !== "https:" || target.username || target.password) return;
    const response = await fetcher(target.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Publication-Worker-Secret": secret },
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(145000),
    });
    // Do not expose worker responses or let best-effort failure reject a saved job.
    await response.body?.cancel();
  } catch {
    // Missing configuration, transport failure or shutdown leaves cron in charge.
  }
}

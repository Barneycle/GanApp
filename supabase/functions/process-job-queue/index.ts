import { createClient } from "@supabase/supabase-js";
import { processBatch, processJobById } from "./processJobs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (cronSecret && (auth === cronSecret || cronHeader === cronSecret)) return true;
  if (serviceRole && auth === serviceRole) return true;
  return false;
}

function readJobId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.job_id === "string") return record.job_id;
  const nested = record.record;
  if (nested && typeof nested === "object" && typeof (nested as { id?: unknown }).id === "string") {
    return (nested as { id: string }).id;
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");

  let jobId: string | undefined;
  if (req.method === "POST") {
    try {
      jobId = readJobId(await req.json());
    } catch {
      jobId = undefined;
    }
  }

  try {
    // Webhook: one invocation per job (parallel). Cron: drain one leftover job.
    const summary = jobId
      ? await processJobById(supabase, siteUrl, jobId)
      : await processBatch(supabase, siteUrl, 1);
    return json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker failed";
    console.error("process-job-queue failed", message);
    return json({ ok: false, error: message }, 500);
  }
});

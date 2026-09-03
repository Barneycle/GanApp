/**
 * Queue processors for the Edge Function worker.
 * Mirrors browser job handling (certificates + in-app notifications) using the service role.
 * Does not send email/SMS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCertificatePngPdf } from "./renderCertificate.ts";

function renderErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  try {
    const serialized = JSON.stringify(err);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // ignore
  }
  const text = String(err);
  return text && text !== "[object Object]" ? text : "Unknown render error";
}

export interface JobRow {
  id: string;
  job_type: string;
  job_data: Record<string, unknown>;
  attempts?: number;
  max_attempts?: number;
}

function generateParticipantUserId(participantName: string, eventId: string): string {
  const input = `${eventId}-${participantName.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-${hex.padStart(12, "0")}`;
}

function generateCertificateNumber(eventId: string, userId: string): string {
  const timestamp = Date.now();
  const shortEventId = eventId.substring(0, 8);
  const shortUserId = userId.substring(0, 8);
  return `CERT-${shortEventId}-${shortUserId}-${timestamp}`;
}

async function completeJob(
  supabase: SupabaseClient,
  jobId: string,
  resultData: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc("complete_job", {
    p_job_id: jobId,
    p_result_data: resultData,
  });
  if (error) {
    await supabase.from("job_queue").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result_data: resultData,
    }).eq("id", jobId);
  }
}

async function failJob(
  supabase: SupabaseClient,
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabase.rpc("fail_job", {
    p_job_id: jobId,
    p_error_message: errorMessage,
  });
  if (error) {
    await supabase.from("job_queue").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    }).eq("id", jobId);
  }
}

async function processCertificateJob(
  supabase: SupabaseClient,
  jobData: Record<string, any>,
  siteUrl: string,
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const { eventId, userId, participantName, eventTitle, completionDate, config: providedConfig } = jobData;

  let config = providedConfig;
  if (!config) {
    const { data, error } = await supabase
      .from("certificate_configs")
      .select("*")
      .eq("event_id", eventId)
      .single();
    if (error || !data) {
      return { success: false, error: error?.message || "Certificate config not found" };
    }
    config = data;
  }

  let templateId: string | undefined;
  let actualEventId: string | null = null;
  let certificateUserId = userId;

  if (eventId === "standalone") {
    certificateUserId = generateParticipantUserId(participantName, eventId);
  }

  if (eventId && eventId !== "standalone" && typeof eventId === "string" && eventId.trim() !== "") {
    actualEventId = eventId;
    const { data: templates, error: templateError } = await supabase
      .from("certificate_templates")
      .select("id")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!templateError && templates) {
      templateId = templates.id;
    }
  } else if (eventId === "standalone") {
    const { data: newEvent, error: createEventError } = await supabase
      .from("events")
      .insert({
        title: eventTitle || "Standalone Certificate",
        description: "Event created for standalone certificate generation",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        venue: "Standalone",
        created_by: userId,
        is_active: false,
        event_type: "standalone",
      })
      .select("id")
      .single();
    if (createEventError || !newEvent) {
      return { success: false, error: createEventError?.message || "Failed to create event for standalone certificate" };
    }
    actualEventId = newEvent.id;
    const { data: newTemplate, error: createTemplateError } = await supabase
      .from("certificate_templates")
      .insert({
        event_id: newEvent.id,
        title: "Standalone Certificate Template",
        description: `Template for standalone certificate: ${eventTitle}`,
        template_url: "https://placeholder-url-for-standalone-certificates",
        template_type: "document",
        content_fields: {
          participant_name: "{{name}}",
          event_title: "{{event}}",
          date: "{{date}}",
        },
        requires_attendance: false,
        requires_survey_completion: false,
        is_active: true,
        created_by: userId,
      })
      .select("id")
      .single();
    if (createTemplateError || !newTemplate) {
      return { success: false, error: createTemplateError?.message || "Failed to create certificate template" };
    }
    templateId = newTemplate.id;
  }

  if (actualEventId && eventId !== "standalone") {
    const { data: existingCert, error: existingError } = await supabase
      .from("certificates")
      .select("id, certificate_number, participant_name")
      .eq("event_id", actualEventId)
      .eq("participant_name", String(participantName).trim())
      .maybeSingle();
    if (existingError && existingError.code !== "PGRST116") {
      return { success: false, error: existingError.message };
    }
    if (existingCert) {
      return {
        success: false,
        error: `Certificate already exists for this participant. Certificate number: ${existingCert.certificate_number}. Cannot create duplicate certificate.`,
      };
    }
  }

  let certificateNumber: string;
  if (config.cert_id_prefix) {
    if (eventId === "standalone") {
      const random = Math.floor(Math.random() * 1000);
      certificateNumber = `${config.cert_id_prefix}-${String(random).padStart(3, "0")}`;
    } else {
      const eventIdForCounter = actualEventId || eventId;
      const { data, error } = await supabase.rpc("get_next_certificate_number", {
        event_uuid: eventIdForCounter,
      });
      if (error || data == null) {
        return { success: false, error: `Failed to reserve certificate number: ${error?.message || "No number returned"}` };
      }
      const formattedNumber = String(data).padStart(3, "0");
      certificateNumber = `${config.cert_id_prefix}-${formattedNumber}`;
    }
  } else {
    certificateNumber = generateCertificateNumber(eventId, userId);
  }

  let venue = "";
  if (eventId && eventId !== "standalone") {
    const { data: eventRow } = await supabase
      .from("events")
      .select("venue")
      .eq("id", eventId)
      .maybeSingle();
    venue = eventRow?.venue || "";
  }

  let pngBytes: Uint8Array;
  let pdfBytes: Uint8Array;
  try {
    const rendered = await generateCertificatePngPdf(
      config,
      certificateNumber,
      { participantName, eventTitle, completionDate, venue },
      siteUrl,
    );
    pngBytes = rendered.pngBytes;
    pdfBytes = rendered.pdfBytes;
  } catch (err) {
    const message = renderErrorMessage(err);
    console.error("Certificate render failed", message, err);
    return { success: false, error: `PNG generation failed: ${message}` };
  }

  const pdfFileName = `${certificateNumber}.pdf`;
  const pngFileName = `${certificateNumber}.png`;
  const fileBase = `certificates/${eventId}/${userId}`;

  const [pdfUpload, pngUpload] = await Promise.all([
    supabase.storage.from("generated-certificates").upload(`${fileBase}/${pdfFileName}`, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    }),
    supabase.storage.from("generated-certificates").upload(`${fileBase}/${pngFileName}`, pngBytes, {
      contentType: "image/png",
      upsert: true,
    }),
  ]);

  if (pdfUpload.error || pngUpload.error) {
    return { success: false, error: pdfUpload.error?.message || pngUpload.error?.message || "Failed to upload certificate files" };
  }

  const { data: pdfPublic } = supabase.storage.from("generated-certificates").getPublicUrl(`${fileBase}/${pdfFileName}`);
  const { data: pngPublic } = supabase.storage.from("generated-certificates").getPublicUrl(`${fileBase}/${pngFileName}`);

  const insertData: Record<string, unknown> = {
    event_id: actualEventId,
    user_id: certificateUserId,
    certificate_number: certificateNumber,
    participant_name: String(participantName).trim(),
    event_title: eventTitle,
    completion_date: completionDate,
    certificate_pdf_url: pdfPublic.publicUrl,
    certificate_png_url: pngPublic.publicUrl,
    generated_by: certificateUserId,
  };
  if (templateId) {
    insertData.certificate_template_id = templateId;
  }

  const { data: saved, error: saveError } = await supabase
    .from("certificates")
    .insert(insertData)
    .select()
    .single();

  if (saveError) {
    return { success: false, error: `Failed to save certificate: ${saveError.message}` };
  }
  if (!saved) {
    return { success: false, error: "Certificate save completed but no certificate was returned" };
  }

  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Certificate Ready",
      message: `Your certificate for "${eventTitle}" has been generated successfully. You can now view and download it.`,
      type: "success",
      action_url: `/certificate?eventId=${eventId}&participantName=${encodeURIComponent(participantName)}`,
      action_text: "View Certificate",
      priority: "normal",
      read: false,
    });
  } catch {
    // Job still succeeds if the in-app notification insert fails
  }

  return {
    success: true,
    result: {
      certificateNumber,
      pdfUrl: pdfPublic.publicUrl,
      pngUrl: pngPublic.publicUrl,
    },
  };
}

async function processBulkNotification(
  supabase: SupabaseClient,
  jobData: Record<string, any>,
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const notifications = (jobData.userIds || []).map((uid: string) => ({
    user_id: uid,
    title: jobData.title,
    message: jobData.message,
    type: jobData.type,
    action_url: jobData.options?.action_url,
    action_text: jobData.options?.action_text,
    priority: jobData.options?.priority || "normal",
    expires_at: jobData.options?.expires_at,
    read: false,
  }));
  const { data, error } = await supabase.from("notifications").insert(notifications).select();
  if (error) return { success: false, error: error.message };
  return { success: true, result: { sent: data?.length || 0 } };
}

async function processSingleNotification(
  supabase: SupabaseClient,
  jobData: Record<string, any>,
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const { data, error } = await supabase.from("notifications").insert([{
    user_id: jobData.userId,
    title: jobData.title,
    message: jobData.message,
    type: jobData.type,
    action_url: jobData.options?.action_url,
    action_text: jobData.options?.action_text,
    priority: jobData.options?.priority || "normal",
    expires_at: jobData.options?.expires_at,
    read: false,
  }]).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, result: { notificationId: data?.id } };
}

function parseJobRow(data: unknown): JobRow | undefined {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("id" in row)) return undefined;
  return row as JobRow;
}

async function runClaimedJob(
  supabase: SupabaseClient,
  siteUrl: string,
  job: JobRow,
): Promise<"succeeded" | "failed"> {
  try {
    let outcome: { success: boolean; result?: Record<string, unknown>; error?: string };

    if (job.job_type === "certificate_generation") {
      outcome = await processCertificateJob(supabase, job.job_data, siteUrl);
    } else if (job.job_type === "bulk_notification") {
      outcome = await processBulkNotification(supabase, job.job_data);
    } else if (job.job_type === "single_notification") {
      outcome = await processSingleNotification(supabase, job.job_data);
    } else {
      outcome = { success: false, error: `Unknown job type: ${job.job_type}` };
    }

    if (outcome.success) {
      await completeJob(supabase, job.id, outcome.result || {});
      return "succeeded";
    }
    await failJob(supabase, job.id, outcome.error || "Unknown error");
    return "failed";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing error";
    await failJob(supabase, job.id, message);
    return "failed";
  }
}

export async function processJobById(
  supabase: SupabaseClient,
  siteUrl: string,
  jobId: string,
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const { data, error } = await supabase.rpc("claim_job", { p_job_id: jobId });
  if (error) {
    console.error("claim_job failed", error.message);
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  const job = parseJobRow(data);
  if (!job?.id) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  const result = await runClaimedJob(supabase, siteUrl, job);
  return {
    processed: 1,
    succeeded: result === "succeeded" ? 1 : 0,
    failed: result === "failed" ? 1 : 0,
  };
}

export async function processBatch(
  supabase: SupabaseClient,
  siteUrl: string,
  maxJobs: number,
): Promise<{ processed: number; succeeded: number; failed: number }> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < maxJobs; i++) {
    const { data, error } = await supabase.rpc("get_next_job");
    if (error) {
      console.error("get_next_job failed", error.message);
      break;
    }
    const job = parseJobRow(data);
    if (!job?.id) break;

    processed++;
    const result = await runClaimedJob(supabase, siteUrl, job);
    if (result === "succeeded") succeeded++;
    else failed++;
  }

  return { processed, succeeded, failed };
}

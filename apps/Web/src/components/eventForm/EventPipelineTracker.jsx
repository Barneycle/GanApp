import React from 'react';
import { Check } from 'lucide-react';

export function isCertificateConfigured(config) {
  if (!config || typeof config !== 'object') return false;
  if (config.id || config.event_id) return true;
  if (String(config.title_text || '').trim()) return true;
  if (config.background_image_url) return true;
  if (Array.isArray(config.signature_blocks) && config.signature_blocks.length > 0) return true;
  return false;
}

export function readSessionCertificateConfig() {
  try {
    const raw = sessionStorage.getItem('pending-certificate-config');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function markPipelineCertificateDone() {
  try {
    sessionStorage.setItem('pending-certificate-done', '1');
    sessionStorage.removeItem('pending-certificate-skipped');
  } catch {
    // Ignore session write failures
  }
}

export function markPipelineCertificateSkipped() {
  try {
    sessionStorage.setItem('pending-certificate-skipped', '1');
    sessionStorage.removeItem('pending-certificate-done');
  } catch {
    // Ignore session write failures
  }
}

export function isPipelineCertificateSkipped() {
  try {
    return sessionStorage.getItem('pending-certificate-skipped') === '1';
  } catch {
    return false;
  }
}

export function isPipelineCertificateDone() {
  try {
    if (sessionStorage.getItem('pending-certificate-done') === '1') return true;
    const config = readSessionCertificateConfig();
    if (config && (config.id || config.event_id)) {
      markPipelineCertificateDone();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearPipelineCertificateFlags() {
  try {
    sessionStorage.removeItem('pending-certificate-done');
    sessionStorage.removeItem('pending-certificate-skipped');
  } catch {
    // Ignore session write failures
  }
}

export function EventPipelineTracker({ current = 1, certificateDone = false, compact = false }) {
  const steps = [
    { id: 'event', n: 1, label: 'Event', done: current > 1, active: current === 1 },
    { id: 'certificate', n: 2, label: 'Certificate', done: certificateDone, active: current === 2 },
    { id: 'evaluation', n: 3, label: 'Evaluation', done: false, active: current === 3 },
  ];

  return (
    <div className={`${compact ? 'mt-0 gap-1.5 text-[11px]' : 'mt-6 gap-2 text-sm'} flex flex-nowrap items-center justify-center`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {index > 0 ? (
            <span
              className={`h-px w-6 shrink-0 sm:w-10 ${
                steps[index - 1].done || step.active || step.done ? 'bg-blue-200' : 'bg-slate-200'
              }`}
              aria-hidden
            />
          ) : null}
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                step.done || step.active ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step.done ? <Check className="h-3.5 w-3.5" /> : step.n}
            </span>
            <span
              className={`${step.active || step.done ? 'font-medium text-slate-900' : 'text-slate-500'} ${
                step.id === 'evaluation' ? '' : 'hidden sm:inline'
              }`}
            >
              {step.label}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

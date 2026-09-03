import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Download, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { CertificateService } from '../services/certificateService';
import { EventService } from '../services/eventService';
import { JobQueueService } from '../services/jobQueueService';
import { RateLimitService } from '../services/rateLimitService';
import { useAuth } from '../contexts/AuthContext';
import { useToast, statusDialog, statusError } from './Toast';
import { ErrorBanner, ErrorState } from './ErrorState';
import { Skeleton } from './loading/Skeleton';
import { ProgressBar } from './loading/ProgressBar';
import { overlayEnter, panelEnter } from './motion/tokens';
import { formatErrorCopy, toErrorCopy } from '../utils/errorCopy';

const previewFromCertificate = (cert) => {
  if (!cert) return null;
  if (cert.certificate_png_url) return { type: 'png', url: cert.certificate_png_url };
  if (cert.certificate_pdf_url) return { type: 'pdf', url: cert.certificate_pdf_url };
  return null;
};

const formatIssuedDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const mergeCertificateConfig = (defaults, config) => {
  if (!config) return defaults;
  return {
    ...defaults,
    ...config,
    header_config: {
      ...defaults.header_config,
      ...(config.header_config || {}),
      republic_config: {
        ...defaults.header_config.republic_config,
        ...(config.header_config?.republic_config || {}),
      },
      university_config: {
        ...defaults.header_config.university_config,
        ...(config.header_config?.university_config || {}),
      },
      location_config: {
        ...defaults.header_config.location_config,
        ...(config.header_config?.location_config || {}),
      },
    },
    logo_config: {
      ...defaults.logo_config,
      ...(config.logo_config || {}),
      logos: config.logo_config?.logos || defaults.logo_config.logos || [],
    },
    participation_text_config: {
      ...defaults.participation_text_config,
      ...(config.participation_text_config || {}),
      position: {
        ...defaults.participation_text_config.position,
        ...(config.participation_text_config?.position || {}),
      },
    },
    is_given_to_config: { ...defaults.is_given_to_config, ...(config.is_given_to_config || {}) },
    name_config: { ...defaults.name_config, ...(config.name_config || {}) },
    event_title_config: { ...defaults.event_title_config, ...(config.event_title_config || {}) },
    date_config: { ...defaults.date_config, ...(config.date_config || {}) },
    signature_blocks: config.signature_blocks || defaults.signature_blocks,
    cert_id_prefix: config.cert_id_prefix || defaults.cert_id_prefix,
    cert_id_position: config.cert_id_position || defaults.cert_id_position,
    cert_id_font_size: config.cert_id_font_size || defaults.cert_id_font_size,
    cert_id_color: config.cert_id_color || defaults.cert_id_color,
    qr_code_enabled: config.qr_code_enabled !== undefined ? config.qr_code_enabled : defaults.qr_code_enabled,
    qr_code_size: config.qr_code_size || defaults.qr_code_size,
    qr_code_position: config.qr_code_position || defaults.qr_code_position,
    background_image_size: config.background_image_size || defaults.background_image_size,
  };
};

const CertificateGenerator = ({ eventId, onClose, isMobile = false }) => {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [event, setEvent] = useState(null);
  const [config, setConfig] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [jobStatus, setJobStatus] = useState('idle');
  const [_jobId, setJobId] = useState(null);
  const [downloading, setDownloading] = useState({ pdf: false, png: false });
  const hasLoadedRef = useRef(false);
  const authTimeoutRef = useRef(null);
  const readyMessageSentRef = useRef(false);

  const notifyMobile = (payload) => {
    if (isMobile && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  };

  const applyCertificate = (cert) => {
    setCertificate(cert);
    setPreviewData(previewFromCertificate(cert));
  };

  useEffect(() => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }

    if (authLoading) {
      return;
    }

    if (!authLoading && !user?.id && eventId) {
      authTimeoutRef.current = setTimeout(() => {
        if (!hasLoadedRef.current) {
          setError(toErrorCopy('Your session expired. Please sign in.', 'loadCertificate'));
          setLoading(false);
          hasLoadedRef.current = true;
          notifyMobile({
            type: 'error',
            message: 'Authentication failed. Please log in again.',
          });
        }
      }, isMobile ? 3000 : 800);

      return () => {
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      };
    }

    if (eventId && user?.id && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      loadData();
      checkPendingJob();
    }
  }, [eventId, user?.id, authLoading, isMobile]);

  useEffect(() => {
    if (isMobile && window.ReactNativeWebView && eventId && !readyMessageSentRef.current) {
      if (error) {
        readyMessageSentRef.current = true;
        notifyMobile({
          type: 'error',
          message: formatErrorCopy(error),
        });
        return;
      }

      if (!authLoading && !loading) {
        const hasData = certificate || config || event;
        const hasNoUser = !user?.id && !authLoading;

        if (hasData || hasNoUser) {
          readyMessageSentRef.current = true;
          notifyMobile({ type: 'ready' });
        }
      }
    }
  }, [loading, authLoading, error, certificate, config, event, isMobile, eventId, user?.id]);

  useEffect(() => {
    if (isMobile && window.ReactNativeWebView && eventId && !readyMessageSentRef.current) {
      const fallbackTimeout = setTimeout(() => {
        if (!readyMessageSentRef.current) {
          readyMessageSentRef.current = true;
          notifyMobile({ type: 'ready' });
        }
      }, 15000);

      return () => clearTimeout(fallbackTimeout);
    }
  }, [isMobile, eventId]);

  useEffect(() => {
    if (!isMobile) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobile]);

  const checkPendingJob = async () => {
    if (!eventId || !user?.id) return;

    const storageKey = `cert_job_${eventId}_${user.id}`;
    const storedJobId = sessionStorage.getItem(storageKey);

    if (!storedJobId) return;

    setJobId(storedJobId);
    setGenerating(true);
    setJobStatus('processing');

    const statusResult = await JobQueueService.getJobStatus(storedJobId);
    if (statusResult.job) {
      const job = statusResult.job;
      if (job.status === 'completed') {
        setJobStatus('completed');
        setGenerating(false);
        sessionStorage.removeItem(storageKey);
        const certResult = await CertificateService.getUserCertificate(user.id, eventId);
        if (certResult.certificate) {
          applyCertificate(certResult.certificate);
          statusDialog({
            title: 'Certificate ready',
            message: 'You can download it now from this page.',
          });
        }
      } else if (job.status === 'failed') {
        const copy = toErrorCopy(job.error_message || 'Certificate generation failed', 'generateCertificate');
        setActionError(copy);
        setJobStatus('failed');
        setGenerating(false);
        sessionStorage.removeItem(storageKey);
        statusError(copy, 'generateCertificate');
      } else {
        pollJobStatus(storedJobId);
      }
    } else {
      sessionStorage.removeItem(storageKey);
      setGenerating(false);
      setJobStatus('idle');
    }
  };

  const getDefaultConfig = () => ({
    event_id: eventId,
    background_color: '#ffffff',
    background_image_url: null,
    border_color: '#1e40af',
    border_width: 5,
    title_text: 'CERTIFICATE',
    title_subtitle: 'OF PARTICIPATION',
    title_font_size: 56,
    title_color: '#000000',
    title_position: { x: 50, y: 28 },
    width: 2500,
    height: 1768,
    name_config: {
      font_size: 48,
      color: '#000000',
      position: { x: 50, y: 50 },
      font_family: 'MonteCarlo, cursive',
      font_weight: 'bold',
    },
    event_title_config: {
      font_size: 24,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
    },
    date_config: {
      font_size: 20,
      color: '#000000',
      position: { x: 50, y: 70 },
      font_family: 'Arial, sans-serif',
      font_weight: 'normal',
      date_format: 'MMMM DD, YYYY',
    },
    header_config: {
      republic_text: 'Republic of the Philippines',
      university_text: 'Partido State University',
      location_text: 'Goa, Camarines Sur',
      republic_config: {
        font_size: 24,
        color: '#000000',
        position: { x: 50, y: 8.5 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal',
      },
      university_config: {
        font_size: 34,
        color: '#000000',
        position: { x: 50, y: 10.5 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'bold',
      },
      location_config: {
        font_size: 24,
        color: '#000000',
        position: { x: 50, y: 12.5 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal',
      },
    },
    logo_config: {
      logos: [],
      sponsor_logos: [],
      sponsor_logo_size: { width: 80, height: 80 },
      sponsor_logo_position: { x: 90, y: 5 },
      sponsor_logo_spacing: 10,
    },
    participation_text_config: {
      text_template: 'For his/her active participation during the {EVENT_NAME} held on {EVENT_DATE} at {VENUE}',
      font_size: 22,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
      line_height: 1.5,
    },
    is_given_to_config: {
      text: 'This certificate is proudly presented to',
      font_size: 20,
      color: '#000000',
      position: { x: 50, y: 38 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
    },
    signature_blocks: [],
    cert_id_prefix: '',
    cert_id_position: { x: 50, y: 75 },
    cert_id_font_size: 16,
    cert_id_color: '#000000',
    qr_code_enabled: false,
    qr_code_size: 60,
    qr_code_position: { x: 60, y: 75 },
    background_image_size: { width: 2500, height: 1768 },
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [eventResult, configResult, certResult] = await Promise.all([
        EventService.getEventById(eventId),
        CertificateService.getCertificateConfig(eventId),
        user?.id ? CertificateService.getUserCertificate(user.id, eventId) : Promise.resolve({ certificate: null }),
      ]);

      if (eventResult.error || !eventResult.event) {
        setError(toErrorCopy(eventResult.error || 'Event not found', 'loadCertificate'));
        return;
      }

      setEvent(eventResult.event);
      setConfig(mergeCertificateConfig(getDefaultConfig(), configResult.config));

      if (certResult.certificate) {
        applyCertificate(certResult.certificate);
      }
    } catch (err) {
      setError(toErrorCopy(err, 'loadCertificate'));
    } finally {
      setLoading(false);
    }
  };

  const getUserName = () => {
    if (!user) {
      return 'Participant';
    }

    const parts = [];
    if (user.prefix) parts.push(user.prefix);
    if (user.first_name) parts.push(user.first_name);
    if (user.middle_initial) parts.push(user.middle_initial);
    if (user.last_name) parts.push(user.last_name);
    if (user.affix) parts.push(user.affix);

    if (parts.length > 0) {
      return parts.join(' ');
    }

    return user?.email?.split('@')[0] || 'Participant';
  };

  const handleGenerate = async () => {
    if (!eventId || !user?.id || !config || !event || generating) return;

    setGenerating(true);
    setActionError(null);
    setJobStatus('queued');

    try {
      if (certificate) {
        applyCertificate(certificate);
        toast.info('This certificate is already ready to download.');
        setGenerating(false);
        setJobStatus('idle');
        return;
      }

      try {
        const rateLimitResult = await RateLimitService.checkRateLimit(
          user.id,
          '/certificate-generate',
          RateLimitService.limits.certificateGenerate.maxRequests,
          RateLimitService.limits.certificateGenerate.windowSeconds
        );

        if (!rateLimitResult.allowed) {
          const resetAt = rateLimitResult.resetAt
            ? new Date(rateLimitResult.resetAt).toLocaleTimeString()
            : 'a few minutes';
          const copy = {
            ...toErrorCopy('Too many attempts.', 'generateCertificate'),
            why: `Please try again after ${resetAt}.`,
          };
          setActionError(copy);
          setGenerating(false);
          setJobStatus('idle');
          await statusError(copy, 'generateCertificate');
          return;
        }
      } catch (rateLimitError) {
        console.warn('Rate limit check failed, allowing certificate generation:', rateLimitError);
      }

      const jobResult = await JobQueueService.queueCertificateGeneration(
        {
          eventId,
          userId: user.id,
          participantName: getUserName(),
          eventTitle: event.title,
          completionDate: event.start_date || new Date().toISOString().split('T')[0],
        },
        user.id,
        5
      );

      if (jobResult.error || !jobResult.job) {
        throw new Error(jobResult.error || 'Failed to queue certificate generation');
      }

      const queuedJobId = jobResult.job.id;
      setJobId(queuedJobId);
      setJobStatus('queued');
      sessionStorage.setItem(`cert_job_${eventId}_${user.id}`, queuedJobId);
      toast.info('Your certificate is being generated.');
      pollJobStatus(queuedJobId);
    } catch (err) {
      const copy = toErrorCopy(err, 'generateCertificate');
      setActionError(copy);
      setJobStatus('failed');
      setGenerating(false);
      await statusError(copy, 'generateCertificate');
    }
  };

  const pollJobStatus = async (jobId) => {
    const maxAttempts = 30;
    let attempts = 0;
    const storageKey = `cert_job_${eventId}_${user.id}`;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        const copy = toErrorCopy('Certificate generation timed out.', 'generateCertificate');
        setActionError(copy);
        setJobStatus('failed');
        setGenerating(false);
        sessionStorage.removeItem(storageKey);
        await statusError(copy, 'generateCertificate');
        return;
      }

      attempts += 1;

      try {
        const statusResult = await JobQueueService.getJobStatus(jobId);

        if (statusResult.error || !statusResult.job) {
          const copy = toErrorCopy(statusResult.error || 'Failed to check job status.', 'generateCertificate');
          setActionError(copy);
          setJobStatus('failed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);
          await statusError(copy, 'generateCertificate');
          return;
        }

        const job = statusResult.job;

        if (job.status === 'completed') {
          setJobStatus('completed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);

          const certResult = await CertificateService.getUserCertificate(user.id, eventId);
          if (certResult.certificate) {
            applyCertificate(certResult.certificate);
            statusDialog({
              title: 'Certificate ready',
              message: 'You can download it now from this page.',
            });
          } else {
            statusDialog({
              title: 'Certificate ready',
              message: 'Refresh this page if it does not appear yet.',
            });
          }
        } else if (job.status === 'failed') {
          const copy = toErrorCopy(job.error_message || 'Certificate generation failed', 'generateCertificate');
          setActionError(copy);
          setJobStatus('failed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);
          await statusError(copy, 'generateCertificate');
        } else {
          setJobStatus(job.status === 'processing' ? 'processing' : 'queued');
          setTimeout(poll, 1000);
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        setTimeout(poll, 1000);
      }
    };

    poll();
  };

  const handleDownload = async (format) => {
    if (!certificate) {
      toast.error(toErrorCopy('Certificate not found. Please generate a certificate first.', 'downloadCertificate'));
      return;
    }

    setDownloading((prev) => ({ ...prev, [format]: true }));

    const url = format === 'pdf' ? certificate.certificate_pdf_url : certificate.certificate_png_url;

    if (!url) {
      toast.error(toErrorCopy(`${format.toUpperCase()} certificate not available.`, 'downloadCertificate'));
      setDownloading((prev) => ({ ...prev, [format]: false }));
      return;
    }

    try {
      if (isMobile && window.ReactNativeWebView) {
        notifyMobile({
          type: 'download',
          format,
          url,
          filename: `certificate-${certificate.certificate_number}.${format}`,
          mimeType: format === 'pdf' ? 'application/pdf' : 'image/png',
        });
        toast.success('Preparing download...');
        setDownloading((prev) => ({ ...prev, [format]: false }));
        return;
      }

      const urlWithCacheBust = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      let blob;

      try {
        const response = await fetch(urlWithCacheBust, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
        });

        if (response.ok) {
          blob = await response.blob();
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (fetchErr) {
        if (format === 'png') {
          blob = await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((nextBlob) => {
                if (nextBlob) resolve(nextBlob);
                else reject(new Error('Failed to convert image to blob'));
              }, 'image/png');
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = urlWithCacheBust;
          });
        } else {
          throw fetchErr;
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `certificate-${certificate.certificate_number}.${format}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      toast.success('Certificate downloaded.');
    } catch (err) {
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `certificate-${certificate.certificate_number}.${format}`;
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
        toast.info('If the file opened in a new tab, use Save as to keep a copy.');
      } catch (_fallbackErr) {
        toast.error(toErrorCopy(err, 'downloadCertificate'));
      }
    } finally {
      setDownloading((prev) => ({ ...prev, [format]: false }));
    }
  };

  if (!eventId) {
    return null;
  }

  const jobLabel =
    jobStatus === 'processing'
      ? 'Generating your certificate'
      : jobStatus === 'queued'
        ? 'Queued — starting shortly'
        : 'Preparing';

  const panel = (
    <div className={`flex min-h-0 flex-col bg-white ${isMobile ? 'h-full' : 'max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200'}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Certificate</h2>
          {event?.title ? (
            <p className="mt-0.5 truncate text-sm text-slate-500">{event.title}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {loading ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="mt-4 h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
            </div>
            <Skeleton className="aspect-[16/11] w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ) : error && !certificate ? (
          <ErrorState
            error={error}
            context="loadCertificate"
            onRetry={loadData}
            retryLabel="Try again"
            variant="card"
          />
        ) : certificate ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Your certificate is ready.</p>
              {certificate.certificate_number ? (
                <p className="mt-1 font-mono text-sm text-slate-600">#{certificate.certificate_number}</p>
              ) : null}
              {certificate.generated_at ? (
                <p className="mt-1 text-sm text-slate-500">Issued {formatIssuedDate(certificate.generated_at)}</p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {previewData?.type === 'png' ? (
                <img
                  src={previewData.url}
                  alt="Certificate preview"
                  className="mx-auto max-h-[52vh] w-full object-contain"
                />
              ) : previewData?.type === 'pdf' ? (
                <iframe
                  src={previewData.url}
                  className="h-[52vh] w-full border-0"
                  title="Certificate preview"
                />
              ) : (
                <div className="flex aspect-[16/11] flex-col items-center justify-center gap-2 text-slate-400">
                  <ImageIcon className="h-10 w-10" />
                  <p className="text-sm">Preview is not available yet</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                disabled={downloading.pdf || !certificate?.certificate_pdf_url}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {downloading.pdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownload('png')}
                disabled={downloading.png || !certificate?.certificate_png_url}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading.png ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PNG
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm py-4 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-900">
              <Award className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Generate your certificate</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              We’ll create a certificate of participation for this event. You can download it as soon as it’s ready.
            </p>

            {actionError ? (
              <ErrorBanner error={actionError} context="generateCertificate" className="mt-5 text-left" />
            ) : null}

            {generating ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5">
                <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-900" />
                  {jobLabel}
                </div>
                <ProgressBar className="mx-auto max-w-xs" />
                <p className="mt-3 text-sm text-slate-500">
                  You can close this window and come back later.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800"
              >
                Generate certificate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return <div className="flex h-screen flex-col bg-white">{panel}</div>;
  }

  const modalRoot = document.getElementById('root') || document.body;
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        {...overlayEnter}
      >
        <motion.div className="w-full max-w-2xl" {...panelEnter}>
          {panel}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    modalRoot
  );
};

export default CertificateGenerator;

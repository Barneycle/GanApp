import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';
import { CertificateService } from '../../services/certificateService';
import { JobQueueService } from '../../services/jobQueueService';
import { confirmDialog, statusError, useToast } from '../Toast';
import { errorCopy, toErrorCopy } from '../../utils/errorCopy';
import CertificateDesigner from '../CertificateDesigner';
import Papa from 'papaparse';
import {
  Award,
  Calendar,
  CircleCheck,
  CircleCheckBig,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  MapPin,
  Plus,
  Settings,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { JobStatusViewer } from '../JobStatusViewer';
import { ErrorBanner } from '../ErrorState';
import { FieldError, FieldLabel, controlClass } from '../form/Field';
import { PageSkeleton } from '../loading/Skeleton';
import { ProgressBar } from '../loading/ProgressBar';
import { overlayEnter, pageEnter, panelEnter } from '../motion/tokens';

const CARD = 'rounded-xl border border-slate-200 bg-white p-5 sm:p-6';
const PRIMARY_BTN =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500';
const SECONDARY_BTN =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const SEGMENT_WRAP = 'flex rounded-lg bg-slate-100 p-1';
const segmentClass = (active) =>
  `flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
  }`;

function cellValueToString(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('text' in value && value.text != null) return String(value.text);
    if ('result' in value && value.result != null) return String(value.result);
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }
  return String(value);
}

export const StandaloneCertificateGenerator = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]); // Array of strings (names) or objects (from event)
  const [participantInput, setParticipantInput] = useState('');
  const [inputMode, setInputMode] = useState('manual'); // 'manual', 'file', or 'event'
  const [eventParticipants, setEventParticipants] = useState([]); // Registered participants from selected event
  const [loadingEventParticipants, setLoadingEventParticipants] = useState(false);
  const [config, setConfig] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [jobIds, setJobIds] = useState([]);
  const [showJobStatus, setShowJobStatus] = useState(false);
  const [completedCertificates, setCompletedCertificates] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [_dismissedCertIds, setDismissedCertIds] = useState(new Set());
  const [downloadingCertId, setDownloadingCertId] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [downloadingAllPDF, setDownloadingAllPDF] = useState(false);
  const [downloadingAllPNG, setDownloadingAllPNG] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [eventError, setEventError] = useState(null);
  const [participantsError, setParticipantsError] = useState(null);
  const [participantFieldError, setParticipantFieldError] = useState('');
  const [participantsReload, setParticipantsReload] = useState(0);

  // Check status of existing jobs
  const checkJobStatuses = async (jobIdsToCheck) => {
    if (!jobIdsToCheck || jobIdsToCheck.length === 0) return;

    try {
      // Check if any jobs are still pending or processing
      const pendingJobs = [];
      let completedCount = 0;
      let failedCount = 0;

      for (const jobId of jobIdsToCheck) {
        const statusResult = await JobQueueService.getJobStatus(jobId);
        if (statusResult.job) {
          const job = statusResult.job;
          if (job.status === 'pending' || job.status === 'processing') {
            pendingJobs.push(jobId);
          } else if (job.status === 'completed') {
            completedCount++;
          } else if (job.status === 'failed') {
            failedCount++;
          }
        } else {
          // Job not found, might have been deleted - remove from list
          console.warn(`Job ${jobId} not found, removing from list`);
        }
      }

      // Update jobIds to only include pending/processing jobs
      if (pendingJobs.length !== jobIdsToCheck.length) {
        setJobIds(pendingJobs);

        // Update sessionStorage
        const storageKey = 'standalone_cert_generator_state';
        const currentState = sessionStorage.getItem(storageKey);
        if (currentState) {
          try {
            const state = JSON.parse(currentState);
            state.jobIds = pendingJobs;
            sessionStorage.setItem(storageKey, JSON.stringify(state));
          } catch (err) {
            console.error('Failed to update sessionStorage:', err);
          }
        }

        // Show summary
        if (completedCount > 0 || failedCount > 0) {
          const messages = [];
          if (completedCount > 0) messages.push(`${completedCount} completed`);
          if (failedCount > 0) messages.push(`${failedCount} failed`);
          toast.info(`Certificate generation: ${messages.join(', ')}`);
        }
      }

      // If there are pending jobs, show notification
      if (pendingJobs.length > 0) {
        toast.info(`${pendingJobs.length} certificate(s) still processing in background`);
      } else if (jobIdsToCheck.length > 0) {
        // All jobs are done, clear the jobIds
        setJobIds([]);
      }

      // Reload completed certificates if any jobs completed
      if (completedCount > 0) {
        loadCompletedCertificates(true);
      }
    } catch (err) {
      console.error('Failed to check job statuses:', err);
    }
  };

  // Restore state from sessionStorage on mount
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'organizer') {
      return;
    }

    const storageKey = 'standalone_cert_generator_state';
    const savedState = sessionStorage.getItem(storageKey);

    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.selectedEventId) {
          setSelectedEventId(state.selectedEventId);
        }
        if (state.participants && state.participants.length > 0) {
          setParticipants(state.participants);
        }
        if (state.inputMode) {
          setInputMode(state.inputMode);
        }
        if (state.jobIds && state.jobIds.length > 0) {
          setJobIds(state.jobIds);
          // Check job statuses
          checkJobStatuses(state.jobIds);
        }
      } catch (err) {
        console.error('Failed to restore state from sessionStorage:', err);
      }
    }

    loadEvents();
    loadCompletedCertificates();

    // Load dismissed certificate IDs from sessionStorage
    const dismissedKey = 'dismissed_certificates';
    const dismissed = sessionStorage.getItem(dismissedKey);
    if (dismissed) {
      try {
        setDismissedCertIds(new Set(JSON.parse(dismissed)));
      } catch (err) {
        console.error('Failed to load dismissed certificates:', err);
      }
    }
  }, [user, isAuthenticated, navigate]);

  // Auto-refresh completed certificates every 5 seconds
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'organizer') return;

    const interval = setInterval(() => {
      loadCompletedCertificates(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [user, isAuthenticated]);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'organizer') {
      return;
    }

    const storageKey = 'standalone_cert_generator_state';
    const state = {
      selectedEventId,
      participants,
      inputMode,
      jobIds
    };
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [selectedEventId, participants, inputMode, jobIds, isAuthenticated, user]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventAndConfig();
    } else {
      setSelectedEvent(null);
      setEventError(null);
      setConfig(getDefaultConfig());
    }
  }, [selectedEventId]);

  // Load registered participants when event is selected and input mode is 'event'
  useEffect(() => {
    const loadEventParticipants = async () => {
      if (selectedEventId && inputMode === 'event') {
        try {
          setLoadingEventParticipants(true);
          setParticipantsError(null);
          const result = await EventService.getEventParticipants(selectedEventId);
          if (result.error) {
            setParticipantsError(toErrorCopy(result.error, 'loadParticipants'));
            setEventParticipants([]);
          } else {
            setEventParticipants(result.participants || []);
          }
        } catch (err) {
          console.error('Failed to load event participants:', err);
          setParticipantsError(toErrorCopy(err, 'loadParticipants'));
          setEventParticipants([]);
        } finally {
          setLoadingEventParticipants(false);
        }
      } else {
        setEventParticipants([]);
      }
    };

    loadEventParticipants();
  }, [selectedEventId, inputMode, participantsReload]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setEventsError(null);
      const result = await EventService.getAllEvents();
      if (result.error) {
        setEventsError(toErrorCopy(result.error, 'loadEvents'));
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      setEventsError(toErrorCopy(err, 'loadEvents'));
    } finally {
      setLoading(false);
    }
  };

  const loadEventAndConfig = async () => {
    try {
      setEventError(null);
      const eventResult = await EventService.getEventById(selectedEventId);
      if (eventResult.error) {
        setEventError(toErrorCopy(eventResult.error, 'loadEvents'));
        return;
      }
      setSelectedEvent(eventResult.event);

      const configResult = await CertificateService.getCertificateConfig(selectedEventId);
      if (configResult.config) {
        setConfig(configResult.config);
      } else {
        setConfig(getDefaultConfig());
      }
    } catch (err) {
      setEventError(toErrorCopy(err, 'loadEvents'));
    }
  };

  const loadCompletedCertificates = async (silent = false) => {
    if (!user?.id) return;

    try {
      if (!silent) setLoadingCompleted(true);

      const result = await JobQueueService.getUserJobs(user.id, 'completed');
      if (result.error) {
        console.error('Failed to load completed certificates:', result.error);
        return;
      }

      // Load dismissed IDs from sessionStorage to ensure we have the latest
      const dismissedKey = 'dismissed_certificates';
      const dismissedData = sessionStorage.getItem(dismissedKey);
      const currentDismissed = dismissedData ? new Set(JSON.parse(dismissedData)) : new Set();

      const completedJobs = (result.jobs || [])
        .filter(job => job.job_type === 'certificate_generation')
        .filter(job => job.result_data?.pdfUrl || job.result_data?.pngUrl)
        .filter(job => job.id && !currentDismissed.has(String(job.id))) // Filter out dismissed certificates
        .map(job => ({
          id: job.id,
          participantName: job.job_data?.participantName || 'Unknown',
          eventTitle: job.job_data?.eventTitle || 'Event',
          certificateNumber: job.result_data?.certificateNumber,
          pdfUrl: job.result_data?.pdfUrl,
          pngUrl: job.result_data?.pngUrl,
          completedAt: job.completed_at
        }))
        .sort((a, b) => {
          // Sort by completed_at, newest first
          return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
        });

      setCompletedCertificates(completedJobs);
    } catch (err) {
      console.error('Failed to load completed certificates:', err);
    } finally {
      if (!silent) setLoadingCompleted(false);
    }
  };

  const dismissCertificate = (certId) => {
    // Get current dismissed from sessionStorage
    const dismissedKey = 'dismissed_certificates';
    const dismissedData = sessionStorage.getItem(dismissedKey);
    const currentDismissed = dismissedData ? new Set(JSON.parse(dismissedData)) : new Set();

    // Add the new certificate ID
    currentDismissed.add(certId);
    setDismissedCertIds(new Set(currentDismissed));

    // Save to sessionStorage
    sessionStorage.setItem(dismissedKey, JSON.stringify(Array.from(currentDismissed)));

    // Remove from displayed list
    setCompletedCertificates(prev => prev.filter(cert => cert.id !== certId));

    toast.info('Certificate removed from list');
  };

  const clearAllCertificates = async () => {
    const confirmed = await confirmDialog({
      title: 'Clear this list?',
      message: 'Certificates stay generated. This only hides them from the download list on this page.',
      confirmText: 'Clear list',
      cancelText: 'Keep them',
      type: 'warning',
    });
    if (!confirmed) return;
    // Get current dismissed from sessionStorage
    const dismissedKey = 'dismissed_certificates';
    const dismissedData = sessionStorage.getItem(dismissedKey);
    const currentDismissed = dismissedData ? new Set(JSON.parse(dismissedData)) : new Set();

    // Add all current certificates to dismissed list
    completedCertificates.forEach(cert => {
      if (cert.id) {
        currentDismissed.add(cert.id);
      }
    });
    setDismissedCertIds(new Set(currentDismissed));

    // Save to sessionStorage
    sessionStorage.setItem(dismissedKey, JSON.stringify(Array.from(currentDismissed)));

    // Clear the displayed list
    setCompletedCertificates([]);

    toast.info('All certificates cleared from list');
  };

  const handleDownload = async (url, format, certificateNumber, certId) => {
    console.log('📥 Download requested:', format, { url, certificateNumber, certId });

    if (!url) {
      toast.error(toErrorCopy(`${format.toUpperCase()} certificate not available.`, 'downloadCertificate'));
      return;
    }

    // Set loading state
    setDownloadingCertId(certId);
    setDownloadingFormat(format);

    try {
      // Add cache-busting parameter to ensure we get the latest version
      const urlWithCacheBust = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      console.log('📥 Downloading from URL:', urlWithCacheBust);

      let blob;

      try {
        // Try fetching with CORS first
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
        // If CORS fails, for images we can use an img element to load and convert to blob
        if (format === 'png') {
          console.log('🔄 CORS failed, trying canvas-based approach for PNG...');
          blob = await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Failed to convert image to blob'));
                }
              }, 'image/png');
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = urlWithCacheBust;
          });
        } else {
          // For PDF, if fetch fails, try direct download link
          throw fetchErr;
        }
      }

      // Create download link with blob URL
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `certificate-${certificateNumber || 'cert'}.${format}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Clean up after a delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      toast.success('Certificate downloaded.');
    } catch (err) {
      console.error('❌ Download error:', err);

      // Last resort: try direct link (may open in new tab for some browsers)
      try {
        console.log('🔄 Trying fallback download method...');
        const link = document.createElement('a');
        link.href = url;
        link.download = `certificate-${certificateNumber || 'cert'}.${format}`;
        link.target = '_blank'; // Open in new tab as fallback
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
        toast.info('Attempting download... If it opens in a new tab, right-click and "Save As"');
      } catch (fallbackErr) {
        console.error('❌ Fallback download also failed:', fallbackErr);
        toast.error(toErrorCopy(err, 'downloadCertificate'));
      }
    } finally {
      // Clear loading state
      setDownloadingCertId(null);
      setDownloadingFormat(null);
    }
  };

  const handleDownloadAllPDF = async () => {
    if (completedCertificates.length === 0) {
      toast.info('No certificates to download');
      return;
    }

    const pdfCerts = completedCertificates.filter(cert => cert.pdfUrl);
    if (pdfCerts.length === 0) {
      toast.info('No PDF certificates available to download');
      return;
    }

    setDownloadingAllPDF(true);

    try {
      let successCount = 0;
      // Download all PDF certificates sequentially to avoid browser blocking
      for (let i = 0; i < pdfCerts.length; i++) {
        const cert = pdfCerts[i];

        try {
          const response = await fetch(cert.pdfUrl);
          if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `certificate-${cert.certificateNumber || `cert-${i + 1}`}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            successCount++;
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`Failed to download PDF for ${cert.participantName}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Downloaded ${successCount} PDF certificate(s)`);
      } else {
        toast.error(toErrorCopy('Failed to download PDF certificates', 'downloadCertificate'));
      }
    } catch (err) {
      console.error('Download all PDF error:', err);
      toast.error(toErrorCopy(err, 'downloadCertificate'));
    } finally {
      setDownloadingAllPDF(false);
    }
  };

  const handleDownloadAllPNG = async () => {
    if (completedCertificates.length === 0) {
      toast.info('No certificates to download');
      return;
    }

    const pngCerts = completedCertificates.filter(cert => cert.pngUrl);
    if (pngCerts.length === 0) {
      toast.info('No PNG certificates available to download');
      return;
    }

    setDownloadingAllPNG(true);

    try {
      let successCount = 0;
      // Download all PNG certificates sequentially to avoid browser blocking
      for (let i = 0; i < pngCerts.length; i++) {
        const cert = pngCerts[i];

        try {
          const response = await fetch(cert.pngUrl);
          if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `certificate-${cert.certificateNumber || `cert-${i + 1}`}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            successCount++;
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`Failed to download PNG for ${cert.participantName}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Downloaded ${successCount} PNG certificate(s)`);
      } else {
        toast.error(toErrorCopy('Failed to download PNG certificates', 'downloadCertificate'));
      }
    } catch (err) {
      console.error('Download all PNG error:', err);
      toast.error(toErrorCopy(err, 'downloadCertificate'));
    } finally {
      setDownloadingAllPNG(false);
    }
  };

  const getDefaultConfig = () => ({
    event_id: selectedEventId || null,
    background_color: '#ffffff',
    background_image_url: null,
    border_color: '#1e40af',
    border_width: 5,
    title_text: 'CERTIFICATE',
    title_subtitle: 'OF PARTICIPATION',
    title_font_size: 56,
    title_color: '#000000',
    title_position: { x: 50, y: 28 },
    width: 842,  // A4 landscape: 297mm × 210mm = 842 × 595 points
    height: 595,
    name_config: {
      font_size: 48,
      color: '#000000',
      position: { x: 50, y: 50 },
      font_family: 'MonteCarlo, cursive',
      font_weight: 'bold'
    },
    event_title_config: {
      font_size: 24,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal'
    },
    date_config: {
      font_size: 20,
      color: '#000000',
      position: { x: 50, y: 70 },
      font_family: 'Arial, sans-serif',
      font_weight: 'normal',
      date_format: 'MMMM DD, YYYY'
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
        font_weight: 'normal'
      },
      university_config: {
        font_size: 34,
        color: '#000000',
        position: { x: 50, y: 10.5 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'bold'
      },
      location_config: {
        font_size: 24,
        color: '#000000',
        position: { x: 50, y: 12.5 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal'
      }
    },
    logo_config: {
      logos: [],
      sponsor_logos: [],
      sponsor_logo_size: { width: 80, height: 80 },
      sponsor_logo_position: { x: 90, y: 5 },
      sponsor_logo_spacing: 10
    },
    participation_text_config: {
      text: 'This is to certify that',
      font_size: 20,
      color: '#000000',
      position: { x: 50, y: 40 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal'
    },
    is_given_to_config: {
      text: 'has successfully participated in',
      font_size: 20,
      color: '#000000',
      position: { x: 50, y: 55 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal'
    },
    signature_blocks: [],
    background_image_size: { width: 842, height: 595 },  // A4 landscape
    cert_id_prefix: '',
    cert_id_position: { x: 50, y: 85 },
    cert_id_font_size: 16,
    cert_id_color: '#000000',
    qr_code_enabled: false,
    qr_code_size: 100,
    qr_code_position: { x: 50, y: 85 }
  });

  const handleAddParticipant = () => {
    const name = participantInput.trim();
    if (!name) {
      setParticipantFieldError('Enter a participant name.');
      return;
    }
    const exists = participants.some(p =>
      typeof p === 'string' ? p === name : (p.participantName || p.name) === name
    );
    if (exists) {
      setParticipantFieldError('That name is already in the list.');
      return;
    }
    setParticipantFieldError('');
    setParticipants([...participants, name]);
    setParticipantInput('');
  };

  const handleToggleEventParticipant = (participant) => {
    const participantId = participant.user_id || participant.users?.id;
    const isSelected = participants.some(p => {
      if (typeof p === 'object' && p.userId) {
        return p.userId === participantId;
      }
      return false;
    });

    if (isSelected) {
      // Remove participant
      setParticipants(participants.filter(p => {
        if (typeof p === 'object' && p.userId) {
          return p.userId !== participantId;
        }
        return true;
      }));
    } else {
      // Add participant
      const participantUser = participant.users || participant;
      // Construct full name including middle initial if available
      const nameParts = [participantUser.first_name || ''];
      if (participantUser.middle_initial) {
        nameParts.push(participantUser.middle_initial);
      }
      nameParts.push(participantUser.last_name || '');
      const participantName = nameParts.filter(part => part.trim()).join(' ').trim() || participantUser.email || 'Participant';

      setParticipants([...participants, {
        userId: participantId,
        participantName: participantName,
        email: participantUser.email || '',
        participant: participant // Store full participant object for reference
      }]);
    }
  };

  const handleRemoveParticipant = (index) => {
    const newParticipants = participants.filter((_, i) => i !== index);
    setParticipants(newParticipants);
    // Update sessionStorage
    const storageKey = 'standalone_cert_generator_state';
    const currentState = sessionStorage.getItem(storageKey);
    if (currentState) {
      try {
        const state = JSON.parse(currentState);
        state.participants = newParticipants;
        sessionStorage.setItem(storageKey, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to update sessionStorage:', err);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const _newParticipants = [];

    try {
      if (fileExtension === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const names = results.data
              .map(row => {
                // Try common column names
                const name = row.name || row.Name || row.NAME ||
                  row.participant || row.Participant || row.PARTICIPANT ||
                  row['Participant Name'] || row['participant name'] ||
                  Object.values(row)[0]; // First column as fallback
                return name?.toString().trim();
              })
              .filter(name => name && name.length > 0);

            if (names.length === 0) {
              toast.error(errorCopy({
                what: "No names were found.",
                why: 'The CSV needs a name column.',
                action: 'Check the file, then try again.',
              }));
              return;
            }

            setParticipants([...participants, ...names]);
            toast.success(`Imported ${names.length} participant(s) from CSV`);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          },
          error: (error) => {
            toast.error(toErrorCopy(error, 'generic'));
          }
        });
      } else if (fileExtension === 'xlsx') {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          toast.error(errorCopy({
            what: "That Excel file couldn't be read.",
            why: 'It does not contain a worksheet.',
            action: 'Open it in Excel, then save as .xlsx and try again.',
          }));
          return;
        }

        const headers = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber] = String(cellValueToString(cell.value)).trim();
        });

        const jsonData = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const record = {};
          row.eachCell((cell, colNumber) => {
            const key = headers[colNumber] || `col${colNumber}`;
            record[key] = cellValueToString(cell.value);
          });
          jsonData.push(record);
        });

        const names = jsonData
          .map(row => {
            const name = row.name || row.Name || row.NAME ||
              row.participant || row.Participant || row.PARTICIPANT ||
              row['Participant Name'] || row['participant name'] ||
              Object.values(row)[0];
            return name?.toString().trim();
          })
          .filter(name => name && name.length > 0);

        if (names.length === 0) {
          toast.error(errorCopy({
            what: "No names were found.",
            why: 'The file needs a name column.',
            action: 'Check the file, then try again.',
          }));
          return;
        }

        setParticipants([...participants, ...names]);
        toast.success(`Imported ${names.length} participant(s) from Excel`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else if (fileExtension === 'xls') {
        toast.error(errorCopy({
          what: "That file type isn't supported.",
          why: 'Legacy .xls files cannot be imported.',
          action: 'Save as .xlsx or CSV, then try again.',
        }));
      } else {
        toast.error(errorCopy({
          what: "That file type isn't supported.",
          why: 'Only CSV and Excel (.xlsx) files can be imported.',
          action: 'Choose a CSV or .xlsx file.',
        }));
      }
    } catch (err) {
      toast.error(toErrorCopy(err, 'generic'));
    }
  };

  const handleGenerate = async () => {
    if (generating) return;

    if (participants.length === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    flushSync(() => {
      setGenerating(true);
      setGenerationProgress({ current: 0, total: participants.length });
    });

    // Ensure config is initialized
    let configToUse = config;
    if (!configToUse) {
      configToUse = getDefaultConfig();
      setConfig(configToUse);
    }

    // Save config if event is selected (temporary customization)
    if (selectedEventId && configToUse) {
      try {
        await CertificateService.saveCertificateConfig(selectedEventId, configToUse);
      } catch (err) {
        console.warn('Failed to save config:', err);
        // Continue anyway
      }
    }

    const newJobIds = [];

    try {
      // Queue a job for each participant
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];

        // Handle both string (manual/file input) and object (from event) participants
        let participantName;
        let participantUserId = null;

        if (typeof participant === 'string') {
          participantName = participant;
          // For manual/file entry, use organizer's user ID
          participantUserId = user.id;
        } else if (typeof participant === 'object' && participant.participantName) {
          participantName = participant.participantName;
          // For event participants, use the participant's actual user ID
          participantUserId = participant.userId || participant.participant?.user_id || participant.participant?.users?.id || user.id;
        } else {
          console.warn('Invalid participant format:', participant);
          continue;
        }

        const eventTitle = selectedEvent?.title || 'Event';
        const completionDate = selectedEvent?.start_date || new Date().toISOString().split('T')[0];

        // For bulk generation without event, we need a placeholder eventId
        // We'll use a special identifier or null
        const eventIdForJob = selectedEventId || 'standalone';

        const jobResult = await JobQueueService.queueCertificateGeneration(
          {
            eventId: eventIdForJob,
            userId: participantUserId, // Use participant's user ID for event participants, organizer's ID for manual entry
            participantName: participantName,
            eventTitle: eventTitle,
            completionDate: completionDate,
            config: !selectedEventId ? configToUse : undefined // Pass config for standalone
          },
          user.id,
          5
        );

        if (jobResult.job?.id) {
          newJobIds.push(jobResult.job.id);
        }

        setGenerationProgress({ current: i + 1, total: participants.length });
      }

      setJobIds(newJobIds);
      toast.success(`Queued ${participants.length} certificate(s) for generation. Processing in background...`);

      // Save jobIds to sessionStorage
      const storageKey = 'standalone_cert_generator_state';
      const currentState = sessionStorage.getItem(storageKey);
      if (currentState) {
        try {
          const state = JSON.parse(currentState);
          state.jobIds = newJobIds;
          sessionStorage.setItem(storageKey, JSON.stringify(state));
        } catch (err) {
          console.error('Failed to save jobIds to sessionStorage:', err);
        }
      }

      // Reload completed certificates after a short delay to catch any that just completed
      setTimeout(() => {
        loadCompletedCertificates(true);
      }, 2000);

      // Note: For bulk generation, we don't poll individual jobs
      // Users can check the job queue or certificates later
    } catch (err) {
      await statusError(toErrorCopy(err, 'generateCertificate'), 'generateCertificate');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="form" />;
  }

  return (
    <motion.section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" {...pageEnter}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-900">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Certificate generator
              </h1>
              <p className="mt-1 text-[15px] text-slate-600">
                Add names, then queue certificates for background processing.
              </p>
            </div>
          </div>
        </div>

        {eventsError ? (
          <ErrorBanner
            error={eventsError}
            context="loadEvents"
            onRetry={loadEvents}
            className="mb-6"
          />
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className={CARD}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
                <Settings className="h-5 w-5 text-slate-500" />
                Event
              </h2>
              {eventError ? (
                <ErrorBanner
                  error={eventError}
                  context="loadEvents"
                  onRetry={loadEventAndConfig}
                  className="mb-4"
                />
              ) : null}
              <FieldLabel htmlFor="bulk-cert-event" optional>
                Use an event design
              </FieldLabel>
              <select
                id="bulk-cert-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className={controlClass(false)}
              >
                <option value="">No event — default design</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
              {selectedEventId ? (
                <button
                  type="button"
                  onClick={() => setShowCustomizer(true)}
                  className={`${SECONDARY_BTN} mt-4 w-full`}
                >
                  <Settings className="h-4 w-4" />
                  Customize design
                </button>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Certificates will use the default design. Select an event to customize.
                </p>
              )}
            </div>

            <div className={CARD}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
                <Users className="h-5 w-5 text-slate-500" />
                Participants
              </h2>

              <div className={`${SEGMENT_WRAP} mb-5`}>
                <button
                  type="button"
                  onClick={() => {
                    setParticipantFieldError('');
                    setInputMode('manual');
                    if (inputMode === 'event') {
                      setParticipants(participants.filter((p) => typeof p === 'string'));
                    }
                  }}
                  className={segmentClass(inputMode === 'manual')}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParticipantFieldError('');
                    setInputMode('file');
                    if (inputMode === 'event') {
                      setParticipants(participants.filter((p) => typeof p === 'string'));
                    }
                  }}
                  className={segmentClass(inputMode === 'file')}
                >
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParticipantFieldError('');
                    setInputMode('event');
                    setParticipants(participants.filter((p) => typeof p === 'object'));
                  }}
                  disabled={!selectedEventId}
                  className={`${segmentClass(inputMode === 'event')} disabled:cursor-not-allowed disabled:opacity-40`}
                  title={!selectedEventId ? 'Select an event first' : ''}
                >
                  From event
                </button>
              </div>

              {inputMode === 'manual' && (
                <div>
                  <FieldLabel htmlFor="participant-name">Name</FieldLabel>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <input
                        id="participant-name"
                        type="text"
                        value={participantInput}
                        onChange={(e) => {
                          setParticipantInput(e.target.value);
                          if (participantFieldError) setParticipantFieldError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddParticipant();
                          }
                        }}
                        placeholder="Enter a participant name"
                        className={controlClass(Boolean(participantFieldError))}
                        aria-invalid={Boolean(participantFieldError)}
                      />
                    </div>
                    <button type="button" onClick={handleAddParticipant} className={`${PRIMARY_BTN} shrink-0 px-5`}>
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                  <FieldError error={participantFieldError} />
                </div>
              )}

              {inputMode === 'file' && (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                  <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <p className="text-[15px] text-slate-700">Upload a CSV or Excel file</p>
                  <p className="mt-1 text-sm text-slate-500">Use a column named name</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="participant-file-input"
                  />
                  <label htmlFor="participant-file-input" className={`${PRIMARY_BTN} mt-4 cursor-pointer px-6`}>
                    Choose file
                  </label>
                </div>
              )}

              {inputMode === 'event' && (
                <div>
                  {participantsError ? (
                    <ErrorBanner
                      error={participantsError}
                      context="loadParticipants"
                      onRetry={() => setParticipantsReload((n) => n + 1)}
                      className="mb-4"
                    />
                  ) : null}
                  {loadingEventParticipants ? (
                    <PageSkeleton variant="rows" />
                  ) : eventParticipants.length === 0 && !participantsError ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                      <Users className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                      <p className="text-[15px] text-slate-600">No registered participants for this event.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {eventParticipants.map((participant) => {
                        const participantId = participant.user_id || participant.users?.id;
                        const participantUser = participant.users || participant;
                        const nameParts = [participantUser.first_name || ''];
                        if (participantUser.middle_initial) {
                          nameParts.push(participantUser.middle_initial);
                        }
                        nameParts.push(participantUser.last_name || '');
                        const participantName =
                          nameParts.filter((part) => part.trim()).join(' ').trim() ||
                          participantUser.email ||
                          'Participant';
                        const isSelected = participants.some(
                          (p) => typeof p === 'object' && p.userId === participantId
                        );

                        return (
                          <button
                            key={participantId}
                            type="button"
                            onClick={() => handleToggleEventParticipant(participant)}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              isSelected
                                ? 'border-blue-200 bg-blue-50 text-blue-900'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium">{participantName}</p>
                                {participantUser.email ? (
                                  <p className={`truncate text-sm ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                                    {participantUser.email}
                                  </p>
                                ) : null}
                              </div>
                              {isSelected ? <CircleCheckBig className="h-5 w-5 shrink-0 text-blue-900" /> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {participants.length > 0 && (
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700">
                      {participants.length} selected
                    </h3>
                    <button
                      type="button"
                      onClick={() => setParticipants([])}
                      className="text-sm font-medium text-slate-500 hover:text-red-700"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {participants.map((participant, index) => {
                      const displayName =
                        typeof participant === 'string'
                          ? participant
                          : participant.participantName || 'Participant';
                      const displayEmail =
                        typeof participant === 'object' && participant.email ? participant.email : null;

                      return (
                        <div key={index} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{displayName}</p>
                            {displayEmail ? (
                              <p className="truncate text-xs text-slate-500">{displayEmail}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(index)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                            aria-label={`Remove ${displayName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={CARD}>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || participants.length === 0 || !config}
                className={`${PRIMARY_BTN} w-full`}
              >
                {generating ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Queuing certificates
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate {participants.length} certificate{participants.length === 1 ? '' : 's'}
                  </>
                )}
              </button>

              {generating ? (
                <ProgressBar
                  className="mt-4"
                  value={generationProgress.total ? generationProgress.current : null}
                  max={generationProgress.total || 1}
                  label={`Queued ${generationProgress.current} of ${generationProgress.total}`}
                />
              ) : null}

              {jobIds.length > 0 && !generating ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-900" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {jobIds.length} certificate{jobIds.length === 1 ? '' : 's'} queued
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        They will finish in the background. You can leave this page.
                      </p>
                      <button type="button" onClick={() => setShowJobStatus(true)} className={`${SECONDARY_BTN} mt-3 h-10 px-4 text-sm`}>
                        <Eye className="h-4 w-4" />
                        View job status
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {jobIds.length === 0 && !generating ? (
                <button
                  type="button"
                  onClick={() => setShowJobStatus(true)}
                  className="mt-4 text-sm font-medium text-blue-800 hover:text-blue-900"
                >
                  View all generation jobs
                </button>
              ) : null}
            </div>

            {completedCertificates.length > 0 ? (
              <div className={CARD}>
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
                      <Download className="h-5 w-5 text-slate-500" />
                      Ready to download
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {completedCertificates.length} certificate{completedCertificates.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => loadCompletedCertificates()}
                      disabled={loadingCompleted}
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
                      title="Refresh list"
                    >
                      <LoaderCircle className={`h-4 w-4 ${loadingCompleted ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={clearAllCertificates}
                      className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      title="Clear list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleDownloadAllPDF}
                    disabled={downloadingAllPDF || downloadingAllPNG}
                    className={`${PRIMARY_BTN} h-10 flex-1 text-sm`}
                  >
                    {downloadingAllPDF ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    All PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAllPNG}
                    disabled={downloadingAllPDF || downloadingAllPNG}
                    className={`${SECONDARY_BTN} h-10 flex-1 text-sm`}
                  >
                    {downloadingAllPNG ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    All PNG
                  </button>
                </div>

                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {completedCertificates.map((cert) => (
                    <div key={cert.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{cert.participantName}</p>
                          <p className="mt-0.5 text-sm text-slate-500">{cert.eventTitle}</p>
                          {cert.certificateNumber ? (
                            <p className="mt-1 font-mono text-xs text-slate-500">#{cert.certificateNumber}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {cert.pdfUrl ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(cert.pdfUrl, 'pdf', cert.certificateNumber, cert.id)}
                              disabled={
                                (downloadingCertId === cert.id && downloadingFormat === 'pdf') ||
                                downloadingAllPDF ||
                                downloadingAllPNG
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-900 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                              {downloadingCertId === cert.id && downloadingFormat === 'pdf' ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                              PDF
                            </button>
                          ) : null}
                          {cert.pngUrl ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(cert.pngUrl, 'png', cert.certificateNumber, cert.id)}
                              disabled={
                                (downloadingCertId === cert.id && downloadingFormat === 'png') ||
                                downloadingAllPDF ||
                                downloadingAllPNG
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {downloadingCertId === cert.id && downloadingFormat === 'png' ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              PNG
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => dismissCertificate(cert.id)}
                            disabled={downloadingCertId === cert.id || downloadingAllPDF || downloadingAllPNG}
                            className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            title="Remove from list"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className={CARD}>
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">How it works</h3>
              <ol className="space-y-3 text-sm leading-relaxed text-slate-600">
                <li>
                  <span className="font-medium text-slate-800">1. Event </span>
                  Optional. Pick one to reuse its certificate design.
                </li>
                <li>
                  <span className="font-medium text-slate-800">2. Names </span>
                  Type them, import a file, or select people registered on the event.
                </li>
                <li>
                  <span className="font-medium text-slate-800">3. Generate </span>
                  Queue the jobs. Downloads appear here when each one finishes.
                </li>
              </ol>
            </div>

            {selectedEvent ? (
              <div className={CARD}>
                <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">Selected event</h3>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-slate-900">{selectedEvent.title}</p>
                  {selectedEvent.start_date ? (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {new Date(selectedEvent.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  ) : null}
                  {selectedEvent.venue ? (
                    <p className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedEvent.venue}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCustomizer && selectedEventId ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowCustomizer(false);
            }}
            {...overlayEnter}
          >
            <motion.div
              className="flex h-full max-h-[98vh] w-full max-w-[98vw] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
              onClick={(e) => e.stopPropagation()}
              {...panelEnter}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">Certificate design</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Changes save to this event</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomizer(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  aria-label="Close designer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden bg-slate-50">
                <CertificateDesigner
                  eventId={selectedEventId}
                  onSave={(newConfig) => {
                    setConfig(newConfig);
                    toast.success('Certificate design updated');
                  }}
                  draftMode={false}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showJobStatus ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowJobStatus(false);
            }}
            {...overlayEnter}
          >
            <motion.div
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
              onClick={(e) => e.stopPropagation()}
              {...panelEnter}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Generation status</h2>
                <button
                  type="button"
                  onClick={() => setShowJobStatus(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  aria-label="Close status"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <JobStatusViewer
                  jobIds={jobIds}
                  autoRefresh={true}
                  onJobComplete={() => {}}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
};

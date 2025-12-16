import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';
import { CertificateService } from '../../services/certificateService';
import { JobQueueService } from '../../services/jobQueueService';
import { useToast } from '../Toast';
import CertificateDesigner from '../CertificateDesigner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, X, Plus, Trash2, Loader2, FileText, Users, Settings, Eye, Download, CheckCircle, CheckCircle2, XCircle } from 'lucide-react';
import { JobStatusViewer } from '../JobStatusViewer';

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
  const [dismissedCertIds, setDismissedCertIds] = useState(new Set());
  const [downloadingCertId, setDownloadingCertId] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [downloadingAllPDF, setDownloadingAllPDF] = useState(false);
  const [downloadingAllPNG, setDownloadingAllPNG] = useState(false);

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
      setConfig(null);
    }
  }, [selectedEventId]);

  // Load registered participants when event is selected and input mode is 'event'
  useEffect(() => {
    const loadEventParticipants = async () => {
      if (selectedEventId && inputMode === 'event') {
        try {
          setLoadingEventParticipants(true);
          const result = await EventService.getEventParticipants(selectedEventId);
          if (result.error) {
            toast.error(result.error);
            setEventParticipants([]);
          } else {
            setEventParticipants(result.participants || []);
          }
        } catch (err) {
          console.error('Failed to load event participants:', err);
          toast.error('Failed to load event participants');
          setEventParticipants([]);
        } finally {
          setLoadingEventParticipants(false);
        }
      } else {
        setEventParticipants([]);
      }
    };

    loadEventParticipants();
  }, [selectedEventId, inputMode]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const result = await EventService.getAllEvents();
      if (result.error) {
        toast.error(result.error);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadEventAndConfig = async () => {
    try {
      const eventResult = await EventService.getEventById(selectedEventId);
      if (eventResult.error) {
        toast.error(eventResult.error);
        return;
      }
      setSelectedEvent(eventResult.event);

      // Load certificate config
      const configResult = await CertificateService.getCertificateConfig(selectedEventId);
      if (configResult.config) {
        setConfig(configResult.config);
      } else {
        // Use default config
        setConfig(getDefaultConfig());
      }
    } catch (err) {
      toast.error('Failed to load event data');
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

  const clearAllCertificates = () => {
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
      console.warn('❌ No URL provided for download');
      toast.error(`${format.toUpperCase()} certificate not available`);
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

      toast.success('Certificate downloaded successfully!');
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
        toast.error(`Failed to download certificate: ${err.message || 'Unknown error'}`);
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
        toast.error('Failed to download PDF certificates');
      }
    } catch (err) {
      console.error('Download all PDF error:', err);
      toast.error(`Failed to download some PDF certificates: ${err.message || 'Unknown error'}`);
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
        toast.error('Failed to download PNG certificates');
      }
    } catch (err) {
      console.error('Download all PNG error:', err);
      toast.error(`Failed to download some PNG certificates: ${err.message || 'Unknown error'}`);
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
      toast.error('Please enter a participant name');
      return;
    }
    // Check if participant (as string) already exists
    const exists = participants.some(p =>
      typeof p === 'string' ? p === name : (p.participantName || p.name) === name
    );
    if (exists) {
      toast.error('Participant already in list');
      return;
    }
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
    const newParticipants = [];

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
              toast.error('No valid names found in CSV. Please ensure the file has a "name" column.');
              return;
            }

            setParticipants([...participants, ...names]);
            toast.success(`Imported ${names.length} participant(s) from CSV`);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          },
          error: (error) => {
            toast.error(`Failed to parse CSV: ${error.message}`);
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

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
              toast.error('No valid names found in Excel file. Please ensure the file has a "name" column.');
              return;
            }

            setParticipants([...participants, ...names]);
            toast.success(`Imported ${names.length} participant(s) from Excel`);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } catch (err) {
            toast.error(`Failed to parse Excel file: ${err.message}`);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        toast.error('Unsupported file format. Please upload a CSV or Excel file.');
      }
    } catch (err) {
      toast.error(`Failed to process file: ${err.message}`);
    }
  };

  const handleGenerate = async () => {
    if (participants.length === 0) {
      toast.error('Please add at least one participant');
      return;
    }

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

    setGenerating(true);
    setGenerationProgress({ current: 0, total: participants.length });
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
      toast.error(`Failed to queue certificates: ${err.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Standalone Certificate Generator</h1>
          <p className="text-slate-600">Generate certificates for multiple participants via manual entry or CSV/Excel import</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Selection */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Event Selection
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Event (Optional)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Event (Custom Certificate)</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                  {selectedEventId && (
                    <p className="mt-2 text-sm text-slate-600">
                      Event selected. You can customize the certificate design below.
                    </p>
                  )}
                </div>

                {selectedEventId && (
                  <button
                    onClick={() => setShowCustomizer(!showCustomizer)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {showCustomizer ? 'Hide Customizer' : 'Customize Certificate Design'}
                  </button>
                )}
              </div>
            </div>

            {/* Certificate Customizer Modal */}
            {showCustomizer && selectedEventId && (
              <div className="fixed inset-0 z-50 overflow-hidden">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowCustomizer(false)}
                />

                {/* Modal Container - Full Screen */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div
                    className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[98vw] max-h-[98vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex-shrink-0">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                          <Settings className="w-6 h-6 text-blue-600" />
                          Certificate Designer
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">Customize your certificate design with live preview</p>
                      </div>
                      <button
                        onClick={() => setShowCustomizer(false)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Close customizer"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Certificate Designer Content - Full Height with Scroll */}
                    <div className="flex-1 overflow-auto bg-slate-50">
                      <div className="w-full min-h-full py-6">
                        <CertificateDesigner
                          eventId={selectedEventId}
                          onSave={(newConfig) => {
                            setConfig(newConfig);
                            toast.success('Certificate design updated');
                          }}
                          draftMode={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Config for No Event */}
            {!selectedEventId && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Certificate Configuration</h2>
                <p className="text-slate-600 mb-4">
                  For custom certificates without an event, the default certificate design will be used.
                  To customize, please select an event first.
                </p>
                {!config && (
                  <button
                    onClick={() => setConfig(getDefaultConfig())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Initialize Default Config
                  </button>
                )}
              </div>
            )}

            {/* Participant Input */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants
              </h2>

              {/* Input Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setInputMode('manual');
                    // Clear event participants selection when switching modes
                    if (inputMode === 'event') {
                      setParticipants(participants.filter(p => typeof p === 'string'));
                    }
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${inputMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => {
                    setInputMode('file');
                    // Clear event participants selection when switching modes
                    if (inputMode === 'event') {
                      setParticipants(participants.filter(p => typeof p === 'string'));
                    }
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${inputMode === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  Import File
                </button>
                <button
                  onClick={() => {
                    setInputMode('event');
                    // Clear manual/file participants when switching to event mode
                    setParticipants(participants.filter(p => typeof p === 'object'));
                    if (!selectedEventId) {
                      toast.warning('Please select an event first');
                    }
                  }}
                  disabled={!selectedEventId}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${inputMode === 'event'
                    ? 'bg-blue-600 text-white'
                    : selectedEventId
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  title={!selectedEventId ? 'Select an event first' : ''}
                >
                  From Event
                </button>
              </div>

              {/* Manual Entry */}
              {inputMode === 'manual' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={participantInput}
                      onChange={(e) => setParticipantInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddParticipant();
                        }
                      }}
                      placeholder="Enter participant name"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleAddParticipant}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload */}
              {inputMode === 'file' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-2">Upload CSV or Excel file</p>
                    <p className="text-sm text-slate-500 mb-4">
                      File should have a "name" column with participant names
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="participant-file-input"
                    />
                    <label
                      htmlFor="participant-file-input"
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                </div>
              )}

              {/* Event Participants Selection */}
              {inputMode === 'event' && (
                <div className="space-y-4">
                  {!selectedEventId ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                      <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">Please select an event first to view registered participants</p>
                    </div>
                  ) : loadingEventParticipants ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-slate-600">Loading registered participants...</p>
                    </div>
                  ) : eventParticipants.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                      <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No registered participants found for this event</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-2">
                      {eventParticipants.map((participant) => {
                        const participantId = participant.user_id || participant.users?.id;
                        const participantUser = participant.users || participant;
                        // Construct full name including middle initial if available
                        const nameParts = [participantUser.first_name || ''];
                        if (participantUser.middle_initial) {
                          nameParts.push(participantUser.middle_initial);
                        }
                        nameParts.push(participantUser.last_name || '');
                        const participantName = nameParts.filter(part => part.trim()).join(' ').trim() || participantUser.email || 'Participant';
                        const isSelected = participants.some(p =>
                          typeof p === 'object' && p.userId === participantId
                        );

                        return (
                          <button
                            key={participantId}
                            onClick={() => handleToggleEventParticipant(participant)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-900'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                  {participantName}
                                </p>
                                {participantUser.email && (
                                  <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                                    {participantUser.email}
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Participant List */}
              {participants.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Participant List ({participants.length})
                    </h3>
                    <button
                      onClick={() => {
                        setParticipants([]);
                        // Clear participants from sessionStorage
                        const storageKey = 'standalone_cert_generator_state';
                        const currentState = sessionStorage.getItem(storageKey);
                        if (currentState) {
                          try {
                            const state = JSON.parse(currentState);
                            state.participants = [];
                            sessionStorage.setItem(storageKey, JSON.stringify(state));
                          } catch (err) {
                            console.error('Failed to update sessionStorage:', err);
                          }
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                    {participants.map((participant, index) => {
                      // Handle both string (manual/file) and object (from event) participants
                      const displayName = typeof participant === 'string'
                        ? participant
                        : participant.participantName || 'Participant';
                      const displayEmail = typeof participant === 'object' && participant.email
                        ? participant.email
                        : null;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border-b border-slate-100 last:border-b-0"
                        >
                          <div>
                            <span className="text-slate-700 font-medium">{displayName}</span>
                            {displayEmail && (
                              <p className="text-xs text-slate-500">{displayEmail}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveParticipant(index)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <button
                onClick={handleGenerate}
                disabled={generating || participants.length === 0 || !config}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:from-blue-700 hover:to-blue-900 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating... ({generationProgress.current}/{generationProgress.total})
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate {participants.length} Certificate(s)
                  </>
                )}
              </button>

              {generating && (
                <div className="mt-4">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 mt-2 text-center">
                    Queued {generationProgress.current} of {generationProgress.total} certificates
                  </p>
                </div>
              )}

              {jobIds.length > 0 && !generating && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    ✓ Successfully queued {jobIds.length} certificate(s) for generation
                  </p>
                  <p className="text-sm text-green-600 mt-1 mb-3">
                    Certificates are being processed in the background.
                  </p>
                  <button
                    onClick={() => setShowJobStatus(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View Job Status
                  </button>
                </div>
              )}

              {/* Show message if no jobs but user might want to check status */}
              {jobIds.length === 0 && !generating && participants.length === 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium mb-2">
                    View All Certificate Generation Jobs
                  </p>
                  <p className="text-sm text-blue-600 mb-3">
                    Check the status of all your certificate generation jobs.
                  </p>
                  <button
                    onClick={() => setShowJobStatus(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View All Jobs
                  </button>
                </div>
              )}
            </div>

            {/* Download Certificates Section */}
            {completedCertificates.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 mb-1">
                      <Download className="w-5 h-5 text-blue-600" />
                      Download Certificates
                    </h2>
                    <p className="text-sm text-slate-500 ml-7">
                      {completedCertificates.length} certificate{completedCertificates.length !== 1 ? 's' : ''} ready
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadCompletedCertificates()}
                      disabled={loadingCompleted}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Refresh list"
                    >
                      <Loader2 className={`w-4 h-4 ${loadingCompleted ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={clearAllCertificates}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Clear all certificates from list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bulk Download Actions */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Bulk Download</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownloadAllPDF}
                      disabled={downloadingAllPDF || downloadingAllPNG || completedCertificates.length === 0}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                      title="Download all PDF certificates"
                    >
                      {downloadingAllPDF ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Downloading PDFs...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download All PDF</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadAllPNG}
                      disabled={downloadingAllPDF || downloadingAllPNG || completedCertificates.length === 0}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                      title="Download all PNG certificates"
                    >
                      {downloadingAllPNG ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Downloading PNGs...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download All PNG</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {completedCertificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800">{cert.participantName}</h3>
                          <p className="text-sm text-slate-600 mt-1">{cert.eventTitle}</p>
                          {cert.certificateNumber && (
                            <p className="text-xs text-slate-500 mt-1">Certificate: {cert.certificateNumber}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {cert.pdfUrl && (
                            <button
                              onClick={() => handleDownload(cert.pdfUrl, 'pdf', cert.certificateNumber, cert.id)}
                              disabled={downloadingCertId === cert.id && downloadingFormat === 'pdf' || downloadingAllPDF || downloadingAllPNG}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Download PDF"
                            >
                              {downloadingCertId === cert.id && downloadingFormat === 'pdf' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  PDF
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  PDF
                                </>
                              )}
                            </button>
                          )}
                          {cert.pngUrl && (
                            <button
                              onClick={() => handleDownload(cert.pngUrl, 'png', cert.certificateNumber, cert.id)}
                              disabled={downloadingCertId === cert.id && downloadingFormat === 'png' || downloadingAllPDF || downloadingAllPNG}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Download PNG"
                            >
                              {downloadingCertId === cert.id && downloadingFormat === 'png' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  PNG
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  PNG
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => dismissCertificate(cert.id)}
                            disabled={downloadingCertId === cert.id || downloadingAllPDF || downloadingAllPNG}
                            className="px-2 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove from list"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Info/Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Instructions</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-700 mb-1">1. Select Event (Optional)</p>
                  <p>Choose an event to use its certificate design, or leave blank for custom certificates.</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">2. Add Participants</p>
                  <p>Manually enter names or import from CSV/Excel file with a "name" column.</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">3. Customize (If Event Selected)</p>
                  <p>Click "Customize Certificate Design" to temporarily modify the design.</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">4. Generate</p>
                  <p>Click "Generate" to queue certificates for background processing.</p>
                </div>
              </div>
            </div>

            {selectedEvent && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Event Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Title:</span> {selectedEvent.title}</p>
                  <p><span className="font-medium">Date:</span> {selectedEvent.start_date}</p>
                  {selectedEvent.venue && (
                    <p><span className="font-medium">Venue:</span> {selectedEvent.venue}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Status Modal */}
      {showJobStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Certificate Generation Status</h2>
              <button
                onClick={() => setShowJobStatus(false)}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <JobStatusViewer
                jobIds={jobIds}
                autoRefresh={true}
                onJobComplete={(job) => {
                  // Optional: Handle job completion
                  console.log('Job completed:', job);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};


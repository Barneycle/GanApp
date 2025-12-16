import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { CertificateService } from '../services/certificateService';
import { EventService } from '../services/eventService';
import { JobQueueService } from '../services/jobQueueService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

const CertificateGenerator = ({ eventId, onClose, isMobile = false }) => {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const canvasRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);
  const [config, setConfig] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [jobStatus, setJobStatus] = useState('idle');
  const [jobId, setJobId] = useState(null);
  const [downloading, setDownloading] = useState({ pdf: false, png: false });
  const hasLoadedRef = useRef(false);
  const authTimeoutRef = useRef(null);
  const readyMessageSentRef = useRef(false);

  // Wait for auth to finish loading before attempting to load data
  useEffect(() => {
    // Clear any existing timeout
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }

    // Don't load if auth is still loading
    if (authLoading) {
      return;
    }

    // If auth finished loading but no user, show error after a short delay
    if (!authLoading && !user?.id && eventId) {
      authTimeoutRef.current = setTimeout(() => {
        if (!hasLoadedRef.current) {
          console.error('❌ No user found after auth loading completed');
          setError('Authentication required. Please make sure you are logged in. If you came from the mobile app, try logging in again.');
          setLoading(false);
          hasLoadedRef.current = true;

          // Notify mobile app of error
          if (isMobile && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Authentication failed. Please log in again.'
            }));
          }
        }
      }, 3000); // Give 3 seconds for token auth to complete

      return () => {
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      };
    }

    // Load data when we have both eventId and user
    if (eventId && user?.id && !hasLoadedRef.current) {
      console.log('✅ User found, loading certificate data. User ID:', user.id);
      hasLoadedRef.current = true;
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      loadData();
      // Check for pending job after page refresh
      checkPendingJob();
    } else if (eventId && !user?.id && !authLoading) {
      console.log('⚠️ No user found but auth loading is complete. EventId:', eventId);
    }
  }, [eventId, user?.id, authLoading, isMobile]);

  // Generate preview on-the-fly if certificate exists but no preview URL
  useEffect(() => {
    if (certificate && !previewData && config && event && !loading) {
      const generatePreview = async () => {
        try {
          // Always generate preview on-the-fly for consistency
          const { generatePNGCertificate } = await import('../utils/certificateGenerator');
          const blob = await generatePNGCertificate(
            config,
            certificate.certificate_number,
            {
              participantName: getUserName(),
              eventTitle: event.title,
              completionDate: event.start_date || new Date().toISOString().split('T')[0],
              venue: event.venue || ''
            }
          );
          const previewUrl = window.URL.createObjectURL(blob);
          setPreviewData({
            type: 'png',
            url: previewUrl
          });
        } catch (previewError) {
          console.warn('Failed to generate preview:', previewError);
          // Try using stored URL as fallback
          if (certificate.certificate_png_url) {
            setPreviewData({
              type: 'png',
              url: certificate.certificate_png_url
            });
          } else if (certificate.certificate_pdf_url) {
            setPreviewData({
              type: 'pdf',
              url: certificate.certificate_pdf_url
            });
          }
        }
      };
      generatePreview();
    }
  }, [certificate, previewData, config, event, loading]);

  // Notify mobile WebView when loading completes or error occurs
  useEffect(() => {
    if (isMobile && window.ReactNativeWebView && eventId && !readyMessageSentRef.current) {
      // Send error message immediately if there's an error
      if (error) {
        console.log('📤 Sending error message to mobile:', error);
        readyMessageSentRef.current = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: error
        }));
        return;
      }

      // Send ready message when:
      // 1. Auth has finished loading
      // 2. Data loading has finished (either successfully or with error)
      // 3. We have some data to show (certificate, config, event) OR we've determined there's no user
      if (!authLoading && !loading) {
        const hasData = certificate || config || event;
        const hasNoUser = !user?.id && !authLoading; // User check completed but no user

        if (hasData || hasNoUser) {
          console.log('📤 Sending ready message to mobile. Has data:', hasData, 'Has no user:', hasNoUser);
          readyMessageSentRef.current = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ready'
          }));
        } else {
          console.log('⏳ Waiting for data. Loading:', loading, 'AuthLoading:', authLoading, 'User:', user?.id);
        }
      }
    }
  }, [loading, authLoading, error, certificate, config, event, isMobile, eventId, user?.id]);

  // Fallback: Send ready message after 15 seconds if we haven't sent it yet
  useEffect(() => {
    if (isMobile && window.ReactNativeWebView && eventId && !readyMessageSentRef.current) {
      const fallbackTimeout = setTimeout(() => {
        if (!readyMessageSentRef.current) {
          console.warn('⏱️ Fallback: Sending ready message after timeout');
          readyMessageSentRef.current = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ready'
          }));
        }
      }, 15000); // 15 second fallback

      return () => clearTimeout(fallbackTimeout);
    }
  }, [isMobile, eventId]);

  // Prevent body scroll when modal is open (only for non-mobile)
  useEffect(() => {
    if (!isMobile) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobile]);

  // Check for pending job in sessionStorage
  const checkPendingJob = async () => {
    if (!eventId || !user?.id) return;

    const storageKey = `cert_job_${eventId}_${user.id}`;
    const storedJobId = sessionStorage.getItem(storageKey);

    if (storedJobId) {
      setJobId(storedJobId);
      setGenerating(true);
      setJobStatus('processing');

      // Check current status
      const statusResult = await JobQueueService.getJobStatus(storedJobId);
      if (statusResult.job) {
        const job = statusResult.job;
        if (job.status === 'completed') {
          setJobStatus('completed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);
          // Reload certificate
          const certResult = await CertificateService.getUserCertificate(user.id, eventId);
          if (certResult.certificate) {
            setCertificate(certResult.certificate);
            toast.success('Certificate generated successfully!');
          }
        } else if (job.status === 'failed') {
          setError(job.error_message || 'Certificate generation failed');
          setJobStatus('failed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);
        } else {
          // Still processing, resume polling
          pollJobStatus(storedJobId);
        }
      } else {
        // Job not found, clear storage
        sessionStorage.removeItem(storageKey);
        setGenerating(false);
        setJobStatus('idle');
      }
    }
  };

  // Default config (same as CertificateDesigner)
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
    width: 2500,  // Original certificate dimensions
    height: 1768,  // Maintains aspect ratio (approximately 16:11)
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
        font_size: 20,
        color: '#000000',
        position: { x: 50, y: 8 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal'
      },
      university_config: {
        font_size: 28,
        color: '#000000',
        position: { x: 50, y: 11 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'bold'
      },
      location_config: {
        font_size: 20,
        color: '#000000',
        position: { x: 50, y: 14 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal'
      }
    },
    logo_config: {
      logos: [], // Array of logo objects: { url, size: {width, height}, position: {x, y} }
      sponsor_logos: [],
      sponsor_logo_size: { width: 80, height: 80 },
      sponsor_logo_position: { x: 90, y: 5 },
      sponsor_logo_spacing: 10
    },
    participation_text_config: {
      text_template: 'For his/her active participation during the {EVENT_NAME} held on {EVENT_DATE} at {VENUE}',
      font_size: 18,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
      line_height: 1.5
    },
    is_given_to_config: {
      text: 'This certificate is proudly presented to',
      font_size: 16,
      color: '#000000',
      position: { x: 50, y: 38 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal'
    },
    signature_blocks: [],
    cert_id_prefix: '',
    cert_id_position: { x: 50, y: 75 },
    cert_id_font_size: 16,
    cert_id_color: '#000000',
    qr_code_enabled: false,
    qr_code_size: 60,
    qr_code_position: { x: 60, y: 75 },
    background_image_size: { width: 2500, height: 1768 }  // Original certificate dimensions
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load event
      const eventResult = await EventService.getEventById(eventId);
      if (eventResult.error) {
        setError(eventResult.error);
        toast.error(eventResult.error);
        setLoading(false);
        return;
      }
      setEvent(eventResult.event);

      // Load certificate config
      const configResult = await CertificateService.getCertificateConfig(eventId);
      const defaultConfig = getDefaultConfig();

      if (configResult.error) {
        setConfig(defaultConfig);
      } else if (!configResult.config) {
        setConfig(defaultConfig);
      } else {
        // Deep merge with default config to ensure all fields are present
        const mergedConfig = {
          ...defaultConfig,
          ...configResult.config,
          header_config: { ...defaultConfig.header_config, ...(configResult.config.header_config || {}) },
          logo_config: {
            ...defaultConfig.logo_config,
            ...(configResult.config.logo_config || {}),
            logos: configResult.config.logo_config?.logos || defaultConfig.logo_config.logos || []
          },
          participation_text_config: {
            ...defaultConfig.participation_text_config,
            ...(configResult.config.participation_text_config || {}),
            position: {
              ...defaultConfig.participation_text_config.position,
              ...(configResult.config.participation_text_config?.position || {})
            }
          },
          is_given_to_config: { ...defaultConfig.is_given_to_config, ...(configResult.config.is_given_to_config || {}) },
          name_config: { ...defaultConfig.name_config, ...(configResult.config.name_config || {}) },
          event_title_config: { ...defaultConfig.event_title_config, ...(configResult.config.event_title_config || {}) },
          date_config: { ...defaultConfig.date_config, ...(configResult.config.date_config || {}) },
          signature_blocks: configResult.config.signature_blocks || defaultConfig.signature_blocks,
          cert_id_prefix: configResult.config.cert_id_prefix || defaultConfig.cert_id_prefix,
          cert_id_position: configResult.config.cert_id_position || defaultConfig.cert_id_position,
          cert_id_font_size: configResult.config.cert_id_font_size || defaultConfig.cert_id_font_size,
          cert_id_color: configResult.config.cert_id_color || defaultConfig.cert_id_color,
          qr_code_enabled: configResult.config.qr_code_enabled !== undefined ? configResult.config.qr_code_enabled : defaultConfig.qr_code_enabled,
          qr_code_size: configResult.config.qr_code_size || defaultConfig.qr_code_size,
          qr_code_position: configResult.config.qr_code_position || defaultConfig.qr_code_position,
          background_image_size: configResult.config.background_image_size || defaultConfig.background_image_size
        };
        setConfig(mergedConfig);
      }

      // Check if certificate already exists
      const certResult = await CertificateService.getUserCertificate(user.id, eventId);
      if (certResult.certificate) {
        setCertificate(certResult.certificate);
        // Load preview - try PNG first, then PDF, then generate on-the-fly
        if (certResult.certificate.certificate_png_url) {
          setPreviewData({
            type: 'png',
            url: certResult.certificate.certificate_png_url
          });
        } else if (certResult.certificate.certificate_pdf_url) {
          setPreviewData({
            type: 'pdf',
            url: certResult.certificate.certificate_pdf_url
          });
        } else {
          // Generate preview on-the-fly if URLs are not available
          try {
            const { generatePNGCertificate } = await import('../utils/certificateGenerator');
            const blob = await generatePNGCertificate(
              mergedConfig,
              certResult.certificate.certificate_number,
              {
                participantName: getUserName(),
                eventTitle: event.title,
                completionDate: event.start_date || new Date().toISOString().split('T')[0],
                venue: event.venue || ''
              }
            );
            const previewUrl = window.URL.createObjectURL(blob);
            setPreviewData({
              type: 'png',
              url: previewUrl
            });
          } catch (previewError) {
            console.warn('Failed to generate preview:', previewError);
            // Leave previewData as null to show "Preview not available"
          }
        }
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to load certificate data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    const date = new Date(dateString);
    const format = config?.date_config?.date_format || 'MMMM DD, YYYY';

    if (format === 'MMMM DD, YYYY') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    return date.toLocaleDateString();
  };

  const getUserName = () => {
    if (!user) {
      return user?.email?.split('@')[0] || 'Participant';
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

  const generatePDF = async (certificateNumber = null) => {
    if (!config || !event) return null;

    try {
      // First, generate the PNG certificate
      const { generatePNGCertificate, convertPNGToPDF } = await import('../utils/certificateGenerator');

      console.log('🖼️ Generating PNG certificate...');
      const pngBlob = await generatePNGCertificate(
        config,
        certificateNumber || certificate?.certificate_number,
        {
          participantName: getUserName(),
          eventTitle: event.title,
          completionDate: event.start_date || new Date().toISOString().split('T')[0],
          venue: event.venue || ''
        }
      );

      if (!pngBlob) {
        throw new Error('Failed to generate PNG certificate');
      }

      console.log('📄 Converting PNG to PDF...');
      // Convert PNG to PDF
      const width = config.width || 2500;  // Original certificate width
      const height = config.height || 1768; // Original certificate height
      const pdfBytes = await convertPNGToPDF(pngBlob, width, height);

      console.log('✅ PDF generated successfully');
      return pdfBytes;
    } catch (error) {
      console.error('❌ Error generating PDF from PNG:', error);
      throw error;
    }
  };

  const generatePNG = async (certificateNumber = null) => {
    if (!config || !event) return null;

    // Ensure fonts are loaded before creating canvas
    await document.fonts.ready;

    const canvas = document.createElement('canvas');
    const width = config.width || 2500;  // Original certificate width
    const height = config.height || 1768; // Original certificate height
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Helper function to load and draw image
    const drawImage = async (url, x, y, imgWidth, imgHeight) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, x, y, imgWidth, imgHeight);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    };

    // Background - use image only
    if (config.background_image_url) {
      // Fill with white first as fallback
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      // Draw background image on top
      await drawImage(config.background_image_url, 0, 0, width, height);
    } else {
      // Default white background if no image
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // Border
    if (config.border_width && config.border_width > 0) {
      ctx.strokeStyle = config.border_color || '#1e40af';
      ctx.lineWidth = config.border_width;
      ctx.strokeRect(
        config.border_width / 2,
        config.border_width / 2,
        width - config.border_width,
        height - config.border_width
      );
    }

    const header = config.header_config || {};
    const participation = config.participation_text_config || {};
    const isGivenTo = config.is_given_to_config || {};
    const nameConfig = config.name_config || {};
    const participantName = getUserName();

    // Logos
    if (config.logo_config?.logos && config.logo_config.logos.length > 0) {
      for (const logo of config.logo_config.logos) {
        const logoSize = logo.size || { width: 120, height: 120 };
        const logoPos = logo.position || { x: 15, y: 10 };
        await drawImage(
          logo.url,
          (width * logoPos.x) / 100,
          (height * logoPos.y) / 100,
          logoSize.width,
          logoSize.height
        );
      }
    }

    // Sponsor Logos
    if (config.logo_config?.sponsor_logos && config.logo_config.sponsor_logos.length > 0) {
      const sponsorSize = config.logo_config.sponsor_logo_size || { width: 80, height: 80 };
      const sponsorPos = config.logo_config.sponsor_logo_position || { x: 90, y: 5 };
      const spacing = config.logo_config.sponsor_logo_spacing || 10;
      for (let i = 0; i < config.logo_config.sponsor_logos.length; i++) {
        await drawImage(
          config.logo_config.sponsor_logos[i],
          (width * sponsorPos.x) / 100,
          (height * sponsorPos.y) / 100 + (i * (sponsorSize.height + spacing)),
          sponsorSize.width,
          sponsorSize.height
        );
      }
    }

    // Header - Republic
    if (header.republic_text && header.republic_config) {
      const repConfig = header.republic_config;
      ctx.fillStyle = repConfig.color || '#000000';
      ctx.font = `${repConfig.font_weight || 'normal'} ${repConfig.font_size || 20}px ${repConfig.font_family || 'Libre Baskerville, serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        header.republic_text,
        (width * repConfig.position.x) / 100,
        (height * repConfig.position.y) / 100
      );
    }

    // Header - University
    if (header.university_text && header.university_config) {
      const uniConfig = header.university_config;
      ctx.fillStyle = uniConfig.color || '#000000';
      ctx.font = `${uniConfig.font_weight || 'bold'} ${uniConfig.font_size || 28}px ${uniConfig.font_family || 'Libre Baskerville, serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        header.university_text,
        (width * uniConfig.position.x) / 100,
        (height * uniConfig.position.y) / 100
      );
    }

    // Header - Location
    if (header.location_text && header.location_config) {
      const locConfig = header.location_config;
      ctx.fillStyle = locConfig.color || '#000000';
      ctx.font = `${locConfig.font_weight || 'normal'} ${locConfig.font_size || 20}px ${locConfig.font_family || 'Libre Baskerville, serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        header.location_text,
        (width * locConfig.position.x) / 100,
        (height * locConfig.position.y) / 100
      );
    }

    // Title
    if (config.title_text) {
      ctx.fillStyle = config.title_color || '#000000';
      ctx.font = `bold ${config.title_font_size || 56}px Libre Baskerville, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        config.title_text,
        (width * config.title_position.x) / 100,
        (height * (config.title_position.y - 4)) / 100
      );
    }

    // Title Subtitle
    if (config.title_subtitle) {
      ctx.fillStyle = config.title_color || '#000000';
      ctx.font = `normal ${(config.title_font_size || 56) * 0.4}px Libre Baskerville, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        config.title_subtitle,
        (width * config.title_position.x) / 100,
        (height * (config.title_position.y + 2)) / 100
      );
    }

    // "is given to" Text
    if (isGivenTo.text) {
      ctx.fillStyle = isGivenTo.color || '#000000';
      ctx.font = `${isGivenTo.font_weight || 'normal'} ${isGivenTo.font_size || 16}px ${isGivenTo.font_family || 'Libre Baskerville, serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        isGivenTo.text,
        (width * isGivenTo.position.x) / 100,
        (height * isGivenTo.position.y) / 100
      );
    }

    // Participant Name
    ctx.fillStyle = nameConfig.color || '#000000';
    const fontFamily = nameConfig.font_family || 'MonteCarlo, cursive';

    // Wait for all fonts to be ready before rendering
    await document.fonts.ready;

    // Load MonteCarlo font if not already loaded
    try {
      if (fontFamily.includes('MonteCarlo')) {
        await document.fonts.load(`${nameConfig.font_weight || 'normal'} ${nameConfig.font_size || 48}px MonteCarlo`);
      }
    } catch (e) {
      console.warn('Could not load MonteCarlo font for canvas:', e);
    }

    // Set font and render
    ctx.font = `${nameConfig.font_weight || 'bold'} ${nameConfig.font_size || 48}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const nameX = (width * nameConfig.position.x) / 100;
    const nameY = (height * nameConfig.position.y) / 100;

    ctx.fillText(
      participantName,
      nameX,
      nameY
    );

    // Draw underline for the name with spacing
    const textMetrics = ctx.measureText(participantName);
    const textWidth = textMetrics.width;
    const underlineOffset = (nameConfig.font_size || 48) * 0.15; // 15% of font size for spacing
    const underlineY = nameY + underlineOffset;
    const underlineStartX = nameX - (textWidth / 2);
    const underlineEndX = nameX + (textWidth / 2);

    ctx.strokeStyle = nameConfig.color || '#000000';
    ctx.lineWidth = Math.max(2, (nameConfig.font_size || 48) * 0.04); // 4% of font size, minimum 2px
    ctx.beginPath();
    ctx.moveTo(underlineStartX, underlineY);
    ctx.lineTo(underlineEndX, underlineY);
    ctx.stroke();

    // Participation Text - Handle multi-line
    if (participation.text_template) {
      const participationText = participation.text_template
        .replace('{EVENT_NAME}', event.title)
        .replace('{EVENT_DATE}', formatDate(event.start_date))
        .replace('{VENUE}', event.venue && event.venue.trim() ? event.venue : '[Venue]');

      ctx.fillStyle = participation.color || '#000000';
      ctx.font = `${participation.font_weight || 'normal'} ${participation.font_size || 18}px ${participation.font_family || 'Libre Baskerville, serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = participationText.split('\n');
      const lineHeight = (participation.font_size || 18) * (participation.line_height || 1.5);
      const startY = (height * participation.position.y) / 100 - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          (width * participation.position.x) / 100,
          startY + (index * lineHeight)
        );
      });
    }

    // Signature Blocks
    const signatures = config.signature_blocks || [];
    for (const signature of signatures) {
      const sigX = (width * (signature.position_config?.x || 50)) / 100;
      const sigY = (height * (signature.position_config?.y || 92)) / 100;

      // Signature Image
      if (signature.signature_image_url) {
        const imgWidth = signature.signature_image_width || 300;
        const imgHeight = signature.signature_image_height || 100;
        await drawImage(
          signature.signature_image_url,
          sigX - imgWidth / 2,
          sigY - imgHeight - 20,
          imgWidth,
          imgHeight
        );
      }

      // Name
      if (signature.name) {
        ctx.fillStyle = signature.name_color || '#000000';
        ctx.font = `bold ${signature.name_font_size || 14}px ${signature.font_family || 'Libre Baskerville, serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signature.name, sigX, sigY);
      }

      // Position
      if (signature.position) {
        ctx.fillStyle = signature.position_color || '#000000';
        ctx.font = `${signature.position_font_size || 12}px ${signature.font_family || 'Libre Baskerville, serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signature.position, sigX, sigY + 20);
      }
    }

    // Certificate ID and QR Code
    if (config.cert_id_prefix && certificateNumber) {
      const certIdSize = config.cert_id_font_size || 14;
      const certIdPos = config.cert_id_position || { x: 50, y: 95 };
      const certIdX = (width * certIdPos.x) / 100;
      const certIdY = (height * certIdPos.y) / 100;

      // Draw QR Code beside cert ID if enabled
      if (config.qr_code_enabled !== false) {
        try {
          const qrSize = config.qr_code_size || 60;
          const qrGap = 15; // Gap between cert ID and QR code
          // Calculate cert ID text width and position QR code to the right
          ctx.save();
          ctx.font = `${certIdSize}px Arial, sans-serif`;
          const certIdTextWidth = ctx.measureText(certificateNumber).width;
          ctx.restore();
          // Position QR code to the right of cert ID text (center + half width + gap)
          const qrX = certIdX + certIdTextWidth / 2 + qrGap;
          const qrY = certIdY - qrSize / 2;

          // Center cert ID vertically with QR code
          const certIdYCentered = qrY + qrSize / 2;

          // Draw Certificate ID (centered vertically with QR code)
          ctx.fillStyle = config.cert_id_color || '#000000';
          ctx.font = `${certIdSize}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(certificateNumber, certIdX, certIdYCentered);

          // Generate QR code with verification URL
          // Ensure we have a proper URL format (not just text)
          if (!certificateNumber) {
            console.error('Certificate number is missing for QR code');
            throw new Error('Certificate number is required for QR code generation');
          }

          const baseUrl = window.location.origin || (window.location.protocol + '//' + window.location.host);
          const verificationUrl = `${baseUrl}/verify-certificate/${encodeURIComponent(certificateNumber)}`;

          // Debug log - check browser console to verify URL is correct
          console.log('Generating QR code with URL:', verificationUrl);
          console.log('Certificate Number:', certificateNumber);

          // Ensure we're passing the URL, not just the certificate number
          if (!verificationUrl.startsWith('http://') && !verificationUrl.startsWith('https://')) {
            console.error('Invalid URL format:', verificationUrl);
            throw new Error('QR code URL must start with http:// or https://');
          }

          const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
            width: qrSize,
            margin: 1,
            errorCorrectionLevel: 'M'
          });

          // Verify QR code contains the URL (debug)
          console.log('QR Code generated for PNG, data URL length:', qrDataUrl.length);

          // Draw QR code image
          const qrImage = new Image();
          await new Promise((resolve, reject) => {
            qrImage.onload = () => {
              ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
              resolve();
            };
            qrImage.onerror = (err) => {
              console.error('Error loading QR code image:', err);
              reject(err);
            };
            qrImage.src = qrDataUrl;
          });
        } catch (qrError) {
          console.warn('Failed to generate QR code for PNG:', qrError);
        }
      } else {
        // No QR code, draw cert ID at original position
        ctx.fillStyle = config.cert_id_color || '#000000';
        ctx.font = `${certIdSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(certificateNumber, certIdX, certIdY);
      }
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1.0); // Best quality
    });
  };

  const handleGenerate = async () => {
    if (!eventId || !user?.id || !config || !event) return;

    // Check if certificate already exists (including those generated by organizer via standalone)
    if (certificate) {
      // Certificate already exists - reload it to ensure we have the latest data
      // This allows participants to view/download certificates generated by organizers
      const certResult = await CertificateService.getUserCertificate(user.id, eventId);
      if (certResult.certificate) {
        setCertificate(certResult.certificate);
        // Load preview if available
        if (certResult.certificate.certificate_png_url) {
          setPreviewData({
            type: 'png',
            url: certResult.certificate.certificate_png_url
          });
        } else if (certResult.certificate.certificate_pdf_url) {
          setPreviewData({
            type: 'pdf',
            url: certResult.certificate.certificate_pdf_url
          });
        }
        toast.info('Certificate already exists. You can download it below.');
        return;
      }
    }

    // Rate limiting check
    try {
      const { RateLimitService } = await import('../services/rateLimitService');
      const rateLimitResult = await RateLimitService.checkRateLimit(
        user.id,
        '/certificate-generate',
        RateLimitService.limits.certificateGenerate.maxRequests,
        RateLimitService.limits.certificateGenerate.windowSeconds
      );

      if (!rateLimitResult.allowed) {
        toast.error(`Too many certificate generation attempts. Please try again after ${new Date(rateLimitResult.resetAt).toLocaleTimeString()}.`);
        return;
      }
    } catch (rateLimitError) {
      // Fail open - allow generation if rate limit check fails
      console.warn('Rate limit check failed, allowing certificate generation:', rateLimitError);
    }

    setGenerating(true);
    setError(null);
    setJobStatus('queued');

    try {
      // Queue certificate generation job
      const jobResult = await JobQueueService.queueCertificateGeneration(
        {
          eventId,
          userId: user.id,
          participantName: getUserName(),
          eventTitle: event.title,
          completionDate: event.start_date || new Date().toISOString().split('T')[0]
        },
        user.id,
        5 // Normal priority
      );

      if (jobResult.error || !jobResult.job) {
        throw new Error(jobResult.error || 'Failed to queue certificate generation');
      }

      if (jobResult.job && jobResult.job.id) {
        const jobId = jobResult.job.id;
        setJobId(jobId);
        setJobStatus('queued');

        // Save job ID to sessionStorage for persistence
        const storageKey = `cert_job_${eventId}_${user.id}`;
        sessionStorage.setItem(storageKey, jobId);

        toast.info('Certificate generation queued. Processing in background...');

        // Trigger immediate job processing
        triggerJobProcessing();

        // Start polling for job status (with small initial delay to allow processing to start)
        setTimeout(() => {
          pollJobStatus(jobId);
        }, 500);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to queue certificate generation';
      setError(errorMessage);
      setJobStatus('failed');
      toast.error(errorMessage);
      setGenerating(false);
    }
  };

  // Trigger immediate job processing
  const triggerJobProcessing = async () => {
    try {
      // Import and trigger job processor directly for immediate processing
      const { CertificateJobProcessor } = await import('../services/certificateJobProcessor');
      // Process jobs immediately (this will pick up our queued job)
      // Use setTimeout to avoid blocking the UI
      setTimeout(async () => {
        try {
          await CertificateJobProcessor.processPendingJobs();
        } catch (err) {
          console.warn('Job processing error:', err);
        }
      }, 100);
    } catch (err) {
      console.warn('Failed to trigger immediate job processing:', err);
      // Continue with polling - worker will pick it up
    }
  };

  // Poll job status until completion
  const pollJobStatus = async (jobId) => {
    const maxAttempts = 120; // Poll for up to 10 minutes (5 second intervals)
    let attempts = 0;
    const storageKey = `cert_job_${eventId}_${user.id}`;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Certificate generation timed out. Please check back later.');
        setJobStatus('failed');
        setGenerating(false);
        sessionStorage.removeItem(storageKey);
        return;
      }

      attempts++;

      try {
        const statusResult = await JobQueueService.getJobStatus(jobId);

        if (statusResult.error || !statusResult.job) {
          setError('Failed to check job status. Please refresh the page.');
          setJobStatus('failed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);
          return;
        }

        const job = statusResult.job;

        if (job.status === 'completed') {
          setJobStatus('completed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);

          // Reload certificate data
          const certResult = await CertificateService.getUserCertificate(user.id, eventId);
          if (certResult.certificate) {
            setCertificate(certResult.certificate);
            toast.success('Certificate generated successfully!');
          } else {
            toast.success('Certificate generated! Please refresh to view.');
          }
        } else if (job.status === 'failed') {
          setError(job.error_message || 'Certificate generation failed');
          setJobStatus('failed');
          setGenerating(false);
          sessionStorage.removeItem(storageKey);
          toast.error('Certificate generation failed. Please try again.');
        } else {
          // Update status
          if (job.status === 'processing') {
            setJobStatus('processing');
          } else {
            setJobStatus('queued');
          }
          // Still processing, poll again
          setTimeout(poll, 2000); // Poll every 2 seconds for faster updates
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        setTimeout(poll, 2000); // Retry polling
      }
    };

    poll();
  };

  const handleDownload = async (format) => {
    console.log('📥 Download requested:', format, { certificate, hasPdfUrl: !!certificate?.certificate_pdf_url, hasPngUrl: !!certificate?.certificate_png_url });

    if (!certificate) {
      console.warn('❌ No certificate available for download');
      toast.error('Certificate not found. Please generate a certificate first.');
      return;
    }

    // Set downloading state
    setDownloading(prev => ({ ...prev, [format]: true }));

    // Use stored URL from certificate
    const url = format === 'pdf'
      ? certificate.certificate_pdf_url
      : certificate.certificate_png_url;

    if (!url) {
      console.warn(`❌ No ${format.toUpperCase()} URL available`);
      toast.error(`${format.toUpperCase()} certificate not available. The certificate may still be generating.`);
      setDownloading(prev => ({ ...prev, [format]: false }));
      return;
    }

    console.log('📥 Downloading from URL:', url);

    try {
      // For mobile WebView, send URL directly to let native app handle download
      // This avoids CORS and fetch issues in WebView
      if (isMobile && window.ReactNativeWebView) {
        console.log('📤 Sending download URL to mobile app:', format, url);
        try {
          const message = {
            type: 'download',
            format: format,
            url: url, // Send URL instead of base64
            filename: `certificate-${certificate.certificate_number}.${format}`,
            mimeType: format === 'pdf' ? 'application/pdf' : 'image/png'
          };
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
          toast.success('Preparing download...');
          setDownloading(prev => ({ ...prev, [format]: false }));
          return;
        } catch (err) {
          console.error('❌ Error sending download message:', err);
          toast.error('Failed to send download to mobile app');
          setDownloading(prev => ({ ...prev, [format]: false }));
          return;
        }
      }

      // For web, fetch and download to avoid CORS and ensure proper download
      // Add cache-busting parameter to ensure we get the latest version
      const urlWithCacheBust = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;

      // Fetch the file - use 'no-cors' mode for PNG to avoid CORS issues, but this limits response
      // For better control, try with 'cors' first, fallback to direct link
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
      link.download = `certificate-${certificate.certificate_number}.${format}`;
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
        link.download = `certificate-${certificate.certificate_number}.${format}`;
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
      // Reset downloading state
      setDownloading(prev => ({ ...prev, [format]: false }));
    }
  };

  // Don't render if no eventId
  if (!eventId) {
    return null;
  }

  // Render content based on mobile or modal mode
  const content = (
    <>
      {loading ? (
        <div
          className={isMobile ? 'h-screen flex items-center justify-center bg-white' : ''}
          style={isMobile ? {} : {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-center text-slate-600">Loading certificate data...</p>
          </div>
        </div>
      ) : (
        <div
          className={isMobile ? 'h-screen bg-white flex flex-col' : ''}
          style={isMobile ? {} : {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (!isMobile && e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div className={`bg-white ${isMobile ? 'flex-1 flex flex-col' : 'rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh]'} overflow-y-auto`}>
            <div className={`sticky top-0 bg-white border-b border-slate-200 ${isMobile ? 'p-4' : 'p-6'} flex justify-between items-center`}>
              <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-slate-800`}>Certificate</h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={`${isMobile ? 'p-4 flex-1' : 'p-6'}`}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {certificate ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 font-medium">Certificate already generated!</p>
                    <p className="text-blue-600 text-sm mt-1">Your certificate has been saved. You can download it below.</p>
                  </div>

                  {/* Preview */}
                  <div className="bg-slate-100 p-6 rounded-lg flex items-center justify-center">
                    {previewData?.type === 'png' ? (
                      <img
                        src={previewData.url}
                        alt="Certificate Preview"
                        className="max-w-full h-auto shadow-lg"
                      />
                    ) : previewData?.type === 'pdf' ? (
                      <iframe
                        src={previewData.url}
                        className="w-full h-[600px] border-0"
                        title="Certificate Preview"
                      />
                    ) : (
                      <p className="text-slate-500">Preview not available</p>
                    )}
                  </div>

                  {/* Download Buttons - Always show since we generate on-the-fly */}
                  <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 ${isMobile ? 'w-full' : 'justify-center'}`}>
                    <button
                      onClick={() => handleDownload('pdf')}
                      disabled={downloading.pdf || !certificate?.certificate_pdf_url}
                      className={`${isMobile ? 'w-full' : ''} px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {downloading.pdf ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Download PDF
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload('png')}
                      disabled={downloading.png || !certificate?.certificate_png_url}
                      className={`${isMobile ? 'w-full' : ''} px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {downloading.png ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Download PNG
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-slate-600 mb-4">
                      Generate your certificate of participation for this event.
                    </p>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className={`px-8 py-4 rounded-lg font-semibold text-white transition-colors ${generating
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {jobStatus === 'queued' && 'Queuing Certificate...'}
                          {jobStatus === 'processing' && 'Generating Certificate...'}
                          {jobStatus === 'completed' && 'Certificate Generated!'}
                          {!jobStatus || jobStatus === 'idle' ? 'Generating Certificate...' : ''}
                        </span>
                      ) : (
                        'Generate Certificate'
                      )}
                    </button>

                    {generating && jobStatus && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          <p className="text-sm font-medium text-blue-800">
                            {jobStatus === 'queued' && 'Certificate is queued and will be processed shortly...'}
                            {jobStatus === 'processing' && 'Certificate is being generated. This may take a few moments...'}
                            {jobStatus === 'completed' && 'Certificate generation completed!'}
                          </p>
                        </div>
                        {jobStatus === 'processing' && (
                          <p className="text-xs text-blue-600 mt-1">
                            Please wait while we generate your certificate. You can close this window and check back later.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  // For mobile, render directly; for desktop, use portal
  if (isMobile) {
    return content;
  }

  // Use portal to render outside the normal DOM hierarchy for modal
  const modalRoot = document.getElementById('root') || document.body;
  return createPortal(content, modalRoot);
};

export default CertificateGenerator;


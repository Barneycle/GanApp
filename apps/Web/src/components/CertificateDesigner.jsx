import React, { useState, useRef, useEffect } from 'react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { CertificateService } from '../services/certificateService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { PageSkeleton } from './loading/Skeleton';
import { SmartSpinner } from './loading/SmartSpinner';
import { SignatureCapture } from './SignatureCapture';

// Helper to load Google Fonts dynamically for preview
const loadGoogleFont = (fontFamily) => {
  if (typeof document === 'undefined') return;

  // Extract font name (remove fallbacks)
  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');

  // Skip system fonts
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia',
    'Verdana', 'Tahoma', 'Trebuchet MS', 'Garamond', 'Palatino',
    'Book Antiqua', 'Baskerville', 'Bodoni', 'Caslon', 'Century Schoolbook',
    'Didot', 'Hoefler Text', 'Monaco', 'Consolas', 'Menlo', 'Lucida Grande',
    'Century Gothic', 'Futura', 'Gill Sans', 'Impact', 'Copperplate'];

  if (systemFonts.includes(fontName)) return;

  // Check if already loaded
  const fontId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(fontId)) return;

  // Create link element
  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
};

const CertificateDesigner = ({ eventId, onSave, draftMode = false, draftStorageKey = 'pending-certificate-config' }) => {
  const { user } = useAuth();
  const _canvasRef = useRef(null);
  const previewRef = useRef(null);
  const previewWrapRef = useRef(null);
  const dragRef = useRef(null);
  const configRef = useRef(null);

  // Default config
  const defaultConfig = {
    background_color: '#ffffff',
    background_image_url: null,
    background_image_size: null, // { width, height } - if null, uses canvas size
    border_color: '#1e40af',
    border_width: 5,
    title_text: 'CERTIFICATE',
    title_subtitle: 'OF PARTICIPATION',
    title_font_size: 56,
    title_font_family: 'Libre Baskerville, serif',
    title_color: '#000000',
    title_position: { x: 50, y: 28 },
    // Title subtitle configuration
    title_subtitle_config: {
      font_size: 22, // 40% of title font size (56 * 0.4 ≈ 22)
      color: '#000000',
      position: { x: 50, y: 30 }, // Slightly below title (28 + 2)
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
      letter_spacing: '2px'
    },
    width: 2500,  // Original certificate dimensions
    height: 1768,  // Maintains aspect ratio (approximately 16:11)
    name_config: {
      font_size: 48,
      color: '#000000',
      position: { x: 50, y: 50 },
      font_family: '"MonteCarlo", cursive',
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
    // Header configuration
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
    // Logo configuration
    logo_config: {
      logos: [], // Array of logo objects: { url, size: {width, height}, position: {x, y} }
      sponsor_logos: [],
      sponsor_logo_size: { width: 80, height: 80 },
      sponsor_logo_position: { x: 90, y: 5 },
      sponsor_logo_spacing: 10
    },
    // Participation text configuration
    participation_text_config: {
      text_template: 'For his/her active participation during the {EVENT_NAME} held on {EVENT_DATE} at {VENUE}',
      font_size: 22,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
      line_height: 1.5
    },
    // "is given to" text configuration
    is_given_to_config: {
      text: 'This certificate is proudly presented to',
      font_size: 20,
      color: '#000000',
      position: { x: 50, y: 38 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal'
    },
    // Signature blocks (array)
    signature_blocks: [],
    // Certificate ID configuration
    cert_id_prefix: '', // User-defined prefix for certificate ID (format: prefix-001)
    cert_id_position: { x: 50, y: 95 }, // Position for certificate ID display
    cert_id_font_size: 14,
    cert_id_color: '#000000',
    // QR Code configuration
    qr_code_enabled: true, // Enable/disable QR code
    qr_code_size: 60, // Size in pixels
    qr_code_position: { x: 60, y: 95 } // Position beside cert ID
  };

  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState({});
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [existingLogos, setExistingLogos] = useState([]);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [existingBackgrounds, setExistingBackgrounds] = useState([]);
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [guides, setGuides] = useState({ v: [], h: [] });
  const [fitScale, setFitScale] = useState(0.32);

  useEffect(() => {
    loadConfig();
    fetchExistingLogos();
    fetchExistingBackgrounds();
  }, [eventId]);

  // Fetch existing logos from database
  const fetchExistingLogos = async () => {
    if (!user?.id) return;

    setLoadingLogos(true);
    try {
      const { data, error } = await supabase
        .from('logos')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setExistingLogos(data || []);
    } catch (err) {
      console.error('Error fetching logos:', err);
      setError('Failed to load existing logos');
    } finally {
      setLoadingLogos(false);
    }
  };

  // Fetch existing background images from database
  const fetchExistingBackgrounds = async () => {
    if (!user?.id) return;

    setLoadingBackgrounds(true);
    try {
      const { data, error } = await supabase
        .from('background_images')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setExistingBackgrounds(data || []);
    } catch (err) {
      console.error('Error fetching background images:', err);
      setError('Failed to load existing background images');
    } finally {
      setLoadingBackgrounds(false);
    }
  };

  const loadConfig = async () => {
    if (draftMode) {
      // Load from sessionStorage in draft mode
      try {
        const saved = sessionStorage.getItem(draftStorageKey);
        if (saved) {
          const savedConfig = JSON.parse(saved);
          // Deep merge to ensure nested objects like header_config are properly merged
          const mergedConfig = {
            ...defaultConfig,
            ...savedConfig,
            header_config: {
              ...defaultConfig.header_config,
              ...(savedConfig.header_config || {}),
              republic_config: {
                ...defaultConfig.header_config.republic_config,
                ...(savedConfig.header_config?.republic_config || {})
              },
              university_config: {
                ...defaultConfig.header_config.university_config,
                ...(savedConfig.header_config?.university_config || {})
              },
              location_config: {
                ...defaultConfig.header_config.location_config,
                ...(savedConfig.header_config?.location_config || {})
              }
            },
            logo_config: {
              ...defaultConfig.logo_config,
              ...(savedConfig.logo_config || {}),
              logos: savedConfig.logo_config?.logos || defaultConfig.logo_config.logos || []
            },
            participation_text_config: {
              ...defaultConfig.participation_text_config,
              ...(savedConfig.participation_text_config || {}),
              position: {
                ...defaultConfig.participation_text_config.position,
                ...(savedConfig.participation_text_config?.position || {})
              }
            },
            is_given_to_config: { ...defaultConfig.is_given_to_config, ...(savedConfig.is_given_to_config || {}) },
            name_config: { ...defaultConfig.name_config, ...(savedConfig.name_config || {}) },
            event_title_config: { ...defaultConfig.event_title_config, ...(savedConfig.event_title_config || {}) },
            date_config: { ...defaultConfig.date_config, ...(savedConfig.date_config || {}) },
            title_subtitle_config: {
              ...defaultConfig.title_subtitle_config,
              ...(savedConfig.title_subtitle_config || {}),
              position: {
                ...defaultConfig.title_subtitle_config.position,
                ...(savedConfig.title_subtitle_config?.position || {})
              }
            },
            signature_blocks: savedConfig.signature_blocks || defaultConfig.signature_blocks,
            background_image_url: savedConfig.background_image_url || defaultConfig.background_image_url,
            background_image_size: savedConfig.background_image_size || defaultConfig.background_image_size,
            cert_id_prefix: savedConfig.cert_id_prefix || defaultConfig.cert_id_prefix,
            cert_id_position: savedConfig.cert_id_position || defaultConfig.cert_id_position,
            cert_id_font_size: savedConfig.cert_id_font_size !== undefined ? savedConfig.cert_id_font_size : defaultConfig.cert_id_font_size,
            cert_id_color: savedConfig.cert_id_color || defaultConfig.cert_id_color,
            qr_code_enabled: savedConfig.qr_code_enabled !== undefined ? savedConfig.qr_code_enabled : defaultConfig.qr_code_enabled,
            qr_code_size: savedConfig.qr_code_size || defaultConfig.qr_code_size,
            qr_code_position: savedConfig.qr_code_position || defaultConfig.qr_code_position
          };
          setConfig(mergedConfig);

        } else {
          // Use default config if no draft exists
          setConfig(defaultConfig);
        }
      } catch (err) {
        console.error('Failed to load draft config:', err);
        setConfig(defaultConfig);
      }
      return;
    }

    if (!eventId) {
      setConfig(defaultConfig);
      return;
    }

    setLoading(true);
    try {
      const result = await CertificateService.getCertificateConfig(eventId);
      if (result.config) {
        // Deep merge to ensure nested objects like header_config are properly merged
        const mergedConfig = {
          ...defaultConfig,
          ...result.config,
          header_config: {
            ...defaultConfig.header_config,
            ...(result.config.header_config || {}),
            republic_config: {
              ...defaultConfig.header_config.republic_config,
              ...(result.config.header_config?.republic_config || {})
            },
            university_config: {
              ...defaultConfig.header_config.university_config,
              ...(result.config.header_config?.university_config || {})
            },
            location_config: {
              ...defaultConfig.header_config.location_config,
              ...(result.config.header_config?.location_config || {})
            }
          },
          logo_config: {
            ...defaultConfig.logo_config,
            ...(result.config.logo_config || {}),
            logos: result.config.logo_config?.logos || defaultConfig.logo_config.logos || []
          },
          participation_text_config: {
            ...defaultConfig.participation_text_config,
            ...(result.config.participation_text_config || {}),
            position: {
              ...defaultConfig.participation_text_config.position,
              ...(result.config.participation_text_config?.position || {})
            }
          },
          is_given_to_config: { ...defaultConfig.is_given_to_config, ...(result.config.is_given_to_config || {}) },
          name_config: { ...defaultConfig.name_config, ...(result.config.name_config || {}) },
          event_title_config: { ...defaultConfig.event_title_config, ...(result.config.event_title_config || {}) },
          date_config: { ...defaultConfig.date_config, ...(result.config.date_config || {}) },
          title_subtitle_config: {
            ...defaultConfig.title_subtitle_config,
            ...(result.config.title_subtitle_config || {}),
            position: {
              ...defaultConfig.title_subtitle_config.position,
              ...(result.config.title_subtitle_config?.position || {})
            }
          },
          signature_blocks: (result.config.signature_blocks && Array.isArray(result.config.signature_blocks))
            ? result.config.signature_blocks
            : (defaultConfig.signature_blocks || []),
          background_image_url: result.config.background_image_url !== undefined ? result.config.background_image_url : defaultConfig.background_image_url,
          background_image_size: result.config.background_image_size !== undefined ? result.config.background_image_size : defaultConfig.background_image_size,
          cert_id_prefix: result.config.cert_id_prefix !== undefined ? result.config.cert_id_prefix : defaultConfig.cert_id_prefix,
          cert_id_position: result.config.cert_id_position || defaultConfig.cert_id_position,
          cert_id_font_size: result.config.cert_id_font_size !== undefined ? result.config.cert_id_font_size : defaultConfig.cert_id_font_size,
          cert_id_color: result.config.cert_id_color || defaultConfig.cert_id_color,
          qr_code_enabled: result.config.qr_code_enabled !== undefined ? result.config.qr_code_enabled : defaultConfig.qr_code_enabled,
          qr_code_size: result.config.qr_code_size !== undefined ? result.config.qr_code_size : defaultConfig.qr_code_size,
          qr_code_position: result.config.qr_code_position || defaultConfig.qr_code_position
        };
        setConfig(mergedConfig);
      } else {
        // Use default config if no config exists
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (draftMode) {
      // Save to sessionStorage in draft mode
      try {
        sessionStorage.setItem(draftStorageKey, JSON.stringify(config));
        setSuccess(true);
        if (onSave) {
          onSave(config);
        }
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError('Failed to save draft config');
      }
      return;
    }

    if (!eventId || !user?.id) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Ensure signature_blocks is always an array when saving
      const configToSave = {
        ...config,
        signature_blocks: Array.isArray(config.signature_blocks) ? config.signature_blocks : []
      };

      const result = await CertificateService.saveCertificateConfig(eventId, configToSave, user.id);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        if (onSave) {
          onSave(result.config);
        }
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save certificate config');
    } finally {
      setSaving(false);
    }
  };

  // Load fonts when config changes
  useEffect(() => {
    if (!config) return;

    // Load all fonts used in the certificate
    const fonts = new Set();

    if (config.title_font_family) fonts.add(config.title_font_family);
    if (config.title_subtitle_config?.font_family) fonts.add(config.title_subtitle_config.font_family);
    if (config.header_config?.republic_config?.font_family) fonts.add(config.header_config.republic_config.font_family);
    if (config.header_config?.university_config?.font_family) fonts.add(config.header_config.university_config.font_family);
    if (config.header_config?.location_config?.font_family) fonts.add(config.header_config.location_config.font_family);
    if (config.name_config?.font_family) fonts.add(config.name_config.font_family);
    if (config.event_title_config?.font_family) fonts.add(config.event_title_config.font_family);
    if (config.date_config?.font_family) fonts.add(config.date_config.font_family);
    if (config.participation_text_config?.font_family) fonts.add(config.participation_text_config.font_family);
    if (config.is_given_to_config?.font_family) fonts.add(config.is_given_to_config.font_family);

    if (config.signature_blocks) {
      config.signature_blocks.forEach(sig => {
        if (sig.font_family) fonts.add(sig.font_family);
        if (sig.typed_font) fonts.add(sig.typed_font);
      });
    }

    // Load each font
    fonts.forEach(fontFamily => loadGoogleFont(fontFamily));
  }, [config]);

  configRef.current = config;

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return undefined;
    const update = () => {
      const pad = 16;
      const width = el.clientWidth - pad;
      const height = el.clientHeight - pad;
      if (width < 40 || height < 40) return;
      const next = Math.min(width / (config.width || 2500), height / (config.height || 1768));
      setFitScale(Math.max(0.08, Math.min(next, 1)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [config.width, config.height]);

  const updateConfig = (path, value) => {
    const keys = path.split('.');
    setConfig(prev => {
      const newConfig = { ...prev };
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        } else {
          current[keys[i]] = { ...current[keys[i]] };
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;

      // Auto-save to sessionStorage in draft mode
      if (draftMode) {
        try {
          sessionStorage.setItem(draftStorageKey, JSON.stringify(newConfig));
        } catch (err) {
          console.error('Failed to auto-save draft config:', err);
        }
      }

      return newConfig;
    });
  };

  const updateSignatureBlocks = (newBlocks) => {
    setConfig(prev => {
      const newConfig = { ...prev, signature_blocks: newBlocks };
      // Auto-save to sessionStorage in draft mode
      if (draftMode) {
        try {
          sessionStorage.setItem(draftStorageKey, JSON.stringify(newConfig));
        } catch (err) {
          console.error('Failed to auto-save draft config:', err);
        }
      }
      return newConfig;
    });
  };

  const clampPercent = (value) => Math.min(100, Math.max(0, Math.round(value * 10) / 10));

  const listCanvasIds = (cfg) => {
    const ids = ['title'];
    if (cfg.title_subtitle) ids.push('title-subtitle');
    const header = cfg.header_config || {};
    if (header.republic_text) ids.push('header-republic');
    if (header.university_text) ids.push('header-university');
    if (header.location_text) ids.push('header-location');
    if (cfg.is_given_to_config?.text) ids.push('is-given-to');
    if (cfg.name_config) ids.push('name');
    if (cfg.participation_text_config?.text_template) ids.push('participation');
    if (cfg.cert_id_prefix) ids.push('cert-id');
    (cfg.logo_config?.logos || []).forEach((_, index) => ids.push(`logo-${index}`));
    if (cfg.logo_config?.sponsor_logos?.length) ids.push('sponsor-logos');
    const signatures = cfg.signature_blocks?.length
      ? cfg.signature_blocks
      : [{ position_config: { x: 50, y: 92 } }];
    signatures.forEach((_, index) => ids.push(`signature-${index}`));
    return ids;
  };

  const getElementPosition = (id, cfg = configRef.current) => {
    const logos = cfg.logo_config || {};
    const header = cfg.header_config || {};
    if (id.startsWith('logo-')) {
      const index = Number(id.slice(5));
      return { x: logos.logos?.[index]?.position?.x ?? 15, y: logos.logos?.[index]?.position?.y ?? 10 };
    }
    if (id.startsWith('signature-')) {
      const index = Number(id.slice(10));
      const block = cfg.signature_blocks?.[index];
      return { x: block?.position_config?.x ?? 50, y: block?.position_config?.y ?? 92 };
    }
    switch (id) {
      case 'sponsor-logos':
        return { x: logos.sponsor_logo_position?.x ?? 90, y: logos.sponsor_logo_position?.y ?? 5 };
      case 'header-republic':
        return { ...(header.republic_config?.position || { x: 50, y: 8.5 }) };
      case 'header-university':
        return { ...(header.university_config?.position || { x: 50, y: 10.5 }) };
      case 'header-location':
        return { ...(header.location_config?.position || { x: 50, y: 12.5 }) };
      case 'title':
        return { ...(cfg.title_position || { x: 50, y: 28 }) };
      case 'title-subtitle':
        return { ...(cfg.title_subtitle_config?.position || { x: 50, y: 30 }) };
      case 'is-given-to':
        return { ...(cfg.is_given_to_config?.position || { x: 50, y: 38 }) };
      case 'name':
        return { ...(cfg.name_config?.position || { x: 50, y: 50 }) };
      case 'participation':
        return { ...(cfg.participation_text_config?.position || { x: 50, y: 60 }) };
      case 'cert-id':
        return { ...(cfg.cert_id_position || { x: 50, y: 95 }) };
      default:
        return { x: 50, y: 50 };
    }
  };

  const setElementPosition = (id, pos) => {
    const next = { x: clampPercent(pos.x), y: clampPercent(pos.y) };
    if (id.startsWith('logo-')) {
      const index = Number(id.slice(5));
      const logos = [...(configRef.current.logo_config?.logos || [])];
      if (!logos[index]) return;
      logos[index] = { ...logos[index], position: next };
      updateConfig('logo_config', { ...configRef.current.logo_config, logos });
      return;
    }
    if (id.startsWith('signature-')) {
      const index = Number(id.slice(10));
      const blocks = [...(configRef.current.signature_blocks || [])];
      if (!blocks[index]) return;
      blocks[index] = { ...blocks[index], position_config: next };
      updateSignatureBlocks(blocks);
      return;
    }
    switch (id) {
      case 'sponsor-logos':
        updateConfig('logo_config', { ...configRef.current.logo_config, sponsor_logo_position: next });
        break;
      case 'header-republic':
        updateConfig('header_config', {
          ...configRef.current.header_config,
          republic_config: { ...configRef.current.header_config?.republic_config, position: next },
        });
        break;
      case 'header-university':
        updateConfig('header_config', {
          ...configRef.current.header_config,
          university_config: { ...configRef.current.header_config?.university_config, position: next },
        });
        break;
      case 'header-location':
        updateConfig('header_config', {
          ...configRef.current.header_config,
          location_config: { ...configRef.current.header_config?.location_config, position: next },
        });
        break;
      case 'title':
        updateConfig('title_position', next);
        break;
      case 'title-subtitle':
        updateConfig('title_subtitle_config', { ...configRef.current.title_subtitle_config, position: next });
        break;
      case 'is-given-to':
        updateConfig('is_given_to_config', { ...configRef.current.is_given_to_config, position: next });
        break;
      case 'name':
        updateConfig('name_config', { ...configRef.current.name_config, position: next });
        break;
      case 'participation':
        updateConfig('participation_text_config', { ...configRef.current.participation_text_config, position: next });
        break;
      case 'cert-id':
        updateConfig('cert_id_position', next);
        break;
      default:
        break;
    }
  };

  const selectedToolbar = (() => {
    const id = selectedElementId;
    if (!id) return null;
    if (id === 'title') {
      return { label: 'Title', fontSizePath: 'title_font_size', fontSize: config.title_font_size, fontMin: 20, fontMax: 96, colorPath: 'title_color', color: config.title_color };
    }
    if (id === 'title-subtitle') {
      return { label: 'Subtitle', fontSize: config.title_subtitle_config?.font_size || 22, fontMin: 10, fontMax: 60, color: config.title_subtitle_config?.color || config.title_color, kind: 'subtitle' };
    }
    if (id === 'name') {
      return { label: 'Name', fontSizePath: 'name_config.font_size', fontSize: config.name_config?.font_size, fontMin: 16, fontMax: 80, colorPath: 'name_config.color', color: config.name_config?.color };
    }
    if (id === 'participation') {
      return { label: 'Body text', fontSizePath: 'participation_text_config.font_size', fontSize: config.participation_text_config?.font_size, fontMin: 10, fontMax: 48, colorPath: 'participation_text_config.color', color: config.participation_text_config?.color };
    }
    if (id === 'is-given-to') {
      return { label: 'Given to', fontSizePath: 'is_given_to_config.font_size', fontSize: config.is_given_to_config?.font_size, fontMin: 10, fontMax: 40, colorPath: 'is_given_to_config.color', color: config.is_given_to_config?.color };
    }
    if (id === 'header-republic') {
      return { label: 'Republic', fontSize: config.header_config?.republic_config?.font_size, fontMin: 10, fontMax: 48, color: config.header_config?.republic_config?.color, kind: 'header-republic' };
    }
    if (id === 'header-university') {
      return { label: 'University', fontSize: config.header_config?.university_config?.font_size, fontMin: 10, fontMax: 48, color: config.header_config?.university_config?.color, kind: 'header-university' };
    }
    if (id === 'header-location') {
      return { label: 'Location', fontSize: config.header_config?.location_config?.font_size, fontMin: 10, fontMax: 40, color: config.header_config?.location_config?.color, kind: 'header-location' };
    }
    if (id === 'cert-id') {
      return { label: 'Certificate ID', fontSizePath: 'cert_id_font_size', fontSize: config.cert_id_font_size || 14, fontMin: 8, fontMax: 28, colorPath: 'cert_id_color', color: config.cert_id_color };
    }
    if (id.startsWith('logo-')) {
      const index = Number(id.slice(5));
      const logo = config.logo_config?.logos?.[index];
      return { label: `Logo ${index + 1}`, kind: 'logo', index, width: logo?.size?.width || 120, height: logo?.size?.height || 120 };
    }
    if (id === 'sponsor-logos') {
      return { label: 'Sponsor logos', kind: 'sponsor', width: config.logo_config?.sponsor_logo_size?.width, height: config.logo_config?.sponsor_logo_size?.height };
    }
    if (id.startsWith('signature-')) {
      const index = Number(id.slice(10));
      const block = config.signature_blocks?.[index];
      return { label: `Signature ${index + 1}`, kind: 'signature', index, fontSize: block?.name_font_size || 14, fontMin: 8, fontMax: 32, color: block?.name_color || '#000000' };
    }
    return { label: 'Element' };
  })();

  const applySelectedStyle = (patch) => {
    const id = selectedElementId;
    if (!id) return;
    const cfg = configRef.current;
    if (id === 'title') {
      if (patch.font_size != null) updateConfig('title_font_size', patch.font_size);
      if (patch.color != null) updateConfig('title_color', patch.color);
      return;
    }
    if (id === 'title-subtitle') {
      updateConfig('title_subtitle_config', { ...cfg.title_subtitle_config, ...patch });
      return;
    }
    if (id === 'name') {
      updateConfig('name_config', { ...cfg.name_config, ...patch });
      return;
    }
    if (id === 'participation') {
      updateConfig('participation_text_config', { ...cfg.participation_text_config, ...patch });
      return;
    }
    if (id === 'is-given-to') {
      updateConfig('is_given_to_config', { ...cfg.is_given_to_config, ...patch });
      return;
    }
    if (id === 'header-republic') {
      updateConfig('header_config', {
        ...cfg.header_config,
        republic_config: { ...cfg.header_config?.republic_config, ...patch },
      });
      return;
    }
    if (id === 'header-university') {
      updateConfig('header_config', {
        ...cfg.header_config,
        university_config: { ...cfg.header_config?.university_config, ...patch },
      });
      return;
    }
    if (id === 'header-location') {
      updateConfig('header_config', {
        ...cfg.header_config,
        location_config: { ...cfg.header_config?.location_config, ...patch },
      });
      return;
    }
    if (id === 'cert-id') {
      if (patch.font_size != null) updateConfig('cert_id_font_size', patch.font_size);
      if (patch.color != null) updateConfig('cert_id_color', patch.color);
      return;
    }
    if (id.startsWith('logo-')) {
      const index = Number(id.slice(5));
      const logos = [...(cfg.logo_config?.logos || [])];
      if (!logos[index]) return;
      logos[index] = { ...logos[index], size: { ...(logos[index].size || {}), ...(patch.size || {}) } };
      updateConfig('logo_config', { ...cfg.logo_config, logos });
      return;
    }
    if (id === 'sponsor-logos') {
      updateConfig('logo_config', {
        ...cfg.logo_config,
        sponsor_logo_size: { ...(cfg.logo_config?.sponsor_logo_size || {}), ...(patch.size || {}) },
      });
      return;
    }
    if (id.startsWith('signature-')) {
      const index = Number(id.slice(10));
      const blocks = [...(cfg.signature_blocks || [])];
      if (!blocks[index]) return;
      const mapped = {};
      if (patch.font_size != null) mapped.name_font_size = patch.font_size;
      if (patch.color != null) mapped.name_color = patch.color;
      blocks[index] = { ...blocks[index], ...mapped };
      updateSignatureBlocks(blocks);
    }
  };

  const canvasProps = (id, extraStyle = {}) => {
    const selected = selectedElementId === id;
    return {
      'data-canvas-id': id,
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        setSelectedElementId(id);
        const cfg = configRef.current;
        dragRef.current = {
          id,
          startX: event.clientX,
          startY: event.clientY,
          orig: getElementPosition(id, cfg),
          targets: [
            { x: 50, y: 50 },
            { x: 0, y: 0 },
            { x: 100, y: 100 },
            ...listCanvasIds(cfg).filter((other) => other !== id).map((other) => getElementPosition(other, cfg)),
          ],
        };
        const onMove = (moveEvent) => {
          const drag = dragRef.current;
          if (!drag || drag.id !== id) return;
          const box = previewRef.current?.getBoundingClientRect();
          if (!box?.width || !box?.height) return;
          let x = drag.orig.x + ((moveEvent.clientX - drag.startX) / box.width) * 100;
          let y = drag.orig.y + ((moveEvent.clientY - drag.startY) / box.height) * 100;
          const snapX = (6 / box.width) * 100;
          const snapY = (6 / box.height) * 100;
          const v = [];
          const h = [];
          drag.targets.forEach((target) => {
            if (Math.abs(x - target.x) <= snapX) {
              x = target.x;
              v.push(target.x);
            }
            if (Math.abs(y - target.y) <= snapY) {
              y = target.y;
              h.push(target.y);
            }
          });
          setGuides({ v: [...new Set(v)], h: [...new Set(h)] });
          setElementPosition(id, { x, y });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          if (dragRef.current?.id === id) {
            dragRef.current = null;
            setGuides({ v: [], h: [] });
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      },
      onClick: (event) => {
        event.stopPropagation();
        setSelectedElementId(id);
      },
      style: {
        ...extraStyle,
        cursor: 'move',
        touchAction: 'none',
        userSelect: 'none',
        outline: selected ? '2px solid #1e3a8a' : '2px solid transparent',
        outlineOffset: '3px',
        zIndex: selected ? 24 : extraStyle.zIndex || 2,
      },
    };
  };

  useEffect(() => {
    if (!selectedElementId) return undefined;
    const onKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      const move = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }[event.key];
      if (!move) return;
      event.preventDefault();
      const step = event.shiftKey ? 2 : 0.5;
      const pos = getElementPosition(selectedElementId);
      setElementPosition(selectedElementId, {
        x: pos.x + move[0] * step,
        y: pos.y + move[1] * step,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedElementId]);

  // Upload background image to Supabase Storage and database
  const handleBackgroundImageUpload = async (file) => {
    if (!file || !user?.id) return;

    // Validate file type - PNG only
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'png') {
      setError('Only PNG files are allowed for background images');
      return;
    }

    setUploadingBackground(true);
    setError(null);

    try {
      // Upload to storage
      const fileName = `background_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const bucketName = 'certificate-backgrounds';

      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Save to database
      const { data: _bgData, error: dbError } = await supabase
        .from('background_images')
        .insert({
          file_url: publicUrl,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for name
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Update config with the uploaded URL and default size
      updateConfig('background_image_url', publicUrl);
      updateConfig('background_image_size', config.background_image_size || { width: config.width || 842, height: config.height || 595 });

      // Refresh backgrounds list
      await fetchExistingBackgrounds();
      setSuccess('Background image uploaded successfully!');
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      setError(err.message || 'Failed to upload background image');
    } finally {
      setUploadingBackground(false);
    }
  };

  // Select existing background image from database
  const handleSelectExistingBackground = (bgUrl) => {
    updateConfig('background_image_url', bgUrl);
    updateConfig('background_image_size', config.background_image_size || { width: config.width || 842, height: config.height || 595 });
  };

  // Upload logo to Supabase Storage and database
  const handleLogoUpload = async (file) => {
    if (!file || !user?.id) return;

    // Validate file type - PNG only
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'png') {
      setError('Only PNG files are allowed for logos');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      // Upload to storage
      const fileName = `logo_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const bucketName = 'certificate-logos';

      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Save to database
      const { data: _logoData, error: dbError } = await supabase
        .from('logos')
        .insert({
          file_url: publicUrl,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for name
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Add logo to logos array
      const currentLogos = config.logo_config?.logos || [];
      updateConfig('logo_config', {
        ...config.logo_config,
        logos: [
          ...currentLogos,
          {
            url: publicUrl,
            size: { width: 120, height: 120 },
            position: { x: 15 + (currentLogos.length * 5), y: 10 }
          }
        ]
      });

      // Refresh logos list
      await fetchExistingLogos();
      setSuccess('Logo uploaded successfully!');

    } catch (err) {
      setError(err.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Add existing logo to logos array
  const handleAddExistingLogo = (logoUrl) => {
    const currentLogos = config.logo_config?.logos || [];
    updateConfig('logo_config', {
      ...config.logo_config,
      logos: [
        ...currentLogos,
        {
          url: logoUrl,
          size: { width: 120, height: 120 },
          position: { x: 15 + (currentLogos.length * 5), y: 10 }
        }
      ]
    });
  };

  // Remove logo from array
  const handleRemoveLogo = (index) => {
    const currentLogos = config.logo_config?.logos || [];
    updateConfig('logo_config', {
      ...config.logo_config,
      logos: currentLogos.filter((_, i) => i !== index)
    });
  };

  const applySignatureToBlock = (blockIndex, patch) => {
    const newBlocks = (configRef.current.signature_blocks || []).map((block, i) =>
      i === blockIndex ? { ...block, ...patch } : block
    );
    updateSignatureBlocks(newBlocks);
  };

  // Upload signature image to Supabase Storage
  const handleSignatureImageUpload = async (file, blockIndex, source = 'upload') => {
    if (!file) return;

    const fileExt = (file.name?.split('.').pop() || 'png').toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(fileExt)) {
      setError('Only PNG and JPG files are allowed');
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read signature'));
      reader.readAsDataURL(file);
    });

    const natural = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    const displayWidth = 280;
    const displayHeight = natural?.width
      ? Math.max(36, Math.round(displayWidth * (natural.height / natural.width)))
      : 90;

    applySignatureToBlock(blockIndex, {
      signature_image_url: dataUrl,
      signature_image_width: displayWidth,
      signature_image_height: displayHeight,
      signature_source: source,
    });

    if (!user?.id) return;

    setUploadingSignature(prev => ({ ...prev, [blockIndex]: true }));
    setError(null);

    try {
      const eventIdForPath = eventId || 'draft';
      const fileName = `signature_${blockIndex}_${Date.now()}.${fileExt}`;
      const filePath = `signatures/${eventIdForPath}/${fileName}`;
      const body = new Blob([await file.arrayBuffer()], { type: file.type || 'image/png' });

      const { error: uploadError } = await supabase.storage
        .from('certificate-signatures')
        .upload(filePath, body, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/png',
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('certificate-signatures')
        .getPublicUrl(filePath);

      applySignatureToBlock(blockIndex, {
        signature_image_url: publicUrl,
        signature_source: source,
      });
    } catch (err) {
      setError(err.message || 'Failed to upload signature image');
    } finally {
      setUploadingSignature(prev => ({ ...prev, [blockIndex]: false }));
    }
  };

  const renderFloatingToolbar = () => {
    if (!selectedToolbar || !selectedElementId) return null;
    const pos = getElementPosition(selectedElementId);
    const showText = selectedToolbar.fontSize != null;
    const showLogo = selectedToolbar.kind === 'logo' || selectedToolbar.kind === 'sponsor';
    const align = (x) => setElementPosition(selectedElementId, { ...getElementPosition(selectedElementId), x });

    let leftPct = pos.x;
    let topPct = pos.y;
    let placeBelow = pos.y < 12;
    const preview = previewRef.current;
    const node = preview?.querySelector(`[data-canvas-id="${selectedElementId}"]`);
    if (preview && node) {
      const box = preview.getBoundingClientRect();
      const el = node.getBoundingClientRect();
      if (box.width && box.height) {
        leftPct = ((el.left + el.width / 2 - box.left) / box.width) * 100;
        const spaceAbove = el.top - box.top;
        if (spaceAbove > 44) {
          topPct = ((el.top - box.top) / box.height) * 100;
          placeBelow = false;
        } else {
          topPct = ((el.bottom - box.top) / box.height) * 100;
          placeBelow = true;
        }
      }
    }

    return (
      <div
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${leftPct}%`,
          top: `${topPct}%`,
          transform: placeBelow ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.14)',
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span className="text-[11px] font-semibold text-slate-700 pr-1">{selectedToolbar.label}</span>
        {showText && (
          <>
            <label className="flex items-center gap-1 text-[10px] text-slate-500">
              Size
              <input
                type="number"
                min={selectedToolbar.fontMin}
                max={selectedToolbar.fontMax}
                value={selectedToolbar.fontSize}
                onChange={(e) => applySelectedStyle({ font_size: Number(e.target.value) })}
                className="w-14 h-7 rounded border border-slate-200 px-1 text-xs text-slate-800"
              />
            </label>
            <input
              type="color"
              value={selectedToolbar.color || '#000000'}
              onChange={(e) => applySelectedStyle({ color: e.target.value })}
              className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0"
              title="Color"
            />
            <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1">
              <button type="button" title="Align left" onClick={() => align(20)} className="rounded p-1 text-slate-600 hover:bg-slate-100">
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Align center" onClick={() => align(50)} className="rounded p-1 text-slate-600 hover:bg-slate-100">
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Align right" onClick={() => align(80)} className="rounded p-1 text-slate-600 hover:bg-slate-100">
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
        {showLogo && (
          <>
            <label className="flex items-center gap-1 text-[10px] text-slate-500">
              W
              <input
                type="number"
                min={24}
                max={400}
                value={selectedToolbar.width || 80}
                onChange={(e) => applySelectedStyle({ size: { width: Number(e.target.value) } })}
                className="w-14 h-7 rounded border border-slate-200 px-1 text-xs text-slate-800"
              />
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-500">
              H
              <input
                type="number"
                min={24}
                max={400}
                value={selectedToolbar.height || 80}
                onChange={(e) => applySelectedStyle({ size: { height: Number(e.target.value) } })}
                className="w-14 h-7 rounded border border-slate-200 px-1 text-xs text-slate-800"
              />
            </label>
          </>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    // Safety check - ensure config is valid
    if (!config || !config.width || !config.height) {
      return <div className="text-center text-slate-500 p-8">Loading certificate preview...</div>;
    }

    const actualWidth = config.width;
    const actualHeight = config.height;
    const scale = fitScale;
    const displayWidth = actualWidth * scale;
    const displayHeight = actualHeight * scale;
    const header = config.header_config || defaultConfig.header_config;
    const logos = config.logo_config || defaultConfig.logo_config;
    const participation = config.participation_text_config || defaultConfig.participation_text_config;
    const isGivenTo = config.is_given_to_config || defaultConfig.is_given_to_config;
    const signatures = config.signature_blocks && config.signature_blocks.length > 0
      ? config.signature_blocks
      : [{
        name: '[Name]',
        position: '[Position]',
        position_config: { x: 50, y: 92 }
      }];

    return (
      <div
        ref={previewRef}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSelectedElementId(null);
        }}
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          backgroundColor: config.background_image_url ? 'transparent' : '#ffffff',
          backgroundImage: config.background_image_url ? `url(${config.background_image_url})` : 'none',
          backgroundSize: config.background_image_size
            ? `${(config.background_image_size.width * scale)}px ${(config.background_image_size.height * scale)}px`
            : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          border: `${config.border_width * scale}px solid ${config.border_color}`,
          position: 'relative',
          margin: '0 auto',
          boxSizing: 'border-box',
          overflow: 'visible',
          display: 'block',
          flexShrink: 0
        }}
      >
        {/* Logos */}
        {logos?.logos && logos.logos.length > 0 && logos.logos.map((logo, index) => (
          <img
            key={index}
            src={logo.url}
            alt={`Logo ${index + 1}`}
            draggable={false}
            {...canvasProps(`logo-${index}`, {
              position: 'absolute',
              left: `${logo.position?.x || 15}%`,
              top: `${logo.position?.y || 10}%`,
              width: `${((logo.size?.width || 120) * scale)}px`,
              height: `${((logo.size?.height || 120) * scale)}px`,
              objectFit: 'contain'
            })}
          />
        ))}

        {/* Sponsor Logos - Top Right */}
        {logos?.sponsor_logos && logos.sponsor_logos.length > 0 && (
          <div
            {...canvasProps('sponsor-logos', {
              position: 'absolute',
              right: `${100 - (logos.sponsor_logo_position?.x ?? 90)}%`,
              top: `${logos.sponsor_logo_position?.y ?? 5}%`,
              display: 'flex',
              flexDirection: 'column',
              gap: `${(logos.sponsor_logo_spacing || 10) * scale}px`,
            })}
          >
            {logos.sponsor_logos.map((logoUrl, index) => (
              <img
                key={index}
                src={logoUrl}
                alt={`Sponsor Logo ${index + 1}`}
                draggable={false}
                style={{
                  width: `${(logos.sponsor_logo_size.width * scale)}px`,
                  height: `${(logos.sponsor_logo_size.height * scale)}px`,
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
              />
            ))}
          </div>
        )}

        {/* Header Text - Republic */}
        {header?.republic_text && (
          <div
            {...canvasProps('header-republic', {
              position: 'absolute',
              left: `${header.republic_config.position.x}%`,
              top: `${header.republic_config.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(header.republic_config.font_size || 24) * scale}px`,
              color: header.republic_config.color || '#000000',
              fontFamily: header.republic_config.font_family || 'Libre Baskerville, serif',
              fontWeight: header.republic_config.font_weight || 'normal',
              textAlign: 'center',
              width: 'max-content',
              whiteSpace: 'nowrap'
            })}
          >
            {header.republic_text}
          </div>
        )}

        {/* Header Text - University */}
        {header?.university_text && (
          <div
            {...canvasProps('header-university', {
              position: 'absolute',
              left: `${header.university_config.position.x}%`,
              top: `${header.university_config.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(header.university_config.font_size || 34) * scale}px`,
              color: header.university_config.color || '#000000',
              fontFamily: header.university_config.font_family || 'Libre Baskerville, serif',
              fontWeight: header.university_config.font_weight || 'bold',
              textAlign: 'center',
              width: 'max-content',
              whiteSpace: 'nowrap'
            })}
          >
            {header.university_text}
          </div>
        )}

        {/* Header Text - Location */}
        {header?.location_text && (
          <div
            {...canvasProps('header-location', {
              position: 'absolute',
              left: `${header.location_config.position.x}%`,
              top: `${header.location_config.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(header.location_config.font_size || 24) * scale}px`,
              color: header.location_config.color || '#000000',
              fontFamily: header.location_config.font_family || 'Libre Baskerville, serif',
              fontWeight: header.location_config.font_weight || 'normal',
              textAlign: 'center',
              width: 'max-content',
              whiteSpace: 'nowrap'
            })}
          >
            {header.location_text}
          </div>
        )}

        {/* Title */}
        <div
          {...canvasProps('title', {
            position: 'absolute',
            left: `${config.title_position.x}%`,
            top: `${config.title_position.y - 4}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${config.title_font_size * scale}px`,
            color: config.title_color,
            fontWeight: 'bold',
            fontFamily: config.title_font_family || 'Libre Baskerville, serif',
            textAlign: 'center',
            width: 'max-content',
            letterSpacing: '3px',
            whiteSpace: 'nowrap'
          })}
        >
          {config.title_text}
        </div>

        {/* Title Subtitle */}
        {config.title_subtitle && (
          <div
            {...canvasProps('title-subtitle', {
              position: 'absolute',
              left: `${(config.title_subtitle_config?.position?.x ?? config.title_position.x)}%`,
              top: `${(config.title_subtitle_config?.position?.y ?? config.title_position.y + 2)}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${((config.title_subtitle_config?.font_size ?? config.title_font_size * 0.4) * scale)}px`,
              color: config.title_subtitle_config?.color ?? config.title_color,
              fontWeight: config.title_subtitle_config?.font_weight || 'normal',
              fontFamily: config.title_subtitle_config?.font_family || config.title_font_family || 'Libre Baskerville, serif',
              textAlign: 'center',
              width: 'max-content',
              letterSpacing: config.title_subtitle_config?.letter_spacing || '2px',
              whiteSpace: 'nowrap'
            })}
          >
            {config.title_subtitle}
          </div>
        )}

        {/* "is given to" Text */}
        {isGivenTo?.text && (
          <div
            {...canvasProps('is-given-to', {
              position: 'absolute',
              left: `${isGivenTo.position.x}%`,
              top: `${isGivenTo.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(isGivenTo.font_size || 20) * scale}px`,
              color: isGivenTo.color || '#000000',
              fontFamily: isGivenTo.font_family || 'Libre Baskerville, serif',
              fontWeight: isGivenTo.font_weight || 'normal',
              textAlign: 'center',
              width: 'max-content',
              whiteSpace: 'nowrap'
            })}
          >
            {isGivenTo.text}
          </div>
        )}

        {/* Name Text - Placeholder */}
        {config.name_config && (
          <div
            {...canvasProps('name', {
              position: 'absolute',
              left: `${config.name_config.position.x}%`,
              top: `${config.name_config.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(config.name_config.font_size || 48) * scale}px`,
              color: config.name_config.color || '#000000',
              fontFamily: config.name_config.font_family || 'MonteCarlo, cursive',
              fontWeight: config.name_config.font_weight || 'bold',
              textAlign: 'center',
              width: 'max-content',
              textDecoration: 'underline',
              textDecorationThickness: `${Math.max(2 * scale, (config.name_config.font_size || 48) * 0.04 * scale)}px`,
              textUnderlineOffset: `${(config.name_config.font_size || 48) * 0.15 * scale}px`,
              whiteSpace: 'nowrap'
            })}
          >
            [Participant Name]
          </div>
        )}

        {/* Participation Text */}
        {participation?.text_template && (
          <div
            {...canvasProps('participation', {
              position: 'absolute',
              left: `${participation.position.x}%`,
              top: `${participation.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(participation.font_size || 22) * scale}px`,
              color: participation.color || '#000000',
              fontFamily: participation.font_family || 'Libre Baskerville, serif',
              fontWeight: participation.font_weight || 'normal',
              textAlign: 'center',
              width: '80%',
              lineHeight: participation.line_height || 1.5
            })}
          >
            {participation.text_template
              .replace('{EVENT_NAME}', '[Event Title]')
              .replace('{EVENT_DATE}', '[Event Date]')
              .replace('{VENUE}', '[Venue]')}
          </div>
        )}




        {/* Certificate ID and QR Code Container */}
        {config.cert_id_prefix && (
          <div
            {...canvasProps('cert-id', {
              position: 'absolute',
              left: `${config.cert_id_position?.x || 50}%`,
              top: `${config.cert_id_position?.y || 95}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: `${10 * scale}px`,
              width: 'max-content'
            })}
          >
            {/* Certificate ID */}
            <div
              style={{
                fontSize: `${((config.cert_id_font_size || 14) * scale)}px`,
                color: config.cert_id_color || '#000000',
                fontFamily: 'Arial, sans-serif',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              {config.cert_id_prefix}-001
            </div>

            {/* QR Code */}
            {config.qr_code_enabled !== false && (
              <div
                style={{
                  width: `${(config.qr_code_size || 60) * scale}px`,
                  height: `${(config.qr_code_size || 60) * scale}px`,
                  position: 'relative'
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=${Math.round((config.qr_code_size || 60) * scale)}x${Math.round((config.qr_code_size || 60) * scale)}&data=${encodeURIComponent(`${window.location.origin || window.location.protocol + '//' + window.location.host}/verify-certificate/${config.cert_id_prefix}-001`)}`}
                  alt="Certificate QR Code"
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Signature Blocks */}
        {signatures.map((signature, index) => (
          <div
            key={index}
            {...canvasProps(`signature-${index}`, {
              position: 'absolute',
              left: `${signature.position_config?.x || 50}%`,
              top: `${signature.position_config?.y || 92}%`,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              maxWidth: 'none',
              width: 'max-content',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            })}
          >
            {/* Signature Image / typed name */}
            {signature.signature_source === 'type' && (signature.typed_text || '').trim() ? (
              <div
                style={{
                  fontFamily: signature.typed_font || 'Dancing Script, cursive',
                  fontSize: `${Math.max(18, (signature.signature_image_width || 300) * 0.2) * scale}px`,
                  color: '#111827',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  marginBottom: `${-24 * scale}px`,
                  pointerEvents: 'none'
                }}
              >
                {(signature.typed_text || '').trim()}
              </div>
            ) : signature.signature_image_url ? (
              <img
                src={signature.signature_image_url}
                alt={`Signature ${index + 1}`}
                draggable={false}
                style={{
                  width: `${(signature.signature_image_width ?? 280) * scale}px`,
                  height: 'auto',
                  maxWidth: 'none',
                  objectFit: 'contain',
                  display: 'block',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginBottom: `${-24 * scale}px`,
                  pointerEvents: 'none'
                }}
              />
            ) : null}
            {/* Name - Always visible, centered */}
            <div
              style={{
                fontSize: `${(signature.name_font_size || 14) * scale}px`,
                color: signature.name_color || '#000000',
                fontFamily: signature.font_family || 'Libre Baskerville, serif',
                fontWeight: 'bold',
                marginBottom: `${2 * scale}px`,
                marginTop: (signature.signature_image_url || (signature.signature_source === 'type' && (signature.typed_text || '').trim())) ? `${-10 * scale}px` : '0',
                textAlign: 'center',
                width: '100%',
                pointerEvents: 'none'
              }}
            >
              {signature.name || '[Name]'}
            </div>
            {/* Position - Always visible, centered */}
            <div
              style={{
                fontSize: `${(signature.position_font_size || 12) * scale}px`,
                color: signature.position_color || '#000000',
                fontFamily: signature.font_family || 'Libre Baskerville, serif',
                textAlign: 'center',
                width: '100%',
                pointerEvents: 'none'
              }}
            >
              {signature.position || '[Position]'}
            </div>
          </div>
        ))}

        {guides.v.map((x) => (
          <div
            key={`guide-v-${x}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: 0,
              bottom: 0,
              width: 0,
              borderLeft: '1px dashed #2563eb',
              pointerEvents: 'none',
              zIndex: 30
            }}
          />
        ))}
        {guides.h.map((y) => (
          <div
            key={`guide-h-${y}`}
            style={{
              position: 'absolute',
              top: `${y}%`,
              left: 0,
              right: 0,
              height: 0,
              borderTop: '1px dashed #2563eb',
              pointerEvents: 'none',
              zIndex: 30
            }}
          />
        ))}

        {renderFloatingToolbar()}
      </div>
    );
  };

  if (loading) {
    return <PageSkeleton variant="form" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-slate-100">
      {/* Settings — left, Canva-style */}
      <aside className="flex w-[min(18rem,40vw)] shrink-0 flex-col border-r border-slate-200 bg-white md:w-72">
        <div className="shrink-0 border-b border-slate-200 px-3 py-2">
          <h3 className="text-sm font-semibold text-slate-900">Certificate Designer</h3>
          <p className="text-[11px] text-slate-500">
            {draftMode ? 'Draft — saved as you edit' : 'Drag on the preview. Settings stay here.'}
          </p>
        </div>

        {error && (
          <div className="shrink-0 mx-3 mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="shrink-0 mx-3 mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800">
            {typeof success === 'string' ? success : (draftMode ? 'Draft saved' : 'Saved')}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          `}</style>
          <div className="space-y-5 custom-scrollbar">
                  {/* Background & Border */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                      <div className="w-1 h-6 rounded-full bg-blue-900"></div>
                      <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Background & Border</h5>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                        Background Image
                      </label>

                      {/* Upload New Background */}
                      <div className="mb-4">
                        <input
                          type="file"
                          accept="image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleBackgroundImageUpload(file);
                            }
                          }}
                          className="hidden"
                          id="background-image-upload"
                          disabled={uploadingBackground}
                        />
                        <label
                          htmlFor="background-image-upload"
                          className={`group flex flex-col items-center justify-center w-full px-3 py-3 text-xs text-center rounded-lg border-2 border-dashed cursor-pointer transition-all ${uploadingBackground
                            ? 'bg-slate-100 cursor-not-allowed opacity-50 border-slate-300'
                            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md'
                            }`}
                        >
                          {uploadingBackground ? (
                            <SmartSpinner
                              active
                              variant="inline"
                              label="Uploading background"
                              messages={['Still uploading', 'Almost there']}
                            >
                              <span>Upload New Background</span>
                            </SmartSpinner>
                          ) : (
                            <>
                              <svg className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-slate-600 font-medium group-hover:text-blue-600 transition-colors">Upload New Background</span>
                              <span className="text-xs text-slate-400 mt-1">PNG format only</span>
                            </>
                          )}
                        </label>
                      </div>

                      {/* Remove Background Button */}
                      {config.background_image_url && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() => {
                              updateConfig('background_image_url', null);
                              updateConfig('background_image_size', null);
                            }}
                            className="w-full px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          >
                            Remove Background
                          </button>
                        </div>
                      )}

                      {/* Select Existing Background */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Select Existing Background
                        </label>
                        {loadingBackgrounds ? (
                          <PageSkeleton variant="rows" />
                        ) : (
                          <select
                            value={config.background_image_url || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleSelectExistingBackground(e.target.value);
                              } else {
                                updateConfig('background_image_url', null);
                                updateConfig('background_image_size', null);
                              }
                            }}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">-- Select Background --</option>
                            {existingBackgrounds.map((bg) => (
                              <option key={bg.id} value={bg.file_url}>
                                {bg.name || bg.file_name || 'Background'}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Background Size Controls */}
                      {config.background_image_url && (
                        <div className="mt-5 space-y-4 pt-5 border-t border-slate-200/50">
                          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Size Controls</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-slate-600">Width</label>
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                  {config.background_image_size?.width || config.width || 842}px
                                </span>
                              </div>
                              <input
                                type="range"
                                min="500"
                                max="4000"
                                step="100"
                                value={config.background_image_size?.width || config.width || 842}
                                onChange={(e) => updateConfig('background_image_size', {
                                  ...config.background_image_size,
                                  width: parseInt(e.target.value),
                                  height: config.background_image_size?.height || config.height || 595
                                })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-slate-600">Height</label>
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                  {config.background_image_size?.height || config.height || 595}px
                                </span>
                              </div>
                              <input
                                type="range"
                                min="300"
                                max="2400"
                                step="100"
                                value={config.background_image_size?.height || config.height || 595}
                                onChange={(e) => updateConfig('background_image_size', {
                                  ...config.background_image_size,
                                  width: config.background_image_size?.width || config.width || 842,
                                  height: parseInt(e.target.value)
                                })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Border Color
                        </label>
                        <div className="relative">
                          <input
                            type="color"
                            value={config.border_color}
                            onChange={(e) => updateConfig('border_color', e.target.value)}
                            className="w-full h-12 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Border Width
                          </label>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {config.border_width}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={config.border_width}
                          onChange={(e) => updateConfig('border_width', parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo Configuration */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                      <div className="w-1 h-6 rounded-full bg-blue-900"></div>
                      <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Logo</h5>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                        Logo Image
                      </label>

                      {/* Upload New Logo */}
                      <div className="mb-4">
                        <input
                          type="file"
                          accept="image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleLogoUpload(file);
                            }
                          }}
                          className="hidden"
                          id="logo-upload"
                          disabled={uploadingLogo}
                        />
                        <label
                          htmlFor="logo-upload"
                          className={`group flex flex-col items-center justify-center w-full px-3 py-3 text-xs text-center rounded-lg border-2 border-dashed cursor-pointer transition-all ${uploadingLogo
                            ? 'bg-slate-100 cursor-not-allowed opacity-50 border-slate-300'
                            : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50 hover:shadow-md'
                            }`}
                        >
                          {uploadingLogo ? (
                            <SmartSpinner
                              active
                              variant="inline"
                              label="Uploading logo"
                              messages={['Still uploading', 'Almost there']}
                            >
                              <span>Upload Logo</span>
                            </SmartSpinner>
                          ) : (
                            <>
                              <svg className="w-8 h-8 text-slate-400 group-hover:text-purple-500 mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-slate-600 font-medium group-hover:text-purple-600 transition-colors">Upload New Logo</span>
                              <span className="text-xs text-slate-400 mt-1">PNG format only</span>
                            </>
                          )}
                        </label>
                      </div>

                      {/* Current Logos List */}
                      {config.logo_config?.logos && config.logo_config.logos.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Current Logos ({config.logo_config.logos.length})
                          </label>
                          {config.logo_config.logos.map((logo, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-sm text-slate-700">Logo {index + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLogo(index)}
                                className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Select Existing Logo */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Select Existing Logo
                        </label>
                        {loadingLogos ? (
                          <PageSkeleton variant="rows" />
                        ) : (
                          <div className="space-y-2">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddExistingLogo(e.target.value);
                                  e.target.value = ''; // Reset dropdown
                                }
                              }}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="">-- Add Logo --</option>
                              {existingLogos.map((logo) => (
                                <option key={logo.id} value={logo.file_url}>
                                  {logo.name || logo.file_name || 'Logo'}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-500">Select a logo to add it to the certificate</p>
                          </div>
                        )}
                      </div>

                      {/* Logo Position and Size Controls */}
                      {config.logo_config?.logos && config.logo_config.logos.length > 0 && (
                        <div className="mt-4 space-y-4 pt-4 border-t border-slate-200">
                          {config.logo_config.logos.map((logo, logoIndex) => (
                            <div key={logoIndex} className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between">
                                <h6 className="text-sm font-semibold text-slate-700">Logo {logoIndex + 1}</h6>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    X Position: {logo.position?.x || 15}%
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={logo.position?.x || 15}
                                    onChange={(e) => {
                                      const newLogos = [...(config.logo_config?.logos || [])];
                                      newLogos[logoIndex] = {
                                        ...newLogos[logoIndex],
                                        position: {
                                          ...newLogos[logoIndex].position,
                                          x: parseInt(e.target.value)
                                        }
                                      };
                                      updateConfig('logo_config', {
                                        ...config.logo_config,
                                        logos: newLogos
                                      });
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Y Position: {logo.position?.y || 10}%
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={logo.position?.y || 10}
                                    onChange={(e) => {
                                      const newLogos = [...(config.logo_config?.logos || [])];
                                      newLogos[logoIndex] = {
                                        ...newLogos[logoIndex],
                                        position: {
                                          ...newLogos[logoIndex].position,
                                          y: parseInt(e.target.value)
                                        }
                                      };
                                      updateConfig('logo_config', {
                                        ...config.logo_config,
                                        logos: newLogos
                                      });
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Width: {logo.size?.width || 120}px
                                  </label>
                                  <input
                                    type="range"
                                    min="50"
                                    max="500"
                                    step="10"
                                    value={logo.size?.width || 120}
                                    onChange={(e) => {
                                      const newLogos = [...(config.logo_config?.logos || [])];
                                      newLogos[logoIndex] = {
                                        ...newLogos[logoIndex],
                                        size: {
                                          ...newLogos[logoIndex].size,
                                          width: parseInt(e.target.value)
                                        }
                                      };
                                      updateConfig('logo_config', {
                                        ...config.logo_config,
                                        logos: newLogos
                                      });
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Height: {logo.size?.height || 120}px
                                  </label>
                                  <input
                                    type="range"
                                    min="50"
                                    max="500"
                                    step="10"
                                    value={logo.size?.height || 120}
                                    onChange={(e) => {
                                      const newLogos = [...(config.logo_config?.logos || [])];
                                      newLogos[logoIndex] = {
                                        ...newLogos[logoIndex],
                                        size: {
                                          ...newLogos[logoIndex].size,
                                          height: parseInt(e.target.value)
                                        }
                                      };
                                      updateConfig('logo_config', {
                                        ...config.logo_config,
                                        logos: newLogos
                                      });
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate ID Configuration */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                      <div className="w-1 h-6 rounded-full bg-blue-900"></div>
                      <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Certificate ID</h5>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          ID Prefix
                        </label>
                        <input
                          type="text"
                          value={config.cert_id_prefix || ''}
                          onChange={(e) => updateConfig('cert_id_prefix', e.target.value)}
                          placeholder="Enter prefix (e.g., CERT)"
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500 mt-1">Format: prefix-001 (001 will auto-increment)</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-2">
                            X Position: {config.cert_id_position?.x || 50}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={config.cert_id_position?.x || 50}
                            onChange={(e) => updateConfig('cert_id_position', {
                              ...config.cert_id_position,
                              x: parseInt(e.target.value),
                              y: config.cert_id_position?.y || 95
                            })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-2">
                            Y Position: {config.cert_id_position?.y || 95}%
                          </label>
                          <input
                            type="range"
                            min="80"
                            max="100"
                            value={config.cert_id_position?.y || 95}
                            onChange={(e) => updateConfig('cert_id_position', {
                              ...config.cert_id_position,
                              x: config.cert_id_position?.x || 50,
                              y: parseInt(e.target.value)
                            })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-slate-600">
                              Font Size
                            </label>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {config.cert_id_font_size || 14}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="24"
                            value={config.cert_id_font_size || 14}
                            onChange={(e) => updateConfig('cert_id_font_size', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-2">
                            Color
                          </label>
                          <input
                            type="color"
                            value={config.cert_id_color || '#000000'}
                            onChange={(e) => updateConfig('cert_id_color', e.target.value)}
                            className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* QR Code Settings */}
                      <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Enable QR Code
                          </label>
                          <input
                            type="checkbox"
                            checked={config.qr_code_enabled !== false}
                            onChange={(e) => updateConfig('qr_code_enabled', e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>

                        {config.qr_code_enabled !== false && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-medium text-slate-600">
                                QR Code Size
                              </label>
                              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                {config.qr_code_size || 60}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="30"
                              max="150"
                              step="5"
                              value={config.qr_code_size || 60}
                              onChange={(e) => updateConfig('qr_code_size', parseInt(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title Configuration */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                      <div className="w-1 h-6 rounded-full bg-blue-900"></div>
                      <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Certificate Title</h5>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Title Text
                        </label>
                        <input
                          type="text"
                          value={config.title_text || 'CERTIFICATE'}
                          onChange={(e) => updateConfig('title_text', e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="CERTIFICATE"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Title Subtitle
                        </label>
                        <input
                          type="text"
                          value={config.title_subtitle || ''}
                          onChange={(e) => updateConfig('title_subtitle', e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="OF PARTICIPATION"
                        />
                        <p className="text-xs text-slate-500 mt-1">Text that appears below the main title (e.g., "OF PARTICIPATION", "OF COMPLETION", etc.)</p>
                      </div>
                    </div>

                    {/* Subtitle Configuration */}
                    {config.title_subtitle && (
                      <div className="mt-5 space-y-4 pt-5 border-t border-slate-200/50">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Subtitle Styling</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-medium text-slate-600">
                                Font Size
                              </label>
                              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                {config.title_subtitle_config?.font_size || Math.round(config.title_font_size * 0.4)}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="60"
                              value={config.title_subtitle_config?.font_size || Math.round(config.title_font_size * 0.4)}
                              onChange={(e) => updateConfig('title_subtitle_config', {
                                ...config.title_subtitle_config,
                                font_size: parseInt(e.target.value)
                              })}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">
                              Color
                            </label>
                            <input
                              type="color"
                              value={config.title_subtitle_config?.color || config.title_color || '#000000'}
                              onChange={(e) => updateConfig('title_subtitle_config', {
                                ...config.title_subtitle_config,
                                color: e.target.value
                              })}
                              className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">
                              X Position: {config.title_subtitle_config?.position?.x ?? config.title_position.x}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={config.title_subtitle_config?.position?.x ?? config.title_position.x}
                              onChange={(e) => updateConfig('title_subtitle_config', {
                                ...config.title_subtitle_config,
                                position: {
                                  ...config.title_subtitle_config?.position,
                                  x: parseInt(e.target.value),
                                  y: config.title_subtitle_config?.position?.y ?? config.title_position.y + 2
                                }
                              })}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">
                              Y Position: {config.title_subtitle_config?.position?.y ?? config.title_position.y + 2}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={config.title_subtitle_config?.position?.y ?? config.title_position.y + 2}
                              onChange={(e) => updateConfig('title_subtitle_config', {
                                ...config.title_subtitle_config,
                                position: {
                                  ...config.title_subtitle_config?.position,
                                  x: config.title_subtitle_config?.position?.x ?? config.title_position.x,
                                  y: parseInt(e.target.value)
                                }
                              })}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Global Font Configuration */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                      <div className="w-1 h-6 rounded-full bg-blue-900"></div>
                      <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Global Font (All Text Except Name)</h5>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Font Family
                        </label>
                        <select
                          value={config.title_font_family || config.title_subtitle_config?.font_family || config.header_config?.republic_config?.font_family || 'Libre Baskerville, serif'}
                          onChange={(e) => {
                            const fontFamily = e.target.value;
                            // Update all fonts except name
                            const newConfig = {
                              ...config,
                              title_font_family: fontFamily,
                              title_subtitle_config: {
                                ...config.title_subtitle_config,
                                font_family: fontFamily
                              },
                              header_config: {
                                ...config.header_config,
                                republic_config: {
                                  ...config.header_config?.republic_config,
                                  font_family: fontFamily
                                },
                                university_config: {
                                  ...config.header_config?.university_config,
                                  font_family: fontFamily
                                },
                                location_config: {
                                  ...config.header_config?.location_config,
                                  font_family: fontFamily
                                }
                              },
                              participation_text_config: {
                                ...config.participation_text_config,
                                font_family: fontFamily
                              },
                              is_given_to_config: {
                                ...config.is_given_to_config,
                                font_family: fontFamily
                              },
                              event_title_config: {
                                ...config.event_title_config,
                                font_family: fontFamily
                              },
                              date_config: {
                                ...config.date_config,
                                font_family: fontFamily
                              },
                              signature_blocks: (config.signature_blocks || []).map(sig => ({
                                ...sig,
                                font_family: fontFamily
                              }))
                            };
                            setConfig(newConfig);
                          }}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <optgroup label="Serif Fonts">
                            <option value="Libre Baskerville, serif">Libre Baskerville</option>
                            <option value="Times New Roman, serif">Times New Roman</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="Garamond, serif">Garamond</option>
                            <option value="Palatino, serif">Palatino</option>
                            <option value="Book Antiqua, serif">Book Antiqua</option>
                            <option value="Baskerville, serif">Baskerville</option>
                            <option value="Bodoni, serif">Bodoni</option>
                            <option value="Caslon, serif">Caslon</option>
                            <option value="Century Schoolbook, serif">Century Schoolbook</option>
                            <option value="Didot, serif">Didot</option>
                            <option value="Hoefler Text, serif">Hoefler Text</option>
                            <option value="Minion Pro, serif">Minion Pro</option>
                            <option value="Playfair Display, serif">Playfair Display</option>
                            <option value="Lora, serif">Lora</option>
                            <option value="Merriweather, serif">Merriweather</option>
                            <option value="Crimson Text, serif">Crimson Text</option>
                            <option value="PT Serif, serif">PT Serif</option>
                            <option value="Source Serif Pro, serif">Source Serif Pro</option>
                            <option value="EB Garamond, serif">EB Garamond</option>
                            <option value="Cormorant Garamond, serif">Cormorant Garamond</option>
                          </optgroup>
                          <optgroup label="Sans-serif Fonts">
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="Helvetica, sans-serif">Helvetica</option>
                            <option value="Verdana, sans-serif">Verdana</option>
                            <option value="Tahoma, sans-serif">Tahoma</option>
                            <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
                            <option value="Lucida Grande, sans-serif">Lucida Grande</option>
                            <option value="Century Gothic, sans-serif">Century Gothic</option>
                            <option value="Futura, sans-serif">Futura</option>
                            <option value="Gill Sans, sans-serif">Gill Sans</option>
                            <option value="Roboto, sans-serif">Roboto</option>
                            <option value="Open Sans, sans-serif">Open Sans</option>
                            <option value="Lato, sans-serif">Lato</option>
                            <option value="Montserrat, sans-serif">Montserrat</option>
                            <option value="Raleway, sans-serif">Raleway</option>
                            <option value="Poppins, sans-serif">Poppins</option>
                            <option value="Nunito, sans-serif">Nunito</option>
                            <option value="Ubuntu, sans-serif">Ubuntu</option>
                            <option value="Source Sans Pro, sans-serif">Source Sans Pro</option>
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Work Sans, sans-serif">Work Sans</option>
                            <option value="DM Sans, sans-serif">DM Sans</option>
                            <option value="Noto Sans, sans-serif">Noto Sans</option>
                          </optgroup>
                          <optgroup label="Monospace Fonts">
                            <option value="Courier New, monospace">Courier New</option>
                            <option value="Monaco, monospace">Monaco</option>
                            <option value="Consolas, monospace">Consolas</option>
                            <option value="Menlo, monospace">Menlo</option>
                            <option value="Roboto Mono, monospace">Roboto Mono</option>
                            <option value="Source Code Pro, monospace">Source Code Pro</option>
                            <option value="Fira Code, monospace">Fira Code</option>
                          </optgroup>
                          <optgroup label="Display/Decorative Fonts">
                            <option value="Impact, sans-serif">Impact</option>
                            <option value="Comic Sans MS, cursive">Comic Sans MS</option>
                            <option value="Papyrus, fantasy">Papyrus</option>
                            <option value="Copperplate, fantasy">Copperplate</option>
                            <option value="Oswald, sans-serif">Oswald</option>
                            <option value="Bebas Neue, sans-serif">Bebas Neue</option>
                            <option value="Anton, sans-serif">Anton</option>
                            <option value="Righteous, cursive">Righteous</option>
                            <option value="Lobster, cursive">Lobster</option>
                            <option value="Pacifico, cursive">Pacifico</option>
                          </optgroup>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">This font applies to all text elements except the participant name</p>
                      </div>
                    </div>
                  </div>

                  {/* Name Configuration */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                      <div className="w-1 h-6 rounded-full bg-blue-900"></div>
                      <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Participant Name</h5>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Font Family
                        </label>
                        <select
                          value={config.name_config?.font_family || 'MonteCarlo, cursive'}
                          onChange={(e) => updateConfig('name_config.font_family', e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <optgroup label="Cursive/Script Fonts">
                            <option value="MonteCarlo, cursive">MonteCarlo</option>
                            <option value="Brush Script MT, cursive">Brush Script MT</option>
                            <option value="Lucida Handwriting, cursive">Lucida Handwriting</option>
                            <option value="Comic Sans MS, cursive">Comic Sans MS</option>
                            <option value="Pacifico, cursive">Pacifico</option>
                            <option value="Lobster, cursive">Lobster</option>
                            <option value="Dancing Script, cursive">Dancing Script</option>
                            <option value="Great Vibes, cursive">Great Vibes</option>
                            <option value="Allura, cursive">Allura</option>
                            <option value="Satisfy, cursive">Satisfy</option>
                            <option value="Kalam, cursive">Kalam</option>
                            <option value="Caveat, cursive">Caveat</option>
                            <option value="Permanent Marker, cursive">Permanent Marker</option>
                            <option value="Indie Flower, cursive">Indie Flower</option>
                            <option value="Shadows Into Light, cursive">Shadows Into Light</option>
                            <option value="Amatic SC, cursive">Amatic SC</option>
                            <option value="Kaushan Script, cursive">Kaushan Script</option>
                            <option value="Parisienne, cursive">Parisienne</option>
                            <option value="Sacramento, cursive">Sacramento</option>
                            <option value="Tangerine, cursive">Tangerine</option>
                          </optgroup>
                          <optgroup label="Serif Fonts">
                            <option value="Libre Baskerville, serif">Libre Baskerville</option>
                            <option value="Times New Roman, serif">Times New Roman</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="Garamond, serif">Garamond</option>
                            <option value="Palatino, serif">Palatino</option>
                            <option value="Book Antiqua, serif">Book Antiqua</option>
                            <option value="Baskerville, serif">Baskerville</option>
                            <option value="Bodoni, serif">Bodoni</option>
                            <option value="Playfair Display, serif">Playfair Display</option>
                            <option value="Lora, serif">Lora</option>
                            <option value="Merriweather, serif">Merriweather</option>
                            <option value="Crimson Text, serif">Crimson Text</option>
                            <option value="PT Serif, serif">PT Serif</option>
                            <option value="EB Garamond, serif">EB Garamond</option>
                            <option value="Cormorant Garamond, serif">Cormorant Garamond</option>
                          </optgroup>
                          <optgroup label="Sans-serif Fonts">
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="Helvetica, sans-serif">Helvetica</option>
                            <option value="Verdana, sans-serif">Verdana</option>
                            <option value="Tahoma, sans-serif">Tahoma</option>
                            <option value="Roboto, sans-serif">Roboto</option>
                            <option value="Open Sans, sans-serif">Open Sans</option>
                            <option value="Lato, sans-serif">Lato</option>
                            <option value="Montserrat, sans-serif">Montserrat</option>
                            <option value="Raleway, sans-serif">Raleway</option>
                            <option value="Poppins, sans-serif">Poppins</option>
                            <option value="Nunito, sans-serif">Nunito</option>
                            <option value="Ubuntu, sans-serif">Ubuntu</option>
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Work Sans, sans-serif">Work Sans</option>
                          </optgroup>
                          <optgroup label="Display/Decorative Fonts">
                            <option value="Oswald, sans-serif">Oswald</option>
                            <option value="Bebas Neue, sans-serif">Bebas Neue</option>
                            <option value="Anton, sans-serif">Anton</option>
                            <option value="Righteous, cursive">Righteous</option>
                            <option value="Impact, sans-serif">Impact</option>
                            <option value="Copperplate, fantasy">Copperplate</option>
                          </optgroup>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Font specifically for the participant name</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Font Size
                          </label>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {config.name_config.font_size}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="16"
                          max="60"
                          value={config.name_config.font_size}
                          onChange={(e) => updateConfig('name_config.font_size', parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signature Blocks Configuration */}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 rounded-full bg-blue-900"></div>
                        <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Signature Blocks</h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateSignatureBlocks([
                            ...(config.signature_blocks || []),
                            {
                              name: '[Name]',
                              position: '[Position]',
                              position_config: { x: 50, y: 92 },
                              name_font_size: 14,
                              name_color: '#000000',
                              position_font_size: 12,
                              position_color: '#000000',
                              font_family: 'Libre Baskerville, serif',
                              signature_image_url: null,
                              signature_image_width: 300,
                              signature_image_height: 100,
                              signature_source: 'draw',
                              typed_text: '',
                              typed_font: 'Dancing Script, cursive'
                            }
                          ]);
                        }}
                        className="px-4 py-2 text-xs font-semibold bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Block
                      </button>
                    </div>

                    {config.signature_blocks && config.signature_blocks.length > 0 && (
                      <div className="space-y-6">
                        {config.signature_blocks.map((signature, index) => (
                          <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center justify-between mb-4">
                              <h6 className="font-medium text-slate-700">Signature Block {index + 1}</h6>
                              <button
                                type="button"
                                onClick={() => {
                                  updateSignatureBlocks(config.signature_blocks.filter((_, i) => i !== index));
                                }}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={signature.name || ''}
                                  onChange={(e) => {
                                    const newBlocks = [...config.signature_blocks];
                                    newBlocks[index] = { ...newBlocks[index], name: e.target.value };
                                    updateSignatureBlocks(newBlocks);
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="[Name]"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                  Position
                                </label>
                                <input
                                  type="text"
                                  value={signature.position || ''}
                                  onChange={(e) => {
                                    const newBlocks = [...config.signature_blocks];
                                    newBlocks[index] = { ...newBlocks[index], position: e.target.value };
                                    updateSignatureBlocks(newBlocks);
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="[Position]"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Name size: {signature.name_font_size || 14}px
                                  </label>
                                  <input
                                    type="range"
                                    min="10"
                                    max="24"
                                    value={signature.name_font_size || 14}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = { ...newBlocks[index], name_font_size: parseInt(e.target.value) };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Position size: {signature.position_font_size || 12}px
                                  </label>
                                  <input
                                    type="range"
                                    min="8"
                                    max="20"
                                    value={signature.position_font_size || 12}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = { ...newBlocks[index], position_font_size: parseInt(e.target.value) };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Name color
                                  </label>
                                  <input
                                    type="color"
                                    value={signature.name_color || '#000000'}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = { ...newBlocks[index], name_color: e.target.value };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full h-9 rounded-md border border-slate-300"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Position color
                                  </label>
                                  <input
                                    type="color"
                                    value={signature.position_color || '#000000'}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = { ...newBlocks[index], position_color: e.target.value };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full h-9 rounded-md border border-slate-300"
                                  />
                                </div>
                              </div>

                              <SignatureCapture
                                signature={signature}
                                uploading={!!uploadingSignature[index]}
                                onChangeSource={(nextSource) => {
                                  const newBlocks = config.signature_blocks.map((block, i) =>
                                    i === index ? { ...block, signature_source: nextSource } : block
                                  );
                                  updateSignatureBlocks(newBlocks);
                                }}
                                onApplyFile={(file, nextSource) => handleSignatureImageUpload(file, index, nextSource)}
                                onRemove={() => {
                                  const newBlocks = config.signature_blocks.map((block, i) =>
                                    i === index ? { ...block, signature_image_url: null } : block
                                  );
                                  updateSignatureBlocks(newBlocks);
                                }}
                                onUpdate={(patch) => {
                                  const newBlocks = config.signature_blocks.map((block, i) =>
                                    i === index ? { ...block, ...patch } : block
                                  );
                                  updateSignatureBlocks(newBlocks);
                                }}
                              />

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-600 mb-2">
                                    X Position: {signature.position_config?.x || 50}%
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={signature.position_config?.x || 50}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = {
                                        ...newBlocks[index],
                                        position_config: {
                                          ...(newBlocks[index].position_config || { y: 92 }),
                                          x: parseInt(e.target.value)
                                        }
                                      };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Y Position: {signature.position_config?.y || 92}%
                                  </label>
                                  <input
                                    type="range"
                                    min="80"
                                    max="100"
                                    value={signature.position_config?.y || 92}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = {
                                        ...newBlocks[index],
                                        position_config: {
                                          ...(newBlocks[index].position_config || { x: 50 }),
                                          y: parseInt(e.target.value)
                                        }
                                      };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
        </div>
        <div className="shrink-0 border-t border-slate-200 p-2 bg-white">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className={`w-full h-10 rounded-md text-sm font-semibold text-white transition-all ${saving || loading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-900 hover:bg-blue-800'
              } flex items-center justify-center gap-2`}
          >
            {saving ? (
              <SmartSpinner
                active
                variant="inline"
                light
                label="Saving"
                messages={['Still saving', 'Almost there']}
              >
                <span>{draftMode ? 'Save Draft' : 'Save'}</span>
              </SmartSpinner>
            ) : (
              <span>{draftMode ? 'Save Draft' : 'Save Configuration'}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Preview — right */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-200/70">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-3 py-1.5">
          <h4 className="text-xs font-semibold text-slate-700">Preview</h4>
          <p className="text-[11px] text-slate-500">Click to select · Drag or arrow keys to move</p>
        </div>
        <div ref={previewWrapRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
          {renderPreview()}
        </div>
      </section>
    </div>
  );
};

export default CertificateDesigner;


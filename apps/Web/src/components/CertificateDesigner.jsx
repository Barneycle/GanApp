import React, { useState, useRef, useEffect } from 'react';
import { CertificateService } from '../services/certificateService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const CertificateDesigner = ({ eventId, onSave, draftMode = false, draftStorageKey = 'pending-certificate-config' }) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const previewRef = useRef(null);

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
      font_size: 18,
      color: '#000000',
      position: { x: 50, y: 60 },
      font_family: 'Libre Baskerville, serif',
      font_weight: 'normal',
      line_height: 1.5
    },
    // "is given to" text configuration
    is_given_to_config: {
      text: 'This certificate is proudly presented to',
      font_size: 16,
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
            header_config: { ...defaultConfig.header_config, ...(savedConfig.header_config || {}) },
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
          header_config: { ...defaultConfig.header_config, ...(result.config.header_config || {}) },
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

      const { data: uploadData, error: uploadError } = await supabase.storage
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
      const { data: bgData, error: dbError } = await supabase
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

      const { data: uploadData, error: uploadError } = await supabase.storage
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
      const { data: logoData, error: dbError } = await supabase
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

  // Upload signature image to Supabase Storage
  const handleSignatureImageUpload = async (file, blockIndex) => {
    if (!file || !user?.id) return;

    // Validate file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(fileExt)) {
      setError('Only PNG and JPG files are allowed');
      return;
    }

    setUploadingSignature(prev => ({ ...prev, [blockIndex]: true }));
    setError(null);

    try {
      // Use eventId if available, otherwise use 'draft' for draft mode
      const eventIdForPath = eventId || 'draft';
      const fileName = `signature_${blockIndex}_${Date.now()}.${fileExt}`;
      const filePath = `signatures/${eventIdForPath}/${fileName}`;

      // Use certificate-signatures bucket
      const bucketName = 'certificate-signatures';
      let uploadData, uploadError;

      ({ data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        }));

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Update signature block with the uploaded URL
      const newBlocks = config.signature_blocks.map((block, i) =>
        i === blockIndex
          ? {
            ...block,
            signature_image_url: publicUrl,
            signature_image_width: block.signature_image_width ?? 300,
            signature_image_height: block.signature_image_height ?? 100
          }
          : block
      );
      updateSignatureBlocks(newBlocks);

    } catch (err) {
      setError(err.message || 'Failed to upload signature image');
    } finally {
      setUploadingSignature(prev => ({ ...prev, [blockIndex]: false }));
    }
  };

  const renderPreview = () => {
    // Safety check - ensure config is valid
    if (!config || !config.width || !config.height) {
      return <div className="text-center text-slate-500 p-8">Loading certificate preview...</div>;
    }

    // Use actual certificate dimensions for preview with scaling for better visibility
    const actualWidth = config.width;
    const actualHeight = config.height;
    const displayScale = 0.9; // Scale down slightly for better fit
    const displayWidth = actualWidth * displayScale;
    const displayHeight = actualHeight * displayScale;
    const scale = displayScale; // Use scale for display
    const header = config.header_config || defaultConfig.header_config;
    const logos = config.logo_config || defaultConfig.logo_config;
    const participation = config.participation_text_config || defaultConfig.participation_text_config;
    const isGivenTo = config.is_given_to_config || defaultConfig.is_given_to_config;
    // Ensure at least one signature block exists for preview
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
          overflow: 'hidden',
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
            style={{
              position: 'absolute',
              left: `${logo.position?.x || 15}%`,
              top: `${logo.position?.y || 10}%`,
              width: `${((logo.size?.width || 120) * scale)}px`,
              height: `${((logo.size?.height || 120) * scale)}px`,
              objectFit: 'contain'
            }}
          />
        ))}

        {/* Sponsor Logos - Top Right */}
        {logos?.sponsor_logos && logos.sponsor_logos.length > 0 && logos.sponsor_logos.map((logoUrl, index) => (
          <img
            key={index}
            src={logoUrl}
            alt={`Sponsor Logo ${index + 1}`}
            style={{
              position: 'absolute',
              right: `${100 - logos.sponsor_logo_position.x}%`,
              top: `${logos.sponsor_logo_position.y + (index * (logos.sponsor_logo_size.height + logos.sponsor_logo_spacing) / (config.height / 100))}%`,
              width: `${(logos.sponsor_logo_size.width * scale)}px`,
              height: `${(logos.sponsor_logo_size.height * scale)}px`,
              objectFit: 'contain'
            }}
          />
        ))}

        {/* Header Text - Republic */}
        {header?.republic_text && (
          <div
            style={{
              position: 'absolute',
              left: `${header.republic_config.position.x}%`,
              top: `${header.republic_config.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(header.republic_config.font_size || 20) * scale}px`,
              color: header.republic_config.color || '#000000',
              fontFamily: header.republic_config.font_family || 'Libre Baskerville, serif',
              fontWeight: header.republic_config.font_weight || 'normal',
              textAlign: 'center',
              width: '100%'
            }}
          >
            {header.republic_text}
          </div>
        )}

        {/* Header Text - University */}
        {header?.university_text && (
          <div
            style={{
              position: 'absolute',
              left: `${header.university_config.position.x}%`,
              top: `${header.university_config.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(header.university_config.font_size || 28) * scale}px`,
              color: header.university_config.color || '#000000',
              fontFamily: header.university_config.font_family || 'Libre Baskerville, serif',
              fontWeight: header.university_config.font_weight || 'bold',
              textAlign: 'center',
              width: '100%'
            }}
          >
            {header.university_text}
          </div>
        )}

        {/* Header Text - Location */}
        {header?.location_text && (
          <div
            style={{
              position: 'absolute',
              left: `${header.location_config.position.x}%`,
              top: `${header.location_config.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(header.location_config.font_size || 20) * scale}px`,
              color: header.location_config.color || '#000000',
              fontFamily: header.location_config.font_family || 'Libre Baskerville, serif',
              fontWeight: header.location_config.font_weight || 'normal',
              textAlign: 'center',
              width: '100%'
            }}
          >
            {header.location_text}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            position: 'absolute',
            left: `${config.title_position.x}%`,
            top: `${config.title_position.y - 4}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${config.title_font_size * scale}px`,
            color: config.title_color,
            fontWeight: 'bold',
            fontFamily: config.title_font_family || 'Libre Baskerville, serif',
            textAlign: 'center',
            width: '100%',
            letterSpacing: '3px'
          }}
        >
          {config.title_text}
        </div>

        {/* Title Subtitle */}
        {config.title_subtitle && (
          <div
            style={{
              position: 'absolute',
              left: `${(config.title_subtitle_config?.position?.x ?? config.title_position.x)}%`,
              top: `${(config.title_subtitle_config?.position?.y ?? config.title_position.y + 2)}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${((config.title_subtitle_config?.font_size ?? config.title_font_size * 0.4) * scale)}px`,
              color: config.title_subtitle_config?.color ?? config.title_color,
              fontWeight: config.title_subtitle_config?.font_weight || 'normal',
              fontFamily: config.title_subtitle_config?.font_family || config.title_font_family || 'Libre Baskerville, serif',
              textAlign: 'center',
              width: '100%',
              letterSpacing: config.title_subtitle_config?.letter_spacing || '2px'
            }}
          >
            {config.title_subtitle}
          </div>
        )}

        {/* "is given to" Text */}
        {isGivenTo?.text && (
          <div
            style={{
              position: 'absolute',
              left: `${isGivenTo.position.x}%`,
              top: `${isGivenTo.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(isGivenTo.font_size || 16) * scale}px`,
              color: isGivenTo.color || '#000000',
              fontFamily: isGivenTo.font_family || 'Libre Baskerville, serif',
              fontWeight: isGivenTo.font_weight || 'normal',
              textAlign: 'center',
              width: '100%'
            }}
          >
            {isGivenTo.text}
          </div>
        )}

        {/* Name Text - Placeholder */}
        {config.name_config && (
          <div
            style={{
              position: 'absolute',
              left: '20%',
              right: '20%',
              top: `${config.name_config.position.y}%`,
              transform: 'translateY(-50%)',
              fontSize: `${config.name_config.font_size * scale}px`,
              color: config.name_config.color,
              fontFamily: config.name_config.font_family,
              fontWeight: config.name_config.font_weight,
              textAlign: 'center',
              width: '60%',
              margin: '0 auto',
              letterSpacing: '0.05em'
            }}
          >
            [Participant Name]
          </div>
        )}

        {/* First Horizontal Line Separator - After Name */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${(config.name_config?.position?.y || defaultConfig.name_config.position.y) + 3}%`,
            transform: 'translate(-50%, -50%)',
            width: '60%',
            height: `${2 * scale}px`,
            backgroundColor: '#000000'
          }}
        />

        {/* Participation Text */}
        {participation?.text_template && (
          <div
            style={{
              position: 'absolute',
              left: `${participation.position.x}%`,
              top: `${participation.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(participation.font_size || 18) * scale}px`,
              color: participation.color || '#000000',
              fontFamily: participation.font_family || 'Libre Baskerville, serif',
              fontWeight: participation.font_weight || 'normal',
              textAlign: 'center',
              width: '80%',
              lineHeight: participation.line_height || 1.5
            }}
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
            style={{
              position: 'absolute',
              left: `${config.cert_id_position?.x || 50}%`,
              top: `${config.cert_id_position?.y || 95}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: `${10 * scale}px`,
              width: 'auto'
            }}
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
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
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
            style={{
              position: 'absolute',
              left: `${signature.position_config?.x || 50}%`,
              top: `${signature.position_config?.y || 92}%`,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              minWidth: `${(signature.signature_image_width ?? 300) * scale}px`,
              maxWidth: 'none',
              width: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Signature Image - Centered above name */}
            {signature.signature_image_url && (
              <img
                src={signature.signature_image_url}
                alt={`Signature ${index + 1}`}
                style={{
                  width: `${(signature.signature_image_width ?? 300) * scale}px`,
                  height: `${(signature.signature_image_height ?? 100) * scale}px`,
                  maxWidth: 'none',
                  objectFit: 'contain',
                  display: 'block',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginBottom: `${-40 * scale}px`
                }}
              />
            )}
            {/* Name - Always visible, centered */}
            <div
              style={{
                fontSize: `${(signature.name_font_size || 14) * scale}px`,
                color: signature.name_color || '#000000',
                fontFamily: signature.font_family || 'Libre Baskerville, serif',
                fontWeight: 'bold',
                marginBottom: `${2 * scale}px`,
                marginTop: signature.signature_image_url ? `${-10 * scale}px` : '0',
                textAlign: 'center',
                width: '100%'
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
                width: '100%'
              }}
            >
              {signature.position || '[Position]'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Certificate Designer</h3>
              <p className="text-slate-500 text-sm mt-1">Create and customize professional certificates</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/50 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-emerald-800 text-sm font-medium">
                {typeof success === 'string' ? success : (draftMode ? 'Certificate configuration saved as draft!' : 'Certificate configuration saved successfully!')}
              </p>
            </div>
          </div>
        )}

        {draftMode && (
          <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-blue-800 text-sm font-medium">
                <strong>Draft Mode:</strong> Changes are saved automatically and will be finalized when you create the event.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Preview Section */}
          <div className="flex justify-center w-full overflow-x-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden flex-shrink-0" style={{
              width: '3500px',
              minWidth: '3500px'
            }}>
              <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Live Preview
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    Real-time updates
                  </div>
                </div>
              </div>
              <div className="p-10 bg-gradient-to-br from-slate-100 to-slate-50 flex justify-center items-start">
                <div className="bg-white rounded-xl shadow-lg" key={JSON.stringify(config.signature_blocks?.map(s => ({
                  width: s.signature_image_width,
                  height: s.signature_image_height
                })))}>
                  {renderPreview()}
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden" style={{ maxWidth: '800px', width: '100%' }}>
              <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-200/50">
                <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Settings
                </h4>
              </div>
              <div className="p-6 max-h-[800px] overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9'
              }}>
                <style>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                  }
                `}</style>
                <div className="space-y-8 custom-scrollbar">
                  {/* Background & Border */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
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
                          className={`group flex flex-col items-center justify-center w-full px-4 py-6 text-sm text-center rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploadingBackground
                            ? 'bg-slate-100 cursor-not-allowed opacity-50 border-slate-300'
                            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md'
                            }`}
                        >
                          {uploadingBackground ? (
                            <div className="flex items-center gap-2 text-slate-500">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Uploading...</span>
                            </div>
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
                            className="w-full px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
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
                          <div className="flex items-center justify-center py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-sm">Loading...</span>
                            </div>
                          </div>
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
                      <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
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
                          className={`group flex flex-col items-center justify-center w-full px-4 py-6 text-sm text-center rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploadingLogo
                            ? 'bg-slate-100 cursor-not-allowed opacity-50 border-slate-300'
                            : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50 hover:shadow-md'
                            }`}
                        >
                          {uploadingLogo ? (
                            <div className="flex items-center gap-2 text-slate-500">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Uploading...</span>
                            </div>
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
                          <div className="flex items-center justify-center py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-sm">Loading...</span>
                            </div>
                          </div>
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
                      <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full"></div>
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
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
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
                      <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h5 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Global Font (All Text Except Name)</h5>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Font Family
                        </label>
                        <select
                          value={config.title_font_family || config.header_config?.republic_config?.font_family || 'Libre Baskerville, serif'}
                          onChange={(e) => {
                            const fontFamily = e.target.value;
                            // Update all fonts except name
                            const newConfig = {
                              ...config,
                              title_font_family: fontFamily,
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
                      <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
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
                        <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
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
                              signature_image_height: 100
                            }
                          ]);
                        }}
                        className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center gap-1.5"
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

                              <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                  Signature Image (PNG/JPG)
                                </label>
                                <input
                                  type="file"
                                  accept=".png,.jpg,.jpeg"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleSignatureImageUpload(file, index);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  disabled={uploadingSignature[index]}
                                />
                                {uploadingSignature[index] && (
                                  <p className="text-sm text-blue-600 mt-1">Uploading...</p>
                                )}
                                {signature.signature_image_url && (
                                  <div className="mt-2">
                                    <img
                                      src={signature.signature_image_url}
                                      alt="Signature"
                                      className="h-20 border border-slate-300 rounded"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newBlocks = [...config.signature_blocks];
                                        newBlocks[index] = { ...newBlocks[index], signature_image_url: null };
                                        updateSignatureBlocks(newBlocks);
                                      }}
                                      className="mt-1 text-sm text-red-600 hover:text-red-700"
                                    >
                                      Remove
                                    </button>

                                    {/* Signature Image Size Sliders */}
                                    <div className="mt-4 space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">
                                          Image Width: {signature.signature_image_width || 300}px
                                        </label>
                                        <input
                                          type="range"
                                          min="100"
                                          max="1200"
                                          step="10"
                                          value={signature.signature_image_width ?? 300}
                                          onChange={(e) => {
                                            const newBlocks = config.signature_blocks.map((block, i) =>
                                              i === index
                                                ? { ...block, signature_image_width: parseInt(e.target.value) }
                                                : block
                                            );
                                            updateSignatureBlocks(newBlocks);
                                          }}
                                          className="w-full"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">
                                          Image Height: {signature.signature_image_height || 100}px
                                        </label>
                                        <input
                                          type="range"
                                          min="50"
                                          max="300"
                                          step="10"
                                          value={signature.signature_image_height ?? 100}
                                          onChange={(e) => {
                                            const newBlocks = config.signature_blocks.map((block, i) =>
                                              i === index
                                                ? { ...block, signature_image_height: parseInt(e.target.value) }
                                                : block
                                            );
                                            updateSignatureBlocks(newBlocks);
                                          }}
                                          className="w-full"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Name Font Size: {signature.name_font_size || 14}px
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
                                  <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Position Font Size: {signature.position_font_size || 12}px
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

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Name Color
                                  </label>
                                  <input
                                    type="color"
                                    value={signature.name_color || '#000000'}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = { ...newBlocks[index], name_color: e.target.value };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full h-10 rounded-lg border border-slate-300"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Position Color
                                  </label>
                                  <input
                                    type="color"
                                    value={signature.position_color || '#000000'}
                                    onChange={(e) => {
                                      const newBlocks = [...config.signature_blocks];
                                      newBlocks[index] = { ...newBlocks[index], position_color: e.target.value };
                                      updateSignatureBlocks(newBlocks);
                                    }}
                                    className="w-full h-10 rounded-lg border border-slate-300"
                                  />
                                </div>
                              </div>

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
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className={`px-8 py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg ${saving || loading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl transform hover:-translate-y-0.5'
              } flex items-center gap-2`}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{draftMode ? 'Save Draft' : 'Save Configuration'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateDesigner;


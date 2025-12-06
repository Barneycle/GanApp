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
    border_color: '#1e40af',
    border_width: 5,
    title_text: 'CERTIFICATE',
    title_subtitle: 'OF PARTICIPATION',
    title_font_size: 56,
    title_color: '#000000',
    title_position: { x: 50, y: 28 },
    width: 2000,
    height: 1200,
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
        font_size: 14,
        color: '#000000',
        position: { x: 50, y: 8 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal'
      },
      university_config: {
        font_size: 20,
        color: '#000000',
        position: { x: 50, y: 11 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'bold'
      },
      location_config: {
        font_size: 14,
        color: '#000000',
        position: { x: 50, y: 14 },
        font_family: 'Libre Baskerville, serif',
        font_weight: 'normal'
      }
    },
    // Logo configuration
    logo_config: {
      psu_logo_url: null,
      psu_logo_size: { width: 120, height: 120 },
      psu_logo_position: { x: 15, y: 10 },
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
    signature_blocks: []
  };

  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState({});

  useEffect(() => {
    loadConfig();
  }, [eventId]);

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
            logo_config: { ...defaultConfig.logo_config, ...(savedConfig.logo_config || {}) },
            participation_text_config: { 
              ...defaultConfig.participation_text_config, 
              ...(savedConfig.participation_text_config || {}),
              position: { 
                ...defaultConfig.participation_text_config.position, 
                ...(savedConfig.participation_text_config?.position || {}) 
              }
            },
            is_given_to_config: { ...defaultConfig.is_given_to_config, ...(savedConfig.is_given_to_config || {}) },
            signature_blocks: savedConfig.signature_blocks || defaultConfig.signature_blocks
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
          logo_config: { ...defaultConfig.logo_config, ...(result.config.logo_config || {}) },
          participation_text_config: { ...defaultConfig.participation_text_config, ...(result.config.participation_text_config || {}) },
          is_given_to_config: { ...defaultConfig.is_given_to_config, ...(result.config.is_given_to_config || {}) },
          name_config: { ...defaultConfig.name_config, ...(result.config.name_config || {}) },
          signature_blocks: (result.config.signature_blocks && Array.isArray(result.config.signature_blocks)) 
            ? result.config.signature_blocks 
            : (defaultConfig.signature_blocks || [])
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
    
    // Maintain landscape aspect ratio (wider than tall)
    const aspectRatio = config.width / config.height;
    // Calculate preview size - use larger size for better readability
    // Max width of 1400px for large displays, but will scale down to fit container
    const maxPreviewWidth = 1400;
    const previewWidth = Math.min(maxPreviewWidth, config.width);
    const previewHeight = previewWidth / aspectRatio; // Height calculated to maintain aspect ratio
    const scale = previewWidth / config.width;
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
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
          maxWidth: '95%',
          maxHeight: '90vh',
          backgroundColor: config.background_color,
          border: `${config.border_width * scale}px solid ${config.border_color}`,
          position: 'relative',
          margin: '0 auto',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'block'
        }}
      >
        {/* PSU Logo - Top Left */}
        {logos?.psu_logo_url && (
          <img
            src={logos.psu_logo_url}
            alt="PSU Logo"
            style={{
              position: 'absolute',
              left: `${logos.psu_logo_position.x}%`,
              top: `${logos.psu_logo_position.y}%`,
              width: `${(logos.psu_logo_size.width * scale)}px`,
              height: `${(logos.psu_logo_size.height * scale)}px`,
              objectFit: 'contain'
            }}
          />
        )}

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
              fontSize: `${(header.republic_config.font_size || 14) * scale}px`,
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
              fontSize: `${(header.university_config.font_size || 20) * scale}px`,
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
              fontSize: `${(header.location_config.font_size || 14) * scale}px`,
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
            fontFamily: 'Libre Baskerville, serif',
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
              left: `${config.title_position.x}%`,
              top: `${config.title_position.y + 2}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${(config.title_font_size * 0.4) * scale}px`,
              color: config.title_color,
              fontWeight: 'normal',
              fontFamily: 'Libre Baskerville, serif',
              textAlign: 'center',
              width: '100%',
              letterSpacing: '2px'
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
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Certificate Designer</h3>
        <p className="text-slate-600">Customize the certificate layout for this event</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            {draftMode ? 'Certificate configuration saved as draft!' : 'Certificate configuration saved successfully!'}
          </p>
        </div>
      )}
      
      {draftMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Draft Mode:</strong> Certificate configuration is being saved automatically. It will be finalized when you create the event.
          </p>
        </div>
      )}

      {/* Preview - Landscape orientation */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-700 mb-4">Preview</h4>
        <div className="bg-slate-100 p-6 rounded-lg w-full overflow-hidden">
          <div className="flex justify-center items-center w-full" key={JSON.stringify(config.signature_blocks?.map(s => ({ 
            width: s.signature_image_width, 
            height: s.signature_image_height 
          })))}>
            {renderPreview()}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div>
          <h4 className="text-lg font-semibold text-slate-700 mb-4">Configuration</h4>
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {/* Background & Border */}
            <div className="space-y-4">
              <h5 className="font-medium text-slate-700">Background & Border</h5>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Background Color
                </label>
                <input
                  type="color"
                  value={config.background_color}
                  onChange={(e) => updateConfig('background_color', e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Border Color
                </label>
                <input
                  type="color"
                  value={config.border_color}
                  onChange={(e) => updateConfig('border_color', e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Border Width: {config.border_width}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={config.border_width}
                  onChange={(e) => updateConfig('border_width', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Name Configuration - Font Size Only */}
            <div className="space-y-4">
              <h5 className="font-medium text-slate-700">Participant Name</h5>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Font Size: {config.name_config.font_size}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="60"
                  value={config.name_config.font_size}
                  onChange={(e) => updateConfig('name_config.font_size', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Signature Blocks Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-slate-700">Signature Blocks</h5>
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
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Add Signature Block
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

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
            saving || loading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saving ? 'Saving...' : draftMode ? 'Save Draft' : 'Save Certificate Configuration'}
        </button>
      </div>
    </div>
  );
};

export default CertificateDesigner;


import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CertificateService } from '../services/certificateService';
import { EventService } from '../services/eventService';
import { useAuth } from '../contexts/AuthContext';

const CertificateGenerator = ({ eventId, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);
  const [config, setConfig] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (eventId && user?.id) {
      loadData();
    }
  }, [eventId, user?.id]);

  // Default config (same as CertificateDesigner)
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
    logo_config: {
      psu_logo_url: null,
      psu_logo_size: { width: 120, height: 120 },
      psu_logo_position: { x: 15, y: 10 },
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
    signature_blocks: []
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load event
      const eventResult = await EventService.getEventById(eventId);
      if (eventResult.error) {
        setError(eventResult.error);
        return;
      }
      setEvent(eventResult.event);

      // Load certificate config
      const configResult = await CertificateService.getCertificateConfig(eventId);
      if (configResult.error) {
        // Use default config if there's an error loading
        setConfig(defaultConfig);
      } else if (!configResult.config) {
        // Use default config if no config exists
        setConfig(defaultConfig);
      } else {
        // Deep merge with default config to ensure all fields are present
        const mergedConfig = {
          ...defaultConfig,
          ...configResult.config,
          header_config: { ...defaultConfig.header_config, ...(configResult.config.header_config || {}) },
          logo_config: { ...defaultConfig.logo_config, ...(configResult.config.logo_config || {}) },
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
          signature_blocks: configResult.config.signature_blocks || defaultConfig.signature_blocks
        };
        setConfig(mergedConfig);
      }

      // Check if certificate already exists
      const certResult = await CertificateService.getUserCertificate(user.id, eventId);
      if (certResult.certificate) {
        setCertificate(certResult.certificate);
        // Load preview
        loadPreview(certResult.certificate);
      }
    } catch (err) {
      setError(err.message || 'Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = (cert) => {
    if (cert.certificate_png_url) {
      setPreviewData({
        type: 'png',
        url: cert.certificate_png_url
      });
    } else if (cert.certificate_pdf_url) {
      setPreviewData({
        type: 'pdf',
        url: cert.certificate_pdf_url
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

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

  const generatePDF = async () => {
    if (!config || !event) return null;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([config.width || 2000, config.height || 1200]);
    const { width, height } = page.getSize();

    // Background
    const bgColor = config.background_color || '#ffffff';
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: rgb(
        parseInt(bgColor.substring(1, 3) || 'ff', 16) / 255,
        parseInt(bgColor.substring(3, 5) || 'ff', 16) / 255,
        parseInt(bgColor.substring(5, 7) || 'ff', 16) / 255
      )
    });

    // Border
    if (config.border_width && config.border_width > 0) {
      const borderColor = config.border_color || '#1e40af';
      page.drawRectangle({
        x: config.border_width / 2,
        y: config.border_width / 2,
        width: width - config.border_width,
        height: height - config.border_width,
        borderColor: rgb(
          parseInt(borderColor.substring(1, 3), 16) / 255,
          parseInt(borderColor.substring(3, 5), 16) / 255,
          parseInt(borderColor.substring(5, 7), 16) / 255
        ),
        borderWidth: config.border_width
      });
    }

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const header = config.header_config || {};
    const participation = config.participation_text_config || {};
    const isGivenTo = config.is_given_to_config || {};
    const nameConfig = config.name_config || {};
    const participantName = getUserName();

    // Helper to convert hex to RGB
    const hexToRgb = (hex) => {
      const r = parseInt(hex.substring(1, 3), 16) / 255;
      const g = parseInt(hex.substring(3, 5), 16) / 255;
      const b = parseInt(hex.substring(5, 7), 16) / 255;
      return rgb(r, g, b);
    };

    // Header - Republic
    if (header.republic_text && header.republic_config) {
      const repConfig = header.republic_config;
      const textWidth = helveticaFont.widthOfTextAtSize(header.republic_text, repConfig.font_size || 14);
      page.drawText(header.republic_text, {
        x: (width * repConfig.position.x) / 100 - textWidth / 2,
        y: height - (height * repConfig.position.y) / 100,
        size: repConfig.font_size || 14,
        font: repConfig.font_weight === 'bold' ? helveticaBoldFont : helveticaFont,
        color: hexToRgb(repConfig.color || '#000000')
      });
    }

    // Header - University
    if (header.university_text && header.university_config) {
      const uniConfig = header.university_config;
      const textWidth = helveticaBoldFont.widthOfTextAtSize(header.university_text, uniConfig.font_size || 20);
      page.drawText(header.university_text, {
        x: (width * uniConfig.position.x) / 100 - textWidth / 2,
        y: height - (height * uniConfig.position.y) / 100,
        size: uniConfig.font_size || 20,
        font: helveticaBoldFont,
        color: hexToRgb(uniConfig.color || '#000000')
      });
    }

    // Header - Location
    if (header.location_text && header.location_config) {
      const locConfig = header.location_config;
      const textWidth = helveticaFont.widthOfTextAtSize(header.location_text, locConfig.font_size || 14);
      page.drawText(header.location_text, {
        x: (width * locConfig.position.x) / 100 - textWidth / 2,
        y: height - (height * locConfig.position.y) / 100,
        size: locConfig.font_size || 14,
        font: helveticaFont,
        color: hexToRgb(locConfig.color || '#000000')
      });
    }

    // Title
    if (config.title_text) {
      const titleSize = config.title_font_size || 56;
      const titleWidth = helveticaBoldFont.widthOfTextAtSize(config.title_text, titleSize);
      page.drawText(config.title_text, {
        x: (width * config.title_position.x) / 100 - titleWidth / 2,
        y: height - (height * (config.title_position.y - 4)) / 100,
        size: titleSize,
        font: helveticaBoldFont,
        color: hexToRgb(config.title_color || '#000000')
      });
    }

    // Title Subtitle
    if (config.title_subtitle) {
      const subtitleSize = (config.title_font_size || 56) * 0.4;
      const subtitleWidth = helveticaFont.widthOfTextAtSize(config.title_subtitle, subtitleSize);
      page.drawText(config.title_subtitle, {
        x: (width * config.title_position.x) / 100 - subtitleWidth / 2,
        y: height - (height * (config.title_position.y + 2)) / 100,
        size: subtitleSize,
        font: helveticaFont,
        color: hexToRgb(config.title_color || '#000000')
      });
    }

    // "is given to" Text
    if (isGivenTo.text) {
      const textSize = isGivenTo.font_size || 16;
      const textWidth = helveticaFont.widthOfTextAtSize(isGivenTo.text, textSize);
      page.drawText(isGivenTo.text, {
        x: (width * isGivenTo.position.x) / 100 - textWidth / 2,
        y: height - (height * isGivenTo.position.y) / 100,
        size: textSize,
        font: helveticaFont,
        color: hexToRgb(isGivenTo.color || '#000000')
      });
    }

    // Participant Name
    const nameSize = nameConfig.font_size || 48;
    const nameWidth = helveticaBoldFont.widthOfTextAtSize(participantName, nameSize);
    page.drawText(participantName, {
      x: (width * nameConfig.position.x) / 100 - nameWidth / 2,
      y: height - (height * nameConfig.position.y) / 100,
      size: nameSize,
      font: helveticaBoldFont,
      color: hexToRgb(nameConfig.color || '#000000')
    });

    // Line Separator after name
    page.drawLine({
      start: { x: width * 0.2, y: height - (height * (nameConfig.position.y + 3)) / 100 },
      end: { x: width * 0.8, y: height - (height * (nameConfig.position.y + 3)) / 100 },
      thickness: 2,
      color: rgb(0, 0, 0)
    });

    // Participation Text
    if (participation.text_template) {
      const participationText = participation.text_template
        .replace('{EVENT_NAME}', event.title)
        .replace('{EVENT_DATE}', formatDate(event.start_date))
        .replace('{VENUE}', event.venue || '[Venue]');
      
      const textSize = participation.font_size || 18;
      const textWidth = helveticaFont.widthOfTextAtSize(participationText, textSize);
      page.drawText(participationText, {
        x: (width * participation.position.x) / 100 - textWidth / 2,
        y: height - (height * participation.position.y) / 100,
        size: textSize,
        font: helveticaFont,
        color: hexToRgb(participation.color || '#000000')
      });
    }

    // Signature Blocks
    const signatures = config.signature_blocks || [];
    for (const signature of signatures) {
      const sigX = (width * (signature.position_config?.x || 50)) / 100;
      const sigY = height - (height * (signature.position_config?.y || 92)) / 100;

      // Name
      if (signature.name) {
        const nameSize = signature.name_font_size || 14;
        const nameWidth = helveticaBoldFont.widthOfTextAtSize(signature.name, nameSize);
        page.drawText(signature.name, {
          x: sigX - nameWidth / 2,
          y: sigY,
          size: nameSize,
          font: helveticaBoldFont,
          color: hexToRgb(signature.name_color || '#000000')
        });
      }

      // Position
      if (signature.position) {
        const posSize = signature.position_font_size || 12;
        const posWidth = helveticaFont.widthOfTextAtSize(signature.position, posSize);
        page.drawText(signature.position, {
          x: sigX - posWidth / 2,
          y: sigY - 20,
          size: posSize,
          font: helveticaFont,
          color: hexToRgb(signature.position_color || '#000000')
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  };

  const generatePNG = async () => {
    if (!config || !event) return null;

    // Ensure fonts are loaded before creating canvas
    await document.fonts.ready;
    
    const canvas = document.createElement('canvas');
    const width = config.width || 2000;
    const height = config.height || 1200;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = config.background_color || '#ffffff';
    ctx.fillRect(0, 0, width, height);

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

    // PSU Logo
    if (config.logo_config?.psu_logo_url) {
      const logoSize = config.logo_config.psu_logo_size || { width: 120, height: 120 };
      const logoPos = config.logo_config.psu_logo_position || { x: 15, y: 10 };
      await drawImage(
        config.logo_config.psu_logo_url,
        (width * logoPos.x) / 100,
        (height * logoPos.y) / 100,
        logoSize.width,
        logoSize.height
      );
    }

    // Sponsor Logos
    if (config.logo_config?.sponsor_logos) {
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
      ctx.font = `${repConfig.font_weight || 'normal'} ${repConfig.font_size || 14}px ${repConfig.font_family || 'Libre Baskerville, serif'}`;
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
      ctx.font = `${uniConfig.font_weight || 'bold'} ${uniConfig.font_size || 20}px ${uniConfig.font_family || 'Libre Baskerville, serif'}`;
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
      ctx.font = `${locConfig.font_weight || 'normal'} ${locConfig.font_size || 14}px ${locConfig.font_family || 'Libre Baskerville, serif'}`;
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
    // Ensure MonteCarlo font is loaded before rendering
    const fontFamily = nameConfig.font_family || 'MonteCarlo, cursive';
    
    // Wait for all fonts to be ready before rendering
    await document.fonts.ready;
    
    // Set font and render
    ctx.font = `${nameConfig.font_weight || 'bold'} ${nameConfig.font_size || 48}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(
      participantName,
      (width * nameConfig.position.x) / 100,
      (height * nameConfig.position.y) / 100
    );

    // Line Separator after name
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.2, (height * (nameConfig.position.y + 3)) / 100);
    ctx.lineTo(width * 0.8, (height * (nameConfig.position.y + 3)) / 100);
    ctx.stroke();

    // Participation Text
    if (participation.text_template) {
      const participationText = participation.text_template
        .replace('{EVENT_NAME}', event.title)
        .replace('{EVENT_DATE}', formatDate(event.start_date))
        .replace('{VENUE}', event.venue || '[Venue]');
      
      ctx.fillStyle = participation.color || '#000000';
      ctx.font = `${participation.font_weight || 'normal'} ${participation.font_size || 18}px ${participation.font_family || 'Libre Baskerville, serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Handle multi-line text
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

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleGenerate = async () => {
    if (!eventId || !user?.id || !config || !event) return;

    setGenerating(true);
    setError(null);

    try {
      // Generate certificate number
      const certificateNumber = CertificateService.generateCertificateNumber(eventId, user.id);
      
      // Generate PDF
      const pdfBytes = await generatePDF();
      if (!pdfBytes) {
        throw new Error('Failed to generate PDF');
      }

      // Generate PNG
      const pngBlob = await generatePNG();
      if (!pngBlob) {
        throw new Error('Failed to generate PNG');
      }

      // Upload files
      const pdfFileName = `${certificateNumber}.pdf`;
      const pngFileName = `${certificateNumber}.png`;

      const [pdfResult, pngResult] = await Promise.all([
        CertificateService.uploadCertificateFile(pdfBytes, pdfFileName, 'pdf', eventId, user.id),
        CertificateService.uploadCertificateFile(pngBlob, pngFileName, 'png', eventId, user.id)
      ]);

      if (pdfResult.error) {
        throw new Error(`PDF upload failed: ${pdfResult.error}`);
      }
      if (pngResult.error) {
        throw new Error(`PNG upload failed: ${pngResult.error}`);
      }

      // Save to database
      const saveResult = await CertificateService.saveCertificate({
        event_id: eventId,
        user_id: user.id,
        certificate_number: certificateNumber,
        participant_name: getUserName(),
        event_title: event.title,
        completion_date: event.start_date || new Date().toISOString().split('T')[0],
        certificate_pdf_url: pdfResult.url,
        certificate_png_url: pngResult.url
      });

      if (saveResult.error) {
        throw new Error(`Failed to save certificate: ${saveResult.error}`);
      }

      setCertificate(saveResult.certificate);
      loadPreview(saveResult.certificate);
    } catch (err) {
      setError(err.message || 'Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (format) => {
    if (!certificate) return;

    const url = format === 'pdf' 
      ? certificate.certificate_pdf_url 
      : certificate.certificate_png_url;

    if (!url) {
      setError(`${format.toUpperCase()} certificate not available`);
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `certificate-${certificate.certificate_number}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(`Failed to download certificate: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md mx-4">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-slate-600">Loading certificate data...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Certificate</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {certificate ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">Certificate already generated!</p>
                <p className="text-green-600 text-sm mt-1">You can download it anytime below.</p>
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

              {/* Download Buttons */}
              <div className="flex gap-4 justify-center">
                {certificate.certificate_pdf_url && (
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Download PDF
                  </button>
                )}
                {certificate.certificate_png_url && (
                  <button
                    onClick={() => handleDownload('png')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Download PNG
                  </button>
                )}
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
                  className={`px-8 py-4 rounded-lg font-semibold text-white transition-colors ${
                    generating
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {generating ? 'Generating Certificate...' : 'Generate Certificate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;


/**
 * Shared Certificate Generation Utilities
 * Used by both CertificateGenerator component and CertificateJobProcessor
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export interface CertificateData {
  participantName: string;
  eventTitle: string;
  completionDate: string;
  venue?: string;
}

/**
 * Helper function to format date
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Helper to convert hex to RGB
 */
function hexToRgb(hex: string) {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Generate PDF certificate with full config support
 */
export async function generatePDFCertificate(
  config: any,
  certificateNumber: string,
  data: CertificateData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([config.width || 2000, config.height || 1200]);
  const { width, height } = page.getSize();

  // Helper function to load and embed image
  const embedImage = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const imageBytes = await response.arrayBuffer();
      try {
        return await pdfDoc.embedPng(imageBytes);
      } catch {
        return await pdfDoc.embedJpg(imageBytes);
      }
    } catch (error) {
      console.warn('Error embedding image:', url, error);
      return null;
    }
  };

  // Background - use image only
  if (config.background_image_url) {
    const bgImage = await embedImage(config.background_image_url);
    if (bgImage) {
      page.drawImage(bgImage, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
    } else {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: height,
        color: rgb(1, 1, 1) // White
      });
    }
  } else {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: rgb(1, 1, 1) // White
    });
  }

  // Border
  if (config.border_width && config.border_width > 0) {
    const borderColor = config.border_color || '#1e40af';
    page.drawRectangle({
      x: config.border_width / 2,
      y: config.border_width / 2,
      width: width - config.border_width,
      height: height - config.border_width,
      borderColor: hexToRgb(borderColor),
      borderWidth: config.border_width
    });
  }

  // Embed standard fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
  
  // Helper function to map font family to PDF standard font
  const getPDFFont = (fontFamily: string, isBold: boolean = false): any => {
    if (!fontFamily) return isBold ? helveticaBoldFont : helveticaFont;
    
    const fontLower = fontFamily.toLowerCase();
    
    // Map serif fonts to TimesRoman
    if (fontLower.includes('times') || fontLower.includes('serif') || 
        fontLower.includes('garamond') || fontLower.includes('baskerville') ||
        fontLower.includes('georgia') || fontLower.includes('playfair') ||
        fontLower.includes('lora') || fontLower.includes('merriweather') ||
        fontLower.includes('crimson') || fontLower.includes('eb garamond')) {
      return isBold ? timesRomanBoldFont : timesRomanFont;
    }
    
    // Map monospace fonts to Courier
    if (fontLower.includes('courier') || fontLower.includes('mono') || 
        fontLower.includes('consolas') || fontLower.includes('menlo')) {
      return isBold ? courierBoldFont : courierFont;
    }
    
    // Default to Helvetica for sans-serif and other fonts
    return isBold ? helveticaBoldFont : helveticaFont;
  };
  
  // Load custom font for participant name if configured (only if it's MonteCarlo or a custom font)
  let customNameFont = null;
  const nameConfigForFont = config.name_config || {};
  const nameFontFamily = nameConfigForFont.font_family || 'MonteCarlo, cursive';
  
  // Only try to load custom font if it's specifically MonteCarlo
  if (nameFontFamily.includes('MonteCarlo')) {
    try {
      const fontUrls = [
        '/fonts/MonteCarlo-Regular.ttf',
        'https://fonts.gstatic.com/s/montecarlo/v1/MonteCarlo-Regular.ttf',
        'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/montecarlo/MonteCarlo-Regular.ttf',
        'https://raw.githubusercontent.com/google/fonts/main/ofl/montecarlo/MonteCarlo-Regular.ttf'
      ];
      
      let fontBytes = null;
      for (const fontUrl of fontUrls) {
        try {
          const fontResponse = await fetch(fontUrl, {
            mode: 'cors',
            cache: 'default'
          });
          if (fontResponse.ok) {
            fontBytes = await fontResponse.arrayBuffer();
            console.log('Successfully loaded custom name font from:', fontUrl);
            break;
          }
        } catch (e) {
          console.warn('Failed to load font from', fontUrl, e);
          continue;
        }
      }
      
      if (fontBytes) {
        try {
          customNameFont = await pdfDoc.embedFont(fontBytes);
          console.log('Custom name font embedded successfully');
        } catch (error) {
          console.warn('Error embedding custom font (fontkit not available), using mapped font:', error);
          customNameFont = null;
        }
      }
    } catch (error) {
      console.warn('Error loading custom name font, using mapped font:', error);
    }
  }

  const header = config.header_config || {};
  const participation = config.participation_text_config || {};
  const isGivenTo = config.is_given_to_config || {};
  const nameConfig = config.name_config || {};

  // Logos
  if (config.logo_config?.logos && config.logo_config.logos.length > 0) {
    for (const logo of config.logo_config.logos) {
      const logoSize = logo.size || { width: 120, height: 120 };
      const logoPos = logo.position || { x: 15, y: 10 };
      const logoImage = await embedImage(logo.url);
      if (logoImage) {
        page.drawImage(logoImage, {
          x: (width * logoPos.x) / 100,
          y: height - (height * logoPos.y) / 100 - logoSize.height,
          width: logoSize.width,
          height: logoSize.height,
        });
      }
    }
  }

  // Sponsor Logos
  if (config.logo_config?.sponsor_logos && config.logo_config.sponsor_logos.length > 0) {
    const sponsorSize = config.logo_config.sponsor_logo_size || { width: 80, height: 80 };
    const sponsorPos = config.logo_config.sponsor_logo_position || { x: 90, y: 5 };
    const spacing = config.logo_config.sponsor_logo_spacing || 10;
    for (let i = 0; i < config.logo_config.sponsor_logos.length; i++) {
      const sponsorImage = await embedImage(config.logo_config.sponsor_logos[i]);
      if (sponsorImage) {
        page.drawImage(sponsorImage, {
          x: (width * sponsorPos.x) / 100,
          y: height - (height * sponsorPos.y) / 100 - sponsorSize.height - (i * (sponsorSize.height + spacing)),
          width: sponsorSize.width,
          height: sponsorSize.height,
        });
      }
    }
  }

  // Header - Republic
  if (header.republic_text && header.republic_config) {
    const repConfig = header.republic_config;
    const font = getPDFFont(repConfig.font_family, repConfig.font_weight === 'bold');
    const textWidth = font.widthOfTextAtSize(header.republic_text, repConfig.font_size || 20);
    page.drawText(header.republic_text, {
      x: (width * repConfig.position.x) / 100 - textWidth / 2,
      y: height - (height * repConfig.position.y) / 100,
      size: repConfig.font_size || 20,
      font: font,
      color: hexToRgb(repConfig.color || '#000000')
    });
  }

  // Header - University
  if (header.university_text && header.university_config) {
    const uniConfig = header.university_config;
    const font = getPDFFont(uniConfig.font_family, uniConfig.font_weight === 'bold');
    const textWidth = font.widthOfTextAtSize(header.university_text, uniConfig.font_size || 28);
    page.drawText(header.university_text, {
      x: (width * uniConfig.position.x) / 100 - textWidth / 2,
      y: height - (height * uniConfig.position.y) / 100,
      size: uniConfig.font_size || 28,
      font: font,
      color: hexToRgb(uniConfig.color || '#000000')
    });
  }

  // Header - Location
  if (header.location_text && header.location_config) {
    const locConfig = header.location_config;
    const font = getPDFFont(locConfig.font_family, locConfig.font_weight === 'bold');
    const textWidth = font.widthOfTextAtSize(header.location_text, locConfig.font_size || 20);
    page.drawText(header.location_text, {
      x: (width * locConfig.position.x) / 100 - textWidth / 2,
      y: height - (height * locConfig.position.y) / 100,
      size: locConfig.font_size || 20,
      font: font,
      color: hexToRgb(locConfig.color || '#000000')
    });
  }

  // Title
  if (config.title_text) {
    const titleSize = config.title_font_size || 56;
    const titleFont = getPDFFont(config.title_font_family, true);
    const titleWidth = titleFont.widthOfTextAtSize(config.title_text, titleSize);
    page.drawText(config.title_text, {
      x: (width * config.title_position.x) / 100 - titleWidth / 2,
      y: height - (height * (config.title_position.y - 4)) / 100,
      size: titleSize,
      font: titleFont,
      color: hexToRgb(config.title_color || '#000000')
    });
  }

  // Title Subtitle
  if (config.title_subtitle) {
    const subtitleSize = (config.title_font_size || 56) * 0.4;
    const subtitleFont = getPDFFont(config.title_font_family, false);
    const subtitleWidth = subtitleFont.widthOfTextAtSize(config.title_subtitle, subtitleSize);
    page.drawText(config.title_subtitle, {
      x: (width * config.title_position.x) / 100 - subtitleWidth / 2,
      y: height - (height * (config.title_position.y + 2)) / 100,
      size: subtitleSize,
      font: subtitleFont,
      color: hexToRgb(config.title_color || '#000000')
    });
  }

  // "is given to" Text
  if (isGivenTo.text) {
    const textSize = isGivenTo.font_size || 16;
    const font = getPDFFont(isGivenTo.font_family, isGivenTo.font_weight === 'bold');
    const textWidth = font.widthOfTextAtSize(isGivenTo.text, textSize);
    page.drawText(isGivenTo.text, {
      x: (width * isGivenTo.position.x) / 100 - textWidth / 2,
      y: height - (height * isGivenTo.position.y) / 100,
      size: textSize,
      font: font,
      color: hexToRgb(isGivenTo.color || '#000000')
    });
  }

  // Participant Name - Use configured font
  const nameSize = nameConfig.font_size || 48;
  const nameFont = customNameFont || getPDFFont(nameFontFamily, nameConfig.font_weight === 'bold');
  const nameWidth = nameFont.widthOfTextAtSize(data.participantName, nameSize);
  page.drawText(data.participantName, {
    x: (width * nameConfig.position.x) / 100 - nameWidth / 2,
    y: height - (height * nameConfig.position.y) / 100,
    size: nameSize,
    font: nameFont,
    color: hexToRgb(nameConfig.color || '#000000')
  });

  // Line Separator after name
  page.drawLine({
    start: { x: width * 0.2, y: height - (height * (nameConfig.position.y + 3)) / 100 },
    end: { x: width * 0.8, y: height - (height * (nameConfig.position.y + 3)) / 100 },
    thickness: 2,
    color: rgb(0, 0, 0)
  });

  // Participation Text - Handle multi-line
  if (participation.text_template) {
    const participationText = participation.text_template
      .replace('{EVENT_NAME}', data.eventTitle)
      .replace('{EVENT_DATE}', formatDate(data.completionDate))
      .replace('{VENUE}', data.venue || '[Venue]');
    
    const textSize = participation.font_size || 18;
    const lineHeight = textSize * (participation.line_height || 1.5);
    const lines = participationText.split('\n');
    const startY = height - (height * participation.position.y) / 100 + ((lines.length - 1) * lineHeight) / 2;
    
    const participationFont = getPDFFont(participation.font_family, participation.font_weight === 'bold');
    lines.forEach((line, index) => {
      const textWidth = participationFont.widthOfTextAtSize(line, textSize);
      page.drawText(line, {
        x: (width * participation.position.x) / 100 - textWidth / 2,
        y: startY - (index * lineHeight),
        size: textSize,
        font: participationFont,
        color: hexToRgb(participation.color || '#000000')
      });
    });
  }

  // Signature Blocks
  const signatures = config.signature_blocks || [];
  for (const signature of signatures) {
    const sigX = (width * (signature.position_config?.x || 50)) / 100;
    const sigY = height - (height * (signature.position_config?.y || 92)) / 100;

    // Signature Image
    if (signature.signature_image_url) {
      const imgWidth = signature.signature_image_width || 300;
      const imgHeight = signature.signature_image_height || 100;
      const sigImage = await embedImage(signature.signature_image_url);
      if (sigImage) {
        page.drawImage(sigImage, {
          x: sigX - imgWidth / 2,
          y: sigY - imgHeight - 20,
          width: imgWidth,
          height: imgHeight,
        });
      }
    }

    // Name
    if (signature.name) {
      const nameSize = signature.name_font_size || 14;
      const sigNameFont = getPDFFont(signature.font_family, true);
      const nameWidth = sigNameFont.widthOfTextAtSize(signature.name, nameSize);
      page.drawText(signature.name, {
        x: sigX - nameWidth / 2,
        y: sigY,
        size: nameSize,
        font: sigNameFont,
        color: hexToRgb(signature.name_color || '#000000')
      });
    }

    // Position
    if (signature.position) {
      const posSize = signature.position_font_size || 12;
      const sigPosFont = getPDFFont(signature.font_family, false);
      const posWidth = sigPosFont.widthOfTextAtSize(signature.position, posSize);
      page.drawText(signature.position, {
        x: sigX - posWidth / 2,
        y: sigY - 20,
        size: posSize,
        font: sigPosFont,
        color: hexToRgb(signature.position_color || '#000000')
      });
    }
  }

  // Certificate ID and QR Code
  if (config.cert_id_prefix && certificateNumber) {
    const certIdSize = config.cert_id_font_size || 14;
    const certIdText = certificateNumber;
    // Use global font for certificate ID (from header config as fallback)
    const certIdFontFamily = config.header_config?.republic_config?.font_family || 'Libre Baskerville, serif';
    const certIdFont = getPDFFont(certIdFontFamily, false);
    const certIdWidth = certIdFont.widthOfTextAtSize(certIdText, certIdSize);
    const certIdX = (width * (config.cert_id_position?.x || 50)) / 100;
    const certIdY = height - (height * (config.cert_id_position?.y || 95)) / 100;
    
    // Draw QR Code beside cert ID if enabled
    if (config.qr_code_enabled !== false) {
      try {
        const qrSize = config.qr_code_size || 60;
        const qrGap = 15;
        const certIdRightEdge = certIdX + certIdWidth / 2;
        const qrX = certIdRightEdge + qrGap;
        const qrY = certIdY - qrSize / 2;
        const certIdYCentered = qrY + qrSize / 2;
        
        // Draw Certificate ID
        page.drawText(certIdText, {
          x: certIdX - certIdWidth / 2,
          y: certIdYCentered,
          size: certIdSize,
          font: certIdFont,
          color: hexToRgb(config.cert_id_color || '#000000')
        });
        
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : (process.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || 'https://hekjabrlgdpbffzidshz.supabase.co');
        const verificationUrl = `${baseUrl}/verify-certificate/${encodeURIComponent(certificateNumber)}`;
        
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        
        const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
        const qrImage = await pdfDoc.embedPng(qrImageBytes);
        
        page.drawImage(qrImage, {
          x: qrX,
          y: qrY,
          width: qrSize,
          height: qrSize
        });
      } catch (qrError) {
        console.warn('Failed to generate QR code for PDF:', qrError);
        // Fallback: just draw cert ID
        page.drawText(certIdText, {
          x: certIdX - certIdWidth / 2,
          y: certIdY,
          size: certIdSize,
          font: certIdFont,
          color: hexToRgb(config.cert_id_color || '#000000')
        });
      }
    } else {
      // No QR code, draw cert ID at original position
      page.drawText(certIdText, {
        x: certIdX - certIdWidth / 2,
        y: certIdY,
        size: certIdSize,
        font: certIdFont,
        color: hexToRgb(config.cert_id_color || '#000000')
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Generate PNG certificate with full config support
 */
export async function generatePNGCertificate(
  config: any,
  certificateNumber: string,
  data: CertificateData
): Promise<Blob> {
  // Check if we're in a browser environment
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('PNG generation requires browser environment (document/window not available)');
  }

  // Ensure fonts are loaded before creating canvas
  await document.fonts.ready;
  
  const canvas = document.createElement('canvas');
  const width = config.width || 2000;
  const height = config.height || 1200;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  // Helper function to load and draw image
  const drawImage = async (url: string, x: number, y: number, imgWidth: number, imgHeight: number) => {
    return new Promise<void>((resolve) => {
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    await drawImage(config.background_image_url, 0, 0, width, height);
  } else {
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
    ctx.font = `bold ${config.title_font_size || 56}px ${config.title_font_family || 'Libre Baskerville, serif'}`;
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
    ctx.font = `normal ${(config.title_font_size || 56) * 0.4}px ${config.title_font_family || 'Libre Baskerville, serif'}`;
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
  const nameFontFamily = nameConfig.font_family || 'MonteCarlo, cursive';
  
  // Load custom font for participant name if it's a web font (not system font)
  // Only try to load if it's a specific web font like MonteCarlo
  if (nameFontFamily.includes('MonteCarlo')) {
    try {
      const fontUrls = [
        '/fonts/MonteCarlo-Regular.ttf',
        'https://fonts.gstatic.com/s/montecarlo/v1/MonteCarlo-Regular.ttf',
        'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/montecarlo/MonteCarlo-Regular.ttf',
        'https://raw.githubusercontent.com/google/fonts/main/ofl/montecarlo/MonteCarlo-Regular.ttf'
      ];
      
      let fontLoaded = false;
      for (const fontUrl of fontUrls) {
        try {
          const fontFace = new FontFace('MonteCarlo', `url(${fontUrl})`);
          await fontFace.load();
          document.fonts.add(fontFace);
          fontLoaded = true;
          console.log('MonteCarlo font loaded for canvas from:', fontUrl);
          break;
        } catch (e) {
          console.warn('Failed to load MonteCarlo font from', fontUrl, e);
          continue;
        }
      }
      
      if (!fontLoaded) {
        console.warn('Could not load MonteCarlo font from any source, using fallback');
      }
    } catch (e) {
      console.warn('Error loading MonteCarlo font for canvas:', e);
    }
  }
  
  // Wait for all fonts to be ready before rendering
  await document.fonts.ready;
  
  // Set font and render
  ctx.font = `${nameConfig.font_weight || 'bold'} ${nameConfig.font_size || 48}px ${nameFontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText(
    data.participantName,
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

  // Participation Text - Handle multi-line
  if (participation.text_template) {
    const participationText = participation.text_template
      .replace('{EVENT_NAME}', data.eventTitle)
      .replace('{EVENT_DATE}', formatDate(data.completionDate))
      .replace('{VENUE}', data.venue || '[Venue]');
    
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
        const qrGap = 15;
        ctx.save();
        ctx.font = `${certIdSize}px Arial, sans-serif`;
        const certIdTextWidth = ctx.measureText(certificateNumber).width;
        ctx.restore();
        const qrX = certIdX + certIdTextWidth / 2 + qrGap;
        const qrY = certIdY - qrSize / 2;
        const certIdYCentered = qrY + qrSize / 2;
        
        // Draw Certificate ID
        ctx.fillStyle = config.cert_id_color || '#000000';
        ctx.font = `${certIdSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(certificateNumber, certIdX, certIdYCentered);
        
        const baseUrl = window.location.origin;
        const verificationUrl = `${baseUrl}/verify-certificate/${encodeURIComponent(certificateNumber)}`;
        
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        
        const qrImage = new Image();
        await new Promise<void>((resolve, reject) => {
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
        // Fallback: just draw cert ID
        ctx.fillStyle = config.cert_id_color || '#000000';
        ctx.font = `${certIdSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(certificateNumber, certIdX, certIdY);
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

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png', 1.0);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('PNG generation timeout'));
    }, 10000);
  });
}


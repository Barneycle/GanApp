/**
 * Shared Certificate Generation Utilities
 * Used by both CertificateGenerator component and CertificateJobProcessor
 */

import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';

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
 * Extract font family name from CSS font string
 * Example: "Libre Baskerville, serif" -> "Libre Baskerville"
 */
function extractFontFamily(fontString: string): string {
  if (!fontString) return 'Arial';
  // Remove quotes and get the first font name before comma
  return fontString.split(',')[0].replace(/['"]/g, '').trim();
}

/**
 * Load a Google Font for canvas use
 */
async function loadGoogleFontForCanvas(fontFamily: string, fontWeight: string = '400'): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) {
    return false;
  }

  // Check if font is already loaded
  const fontFamilyClean = extractFontFamily(fontFamily);

  // Skip system fonts (don't need loading)
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia',
    'Verdana', 'Tahoma', 'Trebuchet MS', 'Garamond', 'Palatino',
    'Book Antiqua', 'Baskerville', 'Bodoni', 'Caslon', 'Century Schoolbook',
    'Didot', 'Hoefler Text', 'Monaco', 'Consolas', 'Menlo', 'Lucida Grande',
    'Century Gothic', 'Futura', 'Gill Sans', 'Impact', 'Copperplate'];

  if (systemFonts.includes(fontFamilyClean)) {
    return true; // System fonts don't need loading
  }

  // Check if already loaded
  try {
    // Test if font is available by checking font status
    const testFont = new FontFace(fontFamilyClean, 'normal');
    const loadedFonts = Array.from(document.fonts);
    if (loadedFonts.some(f => f.family === fontFamilyClean)) {
      return true;
    }
  } catch (e) {
    // Font not loaded, continue to load it
  }

  // Load from Google Fonts
  try {
    // Create Google Fonts URL
    const fontNameEncoded = fontFamilyClean.replace(/\s+/g, '+');
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontNameEncoded}:wght@${fontWeight}&display=swap`;

    // Fetch font CSS
    const response = await fetch(fontUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch Google Font CSS for ${fontFamilyClean}`);
      return false;
    }

    const cssText = await response.text();

    // Extract font file URL from CSS
    const urlMatch = cssText.match(/url\(([^)]+\.woff2?)\)/);
    if (!urlMatch) {
      console.warn(`Could not find font file URL for ${fontFamilyClean}`);
      return false;
    }

    const fontFileUrl = urlMatch[1].replace(/['"]/g, '');

    // Load font using FontFace API
    const fontFace = new FontFace(fontFamilyClean, `url(${fontFileUrl})`, {
      weight: fontWeight,
      style: 'normal'
    });

    await fontFace.load();
    document.fonts.add(fontFace);

    console.log(`Successfully loaded font: ${fontFamilyClean}`);
    return true;
  } catch (error) {
    console.warn(`Failed to load font ${fontFamilyClean}:`, error);
    return false;
  }
}

/**
 * Load all fonts used in certificate config for canvas rendering
 */
async function loadCertificateFonts(config: any): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) {
    return;
  }

  const fontsToLoad = new Set<string>();
  const fontWeights = new Map<string, string>();

  // Collect all font families used in the certificate
  if (config.title_font_family) {
    fontsToLoad.add(config.title_font_family);
    fontWeights.set(config.title_font_family, '700'); // Bold for title
  }

  if (config.title_subtitle_config?.font_family) {
    fontsToLoad.add(config.title_subtitle_config.font_family);
    fontWeights.set(config.title_subtitle_config.font_family, config.title_subtitle_config.font_weight || '400');
  }

  if (config.header_config?.republic_config?.font_family) {
    fontsToLoad.add(config.header_config.republic_config.font_family);
    fontWeights.set(config.header_config.republic_config.font_family, config.header_config.republic_config.font_weight || '400');
  }

  if (config.header_config?.university_config?.font_family) {
    fontsToLoad.add(config.header_config.university_config.font_family);
    fontWeights.set(config.header_config.university_config.font_family, config.header_config.university_config.font_weight || '700');
  }

  if (config.header_config?.location_config?.font_family) {
    fontsToLoad.add(config.header_config.location_config.font_family);
    fontWeights.set(config.header_config.location_config.font_family, config.header_config.location_config.font_weight || '400');
  }

  if (config.name_config?.font_family) {
    fontsToLoad.add(config.name_config.font_family);
    fontWeights.set(config.name_config.font_family, config.name_config.font_weight || '400');
  }

  if (config.event_title_config?.font_family) {
    fontsToLoad.add(config.event_title_config.font_family);
    fontWeights.set(config.event_title_config.font_family, config.event_title_config.font_weight || '400');
  }

  if (config.date_config?.font_family) {
    fontsToLoad.add(config.date_config.font_family);
    fontWeights.set(config.date_config.font_family, config.date_config.font_weight || '400');
  }

  if (config.participation_text_config?.font_family) {
    fontsToLoad.add(config.participation_text_config.font_family);
    fontWeights.set(config.participation_text_config.font_family, config.participation_text_config.font_weight || '400');
  }

  if (config.is_given_to_config?.font_family) {
    fontsToLoad.add(config.is_given_to_config.font_family);
    fontWeights.set(config.is_given_to_config.font_family, config.is_given_to_config.font_weight || '400');
  }

  if (config.signature_blocks) {
    config.signature_blocks.forEach((sig: any) => {
      if (sig.font_family) {
        fontsToLoad.add(sig.font_family);
        fontWeights.set(sig.font_family, sig.font_weight || '400');
      }
    });
  }

  // Special handling for MonteCarlo
  if (fontsToLoad.has('MonteCarlo, cursive') || Array.from(fontsToLoad).some(f => f.includes('MonteCarlo'))) {
    const monteCarloUrls = [
      '/fonts/MonteCarlo-Regular.ttf',
      'https://fonts.gstatic.com/s/montecarlo/v1/MonteCarlo-Regular.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/montecarlo/MonteCarlo-Regular.ttf'
    ];

    let loaded = false;
    for (const url of monteCarloUrls) {
      try {
        const fontFace = new FontFace('MonteCarlo', `url(${url})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        loaded = true;
        break;
      } catch (e) {
        continue;
      }
    }
    fontsToLoad.delete('MonteCarlo, cursive');
  }

  // Load all other fonts
  const loadPromises = Array.from(fontsToLoad).map(async (fontFamily) => {
    const weight = fontWeights.get(fontFamily) || '400';
    await loadGoogleFontForCanvas(fontFamily, weight);
  });

  await Promise.all(loadPromises);

  // Wait for all fonts to be ready
  await document.fonts.ready;
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

  // Load all fonts used in the certificate config first
  await loadCertificateFonts(config);

  // Ensure fonts are loaded before creating canvas
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  // Original certificate dimensions
  const width = config.width || 2500;  // Original certificate width
  const height = config.height || 1768; // Original certificate height
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
    ctx.strokeRect(config.border_width / 2, config.border_width / 2, width - config.border_width, height - config.border_width);
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
    const subtitleConfig = config.title_subtitle_config || {};
    ctx.fillStyle = subtitleConfig.color || config.title_color || '#000000';
    const subtitleFontSize = subtitleConfig.font_size || (config.title_font_size || 56) * 0.4;
    const subtitleFontFamily = subtitleConfig.font_family || config.title_font_family || 'Libre Baskerville, serif';
    const subtitleFontWeight = subtitleConfig.font_weight || 'normal';
    ctx.font = `${subtitleFontWeight} ${subtitleFontSize}px ${subtitleFontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subtitleX = subtitleConfig.position?.x ?? config.title_position.x;
    const subtitleY = subtitleConfig.position?.y ?? (config.title_position.y + 2);
    ctx.fillText(
      config.title_subtitle,
      (width * subtitleX) / 100,
      (height * subtitleY) / 100
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

  // Fonts are already loaded by loadCertificateFonts() above

  // Set font and render
  ctx.font = `${nameConfig.font_weight || 'bold'} ${nameConfig.font_size || 48}px ${nameFontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const nameX = (width * nameConfig.position.x) / 100;
  const nameY = (height * nameConfig.position.y) / 100;

  ctx.fillText(
    data.participantName,
    nameX,
    nameY
  );

  // Draw underline for the name with spacing
  const textMetrics = ctx.measureText(data.participantName);
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
      .replace('{EVENT_NAME}', data.eventTitle)
      .replace('{EVENT_DATE}', formatDate(data.completionDate))
      .replace('{VENUE}', data.venue && data.venue.trim() ? data.venue : '[Venue]');

    ctx.fillStyle = participation.color || '#000000';
    ctx.font = `${participation.font_weight || 'normal'} ${participation.font_size || 18}px ${participation.font_family || 'Libre Baskerville, serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = participationText.split('\n');
    const lineHeight = (participation.font_size || 18) * (participation.line_height || 1.5);
    const startY = (height * participation.position.y) / 100 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line: string, index: number) => {
      ctx.fillText(
        line,
        (width * participation.position.x) / 100,
        startY + (index * lineHeight)
      );
    });
  }

  // Signature Blocks - Match PDF/HTML spacing (signature touching name)
  const signatures = config.signature_blocks || [];
  for (const signature of signatures) {
    const sigX = (width * (signature.position_config?.x || 50)) / 100;
    const sigY = (height * (signature.position_config?.y || 92)) / 100;

    // Signature Image (top) - Move closer to name (matching PDF)
    // PDF/HTML: image bottom is very close to name center (about 2px gap)
    // So image top is: sigY - imgHeight - 2
    if (signature.signature_image_url) {
      const imgWidth = signature.signature_image_width || 300;
      const imgHeight = signature.signature_image_height || 100;
      // Image bottom should be very close to name center (2px gap for better visual)
      // So image top = sigY - imgHeight - 2
      await drawImage(
        signature.signature_image_url,
        sigX - imgWidth / 2,
        sigY - imgHeight - 2,
        imgWidth,
        imgHeight
      );
    }

    // Name (middle) - at sigY position (center)
    if (signature.name) {
      ctx.fillStyle = signature.name_color || '#000000';
      ctx.font = `bold ${signature.name_font_size || 14}px ${signature.font_family || 'Libre Baskerville, serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(signature.name, sigX, sigY);
    }

    // Position (bottom) - 20px below name center (matching PDF)
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

/**
 * Convert PNG certificate to PDF with lossless quality
 * 
 * This function performs a truly lossless conversion:
 * - PNG image data is embedded directly into the PDF without recompression
 * - pdf-lib's embedPng() preserves the original PNG stream byte-for-byte
 * - No quality loss, no compression artifacts, pixel-perfect preservation
 * - Maintains 1:1 pixel-to-point ratio at 72 DPI for exact resolution matching
 * 
 * @param pngBlob - The PNG image blob to convert
 * @param width - Expected width in pixels (used as fallback if image can't be loaded)
 * @param height - Expected height in pixels (used as fallback if image can't be loaded)
 * @returns PDF bytes as Uint8Array with lossless embedded PNG
 */
export async function convertPNGToPDF(
  pngBlob: Blob,
  width: number = 2500,  // Original certificate width
  height: number = 1768  // Original certificate height
): Promise<Uint8Array> {
  // Get actual image dimensions from the PNG blob for precise sizing
  let actualWidth = width;
  let actualHeight = height;

  // Load the image to get its actual pixel dimensions
  // This ensures the PDF page size matches the image exactly
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    try {
      const imageUrl = URL.createObjectURL(pngBlob);
      const img = new Image();

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(imageUrl);
          resolve(); // Fallback to provided dimensions on timeout
        }, 5000); // 5 second timeout

        img.onload = () => {
          clearTimeout(timeout);
          actualWidth = img.naturalWidth || img.width;
          actualHeight = img.naturalHeight || img.height;
          URL.revokeObjectURL(imageUrl);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(imageUrl);
          // Fallback to provided dimensions if image load fails
          resolve();
        };
        img.src = imageUrl;
      });
    } catch (error) {
      console.warn('Could not load image to get dimensions, using provided dimensions:', error);
    }
  }

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // PDF uses points (1/72 inch) as units
  // For high quality, we maintain 1:1 pixel-to-point ratio at 72 DPI
  // This means 1 pixel = 1 point, preserving full resolution
  const pdfWidth = actualWidth;
  const pdfHeight = actualHeight;

  // Add a page with the exact dimensions of the PNG (in points)
  const page = pdfDoc.addPage([pdfWidth, pdfHeight]);

  // Convert PNG blob to array buffer
  const pngBytes = await pngBlob.arrayBuffer();

  // Embed the PNG image into the PDF - LOSSLESS CONVERSION
  // pdf-lib's embedPng() embeds the PNG stream directly without any recompression
  // The original PNG data is preserved byte-for-byte, ensuring 100% lossless quality
  // No JPEG compression, no quality degradation, no artifacts
  const pngImage = await pdfDoc.embedPng(pngBytes);

  // Get the actual dimensions of the embedded image
  const imageDims = pngImage.size();

  // Draw the image on the page at full resolution
  // Using the actual embedded image dimensions ensures perfect 1:1 mapping
  // No scaling or interpolation - maximum quality preservation
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: imageDims.width,
    height: imageDims.height,
  });

  // Save the PDF with lossless preservation
  // pdf-lib does NOT recompress embedded PNG images - they remain lossless
  // Disable object streams to ensure maximum compatibility and guarantee all PNG data is included
  // The resulting PDF contains the original PNG data unchanged, making this a true lossless conversion
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: false, // Ensures all data is included, better compatibility
  });

  return pdfBytes;
}


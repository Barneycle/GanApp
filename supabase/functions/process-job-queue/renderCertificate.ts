/**
 * Server-side certificate PNG/PDF renderer for the Edge Function worker.
 * Uses SVG + resvg-wasm (no DOM, no native canvas / FFI).
 */

import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

export interface CertificateData {
  participantName: string;
  eventTitle: string;
  completionDate: string;
  venue?: string;
}

const RESVG_WASM_URL = "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

const FONT_URLS: Array<{ family: string; url: string }> = [
  {
    family: "Libre Baskerville",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/libre-baskerville@5.2.5/latin-400-normal.ttf",
  },
  {
    family: "Libre Baskerville",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/libre-baskerville@5.2.5/latin-700-normal.ttf",
  },
  {
    family: "MonteCarlo",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/montecarlo@5.2.5/latin-400-normal.ttf",
  },
  {
    family: "Liberation Sans",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/liberation-sans@5.2.5/latin-400-normal.ttf",
  },
];

let wasmReady: Promise<void> | null = null;
let fontBuffers: Uint8Array[] | null = null;

function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = (async () => {
      const response = await fetch(RESVG_WASM_URL);
      if (!response.ok) {
        throw new Error(`Failed to download resvg wasm (${response.status})`);
      }
      await initWasm(new Uint8Array(await response.arrayBuffer()));
    })().catch((err) => {
      wasmReady = null;
      throw err;
    });
  }
  return wasmReady;
}

async function loadFontBuffers(): Promise<Uint8Array[]> {
  if (fontBuffers) return fontBuffers;
  const loaded = await Promise.all(
    FONT_URLS.map(async (font) => {
      try {
        const response = await fetch(font.url);
        if (!response.ok) return null;
        return new Uint8Array(await response.arrayBuffer());
      } catch {
        return null;
      }
    }),
  );
  fontBuffers = loaded.filter((bytes): bytes is Uint8Array => bytes != null);
  if (fontBuffers.length === 0) {
    throw new Error("Could not load any certificate fonts");
  }
  return fontBuffers;
}

function extractFontFamily(fontString: string | undefined): string {
  if (!fontString) return "Libre Baskerville";
  const name = fontString.split(",")[0].replace(/['"]/g, "").trim();
  if (name.toLowerCase().includes("montecarlo")) return "MonteCarlo";
  if (["Arial", "Helvetica", "sans-serif"].includes(name)) return "Liberation Sans";
  return name || "Libre Baskerville";
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const imageUriCache = new Map<string, Promise<string | null>>();

async function toDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mime = response.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${bytesToBase64(bytes)}`;
  } catch {
    return null;
  }
}

function toDataUriCached(url: string): Promise<string | null> {
  const existing = imageUriCache.get(url);
  if (existing) return existing;
  const pending = toDataUri(url);
  imageUriCache.set(url, pending);
  return pending;
}

function svgImage(href: string, x: number, y: number, w: number, h: number): string {
  return `<image href="${escapeXml(href)}" xlink:href="${escapeXml(href)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" />`;
}

function svgText(opts: {
  text: string;
  x: number;
  y: number;
  size: number;
  family: string;
  color: string;
  weight?: string;
  underline?: boolean;
  anchor?: "start" | "middle" | "end";
}): string {
  const weight = opts.weight === "bold" || opts.weight === "700" ? "700" : (opts.weight || "400");
  const decoration = opts.underline ? ' text-decoration="underline"' : "";
  return `<text x="${opts.x}" y="${opts.y}" font-size="${opts.size}" font-family="${escapeXml(opts.family)}" font-weight="${weight}" fill="${escapeXml(opts.color)}" text-anchor="${opts.anchor || "middle"}" dominant-baseline="middle"${decoration}>${escapeXml(opts.text)}</text>`;
}

export async function generateCertificatePngPdf(
  config: Record<string, any>,
  certificateNumber: string,
  data: CertificateData,
  siteUrl: string,
): Promise<{ pngBytes: Uint8Array; pdfBytes: Uint8Array; width: number; height: number }> {
  const [fonts] = await Promise.all([loadFontBuffers(), ensureWasm()]);

  const width = config.width || 2500;
  const height = config.height || 1768;
  const parts: string[] = [];

  const imageUrls: string[] = [];
  if (config.background_image_url) imageUrls.push(config.background_image_url);
  for (const logo of config.logo_config?.logos || []) {
    if (logo?.url) imageUrls.push(logo.url);
  }
  for (const url of config.logo_config?.sponsor_logos || []) {
    if (url) imageUrls.push(url);
  }
  for (const signature of config.signature_blocks || []) {
    if (signature?.signature_image_url) imageUrls.push(signature.signature_image_url);
  }
  await Promise.all(imageUrls.map((url) => toDataUriCached(url)));

  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff" />`);

  if (config.background_image_url) {
    const bg = await toDataUriCached(config.background_image_url);
    if (bg) parts.push(svgImage(bg, 0, 0, width, height));
  }

  if (config.border_width && config.border_width > 0) {
    const bw = config.border_width;
    parts.push(
      `<rect x="${bw / 2}" y="${bw / 2}" width="${width - bw}" height="${height - bw}" fill="none" stroke="${escapeXml(config.border_color || "#1e40af")}" stroke-width="${bw}" />`,
    );
  }

  const header = config.header_config || {};
  const participation = config.participation_text_config || {};
  const isGivenTo = config.is_given_to_config || {};
  const nameConfig = config.name_config || {};

  if (config.logo_config?.logos?.length) {
    for (const logo of config.logo_config.logos) {
      if (!logo?.url) continue;
      const href = await toDataUriCached(logo.url);
      if (!href) continue;
      const logoSize = logo.size || { width: 120, height: 120 };
      const logoPos = logo.position || { x: 15, y: 10 };
      parts.push(svgImage(
        href,
        (width * logoPos.x) / 100,
        (height * logoPos.y) / 100,
        logoSize.width,
        logoSize.height,
      ));
    }
  }

  if (config.logo_config?.sponsor_logos?.length) {
    const sponsorSize = config.logo_config.sponsor_logo_size || { width: 80, height: 80 };
    const sponsorPos = config.logo_config.sponsor_logo_position || { x: 90, y: 5 };
    const spacing = config.logo_config.sponsor_logo_spacing || 10;
    for (let i = 0; i < config.logo_config.sponsor_logos.length; i++) {
      const href = await toDataUriCached(config.logo_config.sponsor_logos[i]);
      if (!href) continue;
      parts.push(svgImage(
        href,
        (width * sponsorPos.x) / 100,
        (height * sponsorPos.y) / 100 + i * (sponsorSize.height + spacing),
        sponsorSize.width,
        sponsorSize.height,
      ));
    }
  }

  if (header.republic_text && header.republic_config) {
    const c = header.republic_config;
    const pos = c.position || { x: 50, y: 10 };
    parts.push(svgText({
      text: header.republic_text,
      x: (width * pos.x) / 100,
      y: (height * pos.y) / 100,
      size: c.font_size || 24,
      family: extractFontFamily(c.font_family),
      color: c.color || "#000000",
      weight: c.font_weight,
    }));
  }

  if (header.university_text && header.university_config) {
    const c = header.university_config;
    const pos = c.position || { x: 50, y: 14 };
    parts.push(svgText({
      text: header.university_text,
      x: (width * pos.x) / 100,
      y: (height * pos.y) / 100,
      size: c.font_size || 34,
      family: extractFontFamily(c.font_family),
      color: c.color || "#000000",
      weight: c.font_weight || "bold",
    }));
  }

  if (header.location_text && header.location_config) {
    const c = header.location_config;
    const pos = c.position || { x: 50, y: 18 };
    parts.push(svgText({
      text: header.location_text,
      x: (width * pos.x) / 100,
      y: (height * pos.y) / 100,
      size: c.font_size || 24,
      family: extractFontFamily(c.font_family),
      color: c.color || "#000000",
      weight: c.font_weight,
    }));
  }

  const titlePos = config.title_position || { x: 50, y: 28 };
  if (config.title_text) {
    parts.push(svgText({
      text: config.title_text,
      x: (width * titlePos.x) / 100,
      y: (height * (titlePos.y - 4)) / 100,
      size: config.title_font_size || 56,
      family: extractFontFamily(config.title_font_family),
      color: config.title_color || "#000000",
      weight: "bold",
    }));
  }

  if (config.title_subtitle) {
    const subtitleConfig = config.title_subtitle_config || {};
    const subtitleX = subtitleConfig.position?.x ?? titlePos.x;
    const subtitleY = subtitleConfig.position?.y ?? (titlePos.y + 2);
    parts.push(svgText({
      text: config.title_subtitle,
      x: (width * subtitleX) / 100,
      y: (height * subtitleY) / 100,
      size: subtitleConfig.font_size || (config.title_font_size || 56) * 0.4,
      family: extractFontFamily(subtitleConfig.font_family || config.title_font_family),
      color: subtitleConfig.color || config.title_color || "#000000",
      weight: subtitleConfig.font_weight,
    }));
  }

  if (isGivenTo.text) {
    const pos = isGivenTo.position || { x: 50, y: 40 };
    parts.push(svgText({
      text: isGivenTo.text,
      x: (width * pos.x) / 100,
      y: (height * pos.y) / 100,
      size: isGivenTo.font_size || 20,
      family: extractFontFamily(isGivenTo.font_family),
      color: isGivenTo.color || "#000000",
      weight: isGivenTo.font_weight,
    }));
  }

  const namePos = nameConfig.position || { x: 50, y: 48 };
  parts.push(svgText({
    text: data.participantName,
    x: (width * namePos.x) / 100,
    y: (height * namePos.y) / 100,
    size: nameConfig.font_size || 48,
    family: extractFontFamily(nameConfig.font_family || "MonteCarlo, cursive"),
    color: nameConfig.color || "#000000",
    weight: nameConfig.font_weight || "bold",
    underline: true,
  }));

  if (participation.text_template) {
    const participationText = participation.text_template
      .replace("{EVENT_NAME}", data.eventTitle)
      .replace("{EVENT_DATE}", formatDate(data.completionDate))
      .replace("{VENUE}", data.venue && data.venue.trim() ? data.venue : "[Venue]");
    const pos = participation.position || { x: 50, y: 62 };
    const lines = participationText.split("\n");
    const lineHeight = (participation.font_size || 22) * (participation.line_height || 1.5);
    const startY = (height * pos.y) / 100 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line: string, index: number) => {
      parts.push(svgText({
        text: line,
        x: (width * pos.x) / 100,
        y: startY + index * lineHeight,
        size: participation.font_size || 22,
        family: extractFontFamily(participation.font_family),
        color: participation.color || "#000000",
        weight: participation.font_weight,
      }));
    });
  }

  const signatures = config.signature_blocks || [];
  for (const signature of signatures) {
    const sigX = (width * (signature.position_config?.x || 50)) / 100;
    const sigY = (height * (signature.position_config?.y || 92)) / 100;
    if (signature.signature_image_url) {
      const href = await toDataUriCached(signature.signature_image_url);
      if (href) {
        const imgWidth = signature.signature_image_width || 300;
        const imgHeight = signature.signature_image_height || 100;
        parts.push(svgImage(href, sigX - imgWidth / 2, sigY - imgHeight - 2, imgWidth, imgHeight));
      }
    }
    if (signature.name) {
      parts.push(svgText({
        text: signature.name,
        x: sigX,
        y: sigY,
        size: signature.name_font_size || 14,
        family: extractFontFamily(signature.font_family),
        color: signature.name_color || "#000000",
        weight: "bold",
      }));
    }
    if (signature.position) {
      parts.push(svgText({
        text: signature.position,
        x: sigX,
        y: sigY + 20,
        size: signature.position_font_size || 12,
        family: extractFontFamily(signature.font_family),
        color: signature.position_color || "#000000",
      }));
    }
  }

  if (config.cert_id_prefix && certificateNumber) {
    const certIdSize = config.cert_id_font_size || 14;
    const certIdPos = config.cert_id_position || { x: 50, y: 95 };
    const certIdX = (width * certIdPos.x) / 100;
    const certIdY = (height * certIdPos.y) / 100;

    if (config.qr_code_enabled !== false) {
      try {
        const qrSize = config.qr_code_size || 60;
        const qrGap = 15;
        const approxTextWidth = certificateNumber.length * certIdSize * 0.55;
        const qrX = certIdX + approxTextWidth / 2 + qrGap;
        const qrY = certIdY - qrSize / 2;
        const certIdYCentered = qrY + qrSize / 2;
        parts.push(svgText({
          text: certificateNumber,
          x: certIdX,
          y: certIdYCentered,
          size: certIdSize,
          family: "Liberation Sans",
          color: config.cert_id_color || "#000000",
        }));
        const origin = siteUrl.replace(/\/$/, "") || "https://localhost";
        const verificationUrl = `${origin}/verify-certificate/${encodeURIComponent(certificateNumber)}`;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        parts.push(svgImage(qrDataUrl, qrX, qrY, qrSize, qrSize));
      } catch {
        parts.push(svgText({
          text: certificateNumber,
          x: certIdX,
          y: certIdY,
          size: certIdSize,
          family: "Liberation Sans",
          color: config.cert_id_color || "#000000",
        }));
      }
    } else {
      parts.push(svgText({
        text: certificateNumber,
        x: certIdX,
        y: certIdY,
        size: certIdSize,
        family: "Liberation Sans",
        color: config.cert_id_color || "#000000",
      }));
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${parts.join("\n")}
</svg>`;

  // CustomFontsOptions: fontBuffers must be Uint8Array[] and must NOT be mixed
  // with loadSystemFonts (that is a different options variant and panics in wasm).
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    background: "#ffffff",
    font: {
      fontBuffers: fonts.map((bytes) => new Uint8Array(bytes)),
      defaultFontFamily: "Liberation Sans",
      sansSerifFamily: "Liberation Sans",
      serifFamily: "Libre Baskerville",
      cursiveFamily: "MonteCarlo",
    },
  });
  const pngBytes = resvg.render().asPng();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);
  const pngImage = await pdfDoc.embedPng(pngBytes);
  const dims = pngImage.size();
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: dims.width,
    height: dims.height,
  });
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

  return { pngBytes, pdfBytes, width, height };
}

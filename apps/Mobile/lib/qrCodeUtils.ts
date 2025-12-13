/**
 * Generate an 8-character alphanumeric QR code ID
 * Uses uppercase letters and numbers, excluding confusing characters (0, O, I, 1)
 */
export const generateQRCodeID = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0, O, I, 1
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format QR code ID for display (adds spacing for readability)
 * Expects an 8-character ID and formats as XXXX-XXXX
 */
export const formatQRCodeID = (id: string | null): string => {
  if (!id) return '';
  
  // If it's exactly 8 characters, format as XXXX-XXXX
  if (id.length === 8) {
    return `${id.substring(0, 4)}-${id.substring(4, 8)}`;
  }
  
  // If longer, take first 8 alphanumeric characters
  const alphanumeric = id.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const shortId = alphanumeric.substring(0, 8);
  
  if (shortId.length === 8) {
    return `${shortId.substring(0, 4)}-${shortId.substring(4, 8)}`;
  }
  
  // Fallback: return as is (shouldn't happen if IDs are properly generated)
  return id.substring(0, 8);
};


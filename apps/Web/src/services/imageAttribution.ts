import { supabase } from '../lib/supabaseClient';

/**
 * Gets user's full name by user ID using RPC function
 */
async function getUserNameById(userId: string): Promise<string> {
  try {
    // Try to get user profile from RPC function
    const { data: userProfile, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: userId });
    
    if (!rpcError && userProfile) {
      const profile = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      } else if (firstName) {
        return firstName;
      } else if (lastName) {
        return lastName;
      } else if (profile.email) {
        return profile.email.split('@')[0];
      }
    }
    
    // Fallback
    return 'User';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'User';
  }
}

/**
 * Loads an image from a URL and returns an HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Adds Reddit-style attribution watermark to an image using HTML Canvas
 * @param imageUrl - URL of the image to add attribution to
 * @param userName - Full name of the user who posted the photo
 * @returns Blob URL of the image with attribution overlay
 */
export async function addAttributionToImage(
  imageUrl: string,
  userName: string
): Promise<string> {
  try {
    // Load the original image
    const image = await loadImage(imageUrl);
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Set canvas size to match image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Draw the original image
    ctx.drawImage(image, 0, 0);
    
    // Attribution text
    const attributionText = `Posted in GanApp by ${userName}`;
    
    // Text styling - keep original smaller size
    const fontSize = Math.max(24, Math.floor(image.width / 40)); // Responsive font size
    const paddingX = Math.max(20, Math.floor(image.width / 50));
    const paddingY = Math.max(15, Math.floor(image.height / 80));
    
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    
    // Measure text
    const textMetrics = ctx.measureText(attributionText);
    const textHeight = fontSize;
    
    // Reddit-style: Full-width bar at the very bottom
    // Background spans entire width of image
    const bgX = 0;
    const bgY = canvas.height - (textHeight + paddingY * 2);
    const bgWidth = canvas.width;
    const bgHeight = textHeight + paddingY * 2;
    
    // Draw full-width background bar (black, no transparency for Reddit style)
    ctx.fillStyle = '#000000';
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    
    // Draw text (white) on the left side
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(attributionText, paddingX, bgY + textHeight + paddingY);
    
    // Try to load and draw logo (if available) on the right side
    // Logo is optional - if it fails to load, we continue without it
    try {
      // Logo is in public folder, accessible via root path
      const logoPath = '/ganapp_attri.png';
      const logo = await loadImage(logoPath);
      
      // Scale logo to be much bigger than font
      const logoSize = fontSize * 6.0;
      // Preserve aspect ratio
      const logoAspectRatio = logo.width / logo.height;
      const logoWidth = logoSize;
      const logoHeight = logoSize / logoAspectRatio;
      
      const logoX = canvas.width - paddingX - logoWidth;
      // Center logo vertically in the attribution bar, slightly higher for better visual alignment
      const logoY = bgY + (bgHeight - logoHeight) / 2 - (paddingY * 0.3);
      
      // Draw logo (no background needed since it's in the black bar)
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    } catch (logoError) {
      // Logo is optional, continue without it
      console.log('Logo not available, continuing without logo');
    }
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          resolve(blobUrl);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.95);
    });
  } catch (error) {
    console.error('Error adding attribution:', error);
    // Return original image URL if attribution fails
    return imageUrl;
  }
}

/**
 * Downloads an image with attribution watermark
 * @param photoUrl - URL of the photo to download
 * @param photoId - ID of the photo
 * @param fileName - Original filename
 * @param uploadedBy - User ID of the uploader
 * @returns Promise that resolves when download is complete
 */
export async function downloadImageWithAttribution(
  photoUrl: string,
  photoId: string,
  fileName: string,
  uploadedBy?: string
): Promise<void> {
  try {
    // Get uploader's user ID
    let uploaderUserId = uploadedBy;
    if (!uploaderUserId && fileName) {
      // Extract userId from filename: userId_timestamp.jpg
      const fileNameParts = fileName.split('_');
      if (fileNameParts.length >= 2) {
        uploaderUserId = fileNameParts[0];
      }
    }
    
    // Get uploader's full name for attribution
    let userName = 'User';
    if (uploaderUserId) {
      userName = await getUserNameById(uploaderUserId);
    }
    
    // Add attribution overlay to the image
    const attributedImageUrl = await addAttributionToImage(photoUrl, userName);
    
    // Download the attributed image
    const response = await fetch(attributedImageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `ganapp_photo_${photoId}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    // Clean up attributed image blob URL if it's different from original
    if (attributedImageUrl !== photoUrl && attributedImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(attributedImageUrl);
    }
  } catch (error) {
    console.error('Error downloading image with attribution:', error);
    // Fallback: download original image without attribution
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `ganapp_photo_${photoId}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}


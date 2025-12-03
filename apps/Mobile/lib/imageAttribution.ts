import Marker, { Position, ImageFormat, TextBackgroundType } from 'react-native-image-marker';
import { supabase } from './supabase';

/**
 * Checks if the image marker library is available
 */
function isImageMarkerAvailable(): boolean {
  try {
    return Marker && typeof Marker.markText === 'function';
  } catch (error) {
    return false;
  }
}

/**
 * Gets user's full name by user ID
 */
async function getUserNameById(userId: string): Promise<string> {
  try {
    // Try to get user profile from RPC function if available
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
      }
    }
    
    // Fallback: try to get from auth admin API (if available)
    // Note: This requires admin privileges, so it might not work
    // For now, extract from filename pattern if possible
    return 'User';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'User';
  }
}

/**
 * Adds Reddit-style attribution watermark to an image
 * @param imageUri - URI of the image to add attribution to
 * @param userName - Full name of the user who posted the photo
 * @returns URI of the image with attribution overlay
 */
export async function addAttributionToImage(
  imageUri: string,
  userName: string
): Promise<string> {
  // Check if library is available
  if (!isImageMarkerAvailable()) {
    console.warn('react-native-image-marker is not available. Attribution will not be added.');
    console.warn('Note: This library requires a native build. Please rebuild your app after installing.');
    return imageUri;
  }

  try {
    // Ensure imageUri is a proper file path (remove file:// prefix if needed for the library)
    let processedUri = imageUri;
    if (imageUri.startsWith('file://')) {
      processedUri = imageUri;
    } else if (!imageUri.startsWith('http') && !imageUri.startsWith('/')) {
      processedUri = `file://${imageUri}`;
    }
    
    // Create attribution text (Reddit-style: "Posted in GanApp by [Full Name]")
    const attributionText = `Posted in GanApp by ${userName}`;
    
    // Generate a unique filename for the attributed image
    const timestamp = Date.now();
    const filename = `attributed_${timestamp}`;
    
    console.log('Adding attribution to image:', {
      originalUri: imageUri,
      processedUri,
      userName,
      attributionText,
    });
    
    // Add text attribution watermark
    const markedImageUri = await Marker.markText({
      backgroundImage: {
        src: processedUri,
        scale: 1,
        rotate: 0,
        alpha: 1,
      },
      watermarkTexts: [
        {
          text: attributionText,
          positionOptions: {
            position: Position.bottomLeft,
            X: 0, // Start from left edge  
            Y: 0, // At the very bottom (0 means bottom edge)
          },
          style: {
            color: '#FFFFFF', // White text like Reddit
            fontName: 'Roboto',
            fontSize: 90, // Very large font size to fill the bar and be highly visible
            textAlign: 'left',
            textBackgroundStyle: {
              paddingX: 40, // More horizontal padding for a wider bar
              paddingY: 50, // Increased vertical padding to match larger font size and fill the bar
              type: TextBackgroundType.stretchX, // Stretch horizontally to create full-width bar
              color: '#000000', // Solid black background - Reddit style (fully opaque black)
            },
            shadowStyle: {
              dx: 0,
              dy: 0,
              radius: 0,
              color: 'transparent',
            },
          },
        },
      ],
      quality: 100,
      filename: filename,
      saveFormat: ImageFormat.jpg,
    });
    
    console.log('Attribution added successfully:', markedImageUri);
    
    // Normalize the URI - ensure it has file:// prefix if it's a local file path
    let normalizedUri = markedImageUri;
    if (markedImageUri && !markedImageUri.startsWith('file://') && !markedImageUri.startsWith('http')) {
      normalizedUri = `file://${markedImageUri}`;
    }
    
    console.log('Normalized attribution URI:', normalizedUri);
    return normalizedUri;
  } catch (error) {
    console.error('Error adding attribution:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    // Return original image if attribution fails
    return imageUri;
  }
}



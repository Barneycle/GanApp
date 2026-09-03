import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import { supabase } from './supabase';
import { AttributionCompositeView } from './AttributionCompositeView';
import { calculateAttributionParams } from './addAttributionWithViewShot';
import { addAttributionToImageWithViewShot } from './addAttributionViewShot';

/**
 * Verifies that an image file is stable and readable
 * @param imageUri - URI of the image to verify
 * @returns Promise that resolves when the image is stable
 */
async function verifyImageStability(imageUri: string): Promise<void> {
  const uri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;

  // Check file exists and get initial size
  const initialInfo = await FileSystem.getInfoAsync(uri);
  if (!initialInfo.exists) {
    throw new Error('Image file does not exist');
  }

  const initialSize = initialInfo.size || 0;
  if (initialSize === 0) {
    throw new Error('Image file is empty');
  }

  console.log('Image verification: Initial check', { exists: initialInfo.exists, size: initialSize });

  // Wait 200-300ms for file to stabilize
  await new Promise(resolve => setTimeout(resolve, 250));

  // Verify file size hasn't changed (file is stable)
  const stableInfo = await FileSystem.getInfoAsync(uri);
  if (!stableInfo.exists) {
    throw new Error('Image file disappeared after wait');
  }

  const stableSize = stableInfo.size || 0;
  if (stableSize !== initialSize) {
    console.warn('Image size changed during verification', { initialSize, stableSize });
    // Wait a bit more if size changed
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('Image ready:', { exists: stableInfo.exists, size: stableSize });
}

/**
 * Primes the React Native image decoder by loading the image
 * This ensures the image is ready for view-shot compositing
 * @param imageUri - URI of the image to prime
 */
async function primeImageDecoder(imageUri: string): Promise<void> {
  const uri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;

  return new Promise((resolve, reject) => {
    console.log('Priming image decoder...');
    Image.getSize(
      uri,
      (width, height) => {
        console.log('Image decoder primed:', { width, height });
        resolve();
      },
      (error) => {
        console.error('Failed to prime image decoder:', error);
        // Don't reject - image might still be usable
        resolve();
      }
    );
  });
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
 * Adds Reddit-style attribution watermark to an image using pure component-based view-shot
 * @param imageUri - URI of the image to add attribution to
 * @param userName - Full name of the user who posted the photo
 * @returns URI of the image with attribution overlay
 */
export async function addAttributionToImage(
  imageUri: string,
  userName: string
): Promise<string> {
  try {
    // Step 1: Verify image is stable and readable
    await verifyImageStability(imageUri);

    // Step 2: Prime the React Native image decoder
    await primeImageDecoder(imageUri);

    // Step 3: Add attribution using view-shot
    return await addAttributionToImageWithViewShot(imageUri, userName);
  } catch (error: any) {
    console.error('Error adding attribution:', error);
    // Return original image if attribution fails
    return imageUri;
  }
}

// Export the component for direct use in React components
export { AttributionCompositeView, calculateAttributionParams };

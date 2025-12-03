import * as MediaLibrary from 'expo-media-library';

/**
 * Request media permissions once on app start
 * This ensures downloads work without prompting every time
 * Requests write permissions (not read-only) to avoid "modify photos" prompts
 */
export async function prepareMediaAccess() {
  try {
    const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
    
    if (status !== 'granted' && canAskAgain) {
      // Request write permissions (false = write access, not read-only)
      // This prevents "modify photos" prompts later
      await MediaLibrary.requestPermissionsAsync(false);
    }
  } catch (error) {
    console.error('Error preparing media access:', error);
  }
}


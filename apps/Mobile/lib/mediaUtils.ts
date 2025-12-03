import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

/**
 * Save an image to Pictures/GanApp/ folder
 * @param localUri - Local file URI of the image to save
 * @returns The URI of the saved asset
 */
export async function saveToGanAppPictures(localUri: string): Promise<string> {
  // Check permissions first - if not granted, throw error (should have been requested on app start)
  const { status } = await MediaLibrary.getPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('Media library permissions not granted. Please grant permissions in app settings.');
  }
  
  // 1) Create an asset (temporary media file)
  // This should not prompt since permissions are already granted
  const asset = await MediaLibrary.createAssetAsync(localUri);
  
  // 2) Put it inside Pictures/GanApp
  const album = await MediaLibrary.getAlbumAsync('GanApp');
  
  if (album) {
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
  } else {
    await MediaLibrary.createAlbumAsync('GanApp', asset, false);
  }
  
  return asset.uri;
}


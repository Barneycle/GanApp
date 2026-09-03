import { NativeModules, Platform } from 'react-native';

// Debug: Log all available native modules (only if module not found)
if (__DEV__) {
  const moduleNames = Object.keys(NativeModules);
  if (!moduleNames.includes('MediaStoreSaver')) {
    console.log('Available native modules:', moduleNames);
  }
}

const { MediaStoreSaver } = NativeModules;

interface MediaStoreSaverInterface {
  saveFile(
    localUri: string,
    fileName: string,
    fileType: string
  ): Promise<string>;
}

const MediaStoreSaverNative = MediaStoreSaver as MediaStoreSaverInterface | undefined;

/**
 * Save a file to Pictures/GanApp/ using MediaStore API (no permissions needed on Android 10+)
 * @param localUri - Local file URI of the image to save
 * @param fileName - Name for the saved file
 * @param fileType - File type (jpg, png, etc.)
 * @returns The URI of the saved file
 */
export async function saveFileToGanApp(
  localUri: string,
  fileName: string,
  fileType: string = 'jpg'
): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('MediaStoreSaver is only available on Android');
  }

  if (!MediaStoreSaverNative) {
    console.error('MediaStoreSaver module not found. Available modules:', Object.keys(NativeModules));
    throw new Error('MediaStoreSaver is not available. Please rebuild the app with: npx expo run:android');
  }

  try {
    const uri = await MediaStoreSaverNative.saveFile(localUri, fileName, fileType);
    return uri;
  } catch (e: any) {
    console.error('Failed to save file:', e);
    throw e;
  }
}


import { NativeModules } from 'react-native';

const { DownloadsModule } = NativeModules;

interface DownloadsModuleInterface {
  saveFileToDownloads(
    sourceUri: string,
    fileName: string
  ): Promise<string>;
}

export const DownloadsModuleNative = DownloadsModule as DownloadsModuleInterface | undefined;

export const saveFileToDownloads = async (
  sourceUri: string,
  fileName: string
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  if (!DownloadsModuleNative) {
    return {
      success: false,
      error: 'DownloadsModule is not available. Please rebuild the app.',
    };
  }

  try {
    const uri = await DownloadsModuleNative.saveFileToDownloads(sourceUri, fileName);
    return {
      success: true,
      uri,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to save file to Downloads',
    };
  }
};


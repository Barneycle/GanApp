import { Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import React from 'react';
import { View } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Composites a logo onto an image using react-native-view-shot
 * This requires a component ref, so it's designed to be used with LogoCompositeView
 * 
 * @param viewRef - React ref to a ViewShot component containing LogoCompositeView
 * @param outputPath - Path where the composite image should be saved
 * @returns Promise<string> - URI of the composite image
 */
export async function compositeLogoWithViewShot(
  viewRef: React.RefObject<View>,
  outputPath: string
): Promise<string> {
  if (!viewRef.current) {
    throw new Error('View ref is not available');
  }

  try {
    const uri = await captureRef(viewRef.current, {
      format: 'jpg',
      quality: 1.0,
      result: 'tmpfile',
    });

    // Copy to output path if different
    if (uri !== outputPath) {
      await FileSystem.copyAsync({
        from: uri,
        to: outputPath,
      });
      return outputPath.startsWith('file://') ? outputPath : `file://${outputPath}`;
    }

    return uri.startsWith('file://') ? uri : `file://${uri}`;
  } catch (error) {
    throw new Error(`Failed to capture composite image: ${error}`);
  }
}


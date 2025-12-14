import { Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import React from 'react';
import { View, Text } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';

/**
 * Creates a ViewShot component tree for attribution compositing
 * This is used internally to composite images with attribution using view-shot
 */
export function createAttributionViewShot(
  backgroundImageUri: string,
  attributionText: string,
  logoUri: string | null,
  fontSize: number,
  paddingX: number,
  paddingY: number,
  barHeight: number,
  logoSize: number,
  logoAspectRatio: number,
  width: number,
  height: number,
  onReady: (captureFn: () => Promise<string>) => void
): React.ReactElement {
  const viewRef = React.useRef<ViewShot>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (isReady && viewRef.current) {
      const capture = async (): Promise<string> => {
        if (!viewRef.current) {
          throw new Error('ViewShot ref not available');
        }
        const uri = await captureRef(viewRef.current, {
          format: 'png',
          quality: 1.0,
          result: 'tmpfile',
        });
        return uri;
      };
      onReady(capture);
    }
  }, [isReady, onReady]);

  const barY = height - barHeight;
  const logoWidth = logoSize;
  const logoHeight = logoSize / logoAspectRatio;
  const logoX = width - paddingX - logoWidth;
  const logoY = barY + (barHeight - logoHeight) / 2 - (paddingY * 0.3);

  return React.createElement(
    ViewShot,
    {
      ref: viewRef,
      style: { width, height },
      options: {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      },
      onLayout: () => {
        // Small delay to ensure rendering is complete
        setTimeout(() => setIsReady(true), 100);
      },
    },
    React.createElement(
      View,
      { style: { width, height, position: 'relative' } },
      // Background Image
      React.createElement(Image, {
        source: { uri: backgroundImageUri },
        style: { width, height },
        resizeMode: 'cover',
      }),
      // Black Bar Background
      React.createElement(View, {
        style: {
          position: 'absolute',
          left: 0,
          top: barY,
          width: width,
          height: barHeight,
          backgroundColor: '#000000',
        },
      }),
      // Attribution Text
      React.createElement(Text, {
        style: {
          position: 'absolute',
          left: paddingX,
          bottom: paddingY,
          color: '#FFFFFF',
          fontSize: fontSize,
          fontFamily: 'Roboto',
          fontWeight: 'bold',
          includeFontPadding: false,
          textAlignVertical: 'bottom',
        },
      }, attributionText),
      // Logo
      logoUri && React.createElement(Image, {
        source: { uri: logoUri },
        style: {
          position: 'absolute',
          left: logoX,
          top: logoY,
          width: logoWidth,
          height: logoHeight,
          resizeMode: 'contain',
        },
      })
    )
  );
}

/**
 * Composites attribution using view-shot programmatically
 * This function creates a temporary component and captures it
 */
export async function compositeAttributionWithViewShot(
  backgroundImageUri: string,
  attributionText: string,
  logoUri: string | null,
  fontSize: number,
  paddingX: number,
  paddingY: number,
  barHeight: number,
  logoSize: number,
  logoAspectRatio: number,
  width: number,
  height: number
): Promise<string> {
  // This approach requires React rendering which is complex in a pure function
  // We'll use a different approach: create a hidden component and render it
  // For now, this is a placeholder - the actual implementation will be in the refactored function
  throw new Error('This function requires React component rendering. Use AttributionCompositeView component instead.');
}


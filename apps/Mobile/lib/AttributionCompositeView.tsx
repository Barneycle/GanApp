import React, { useRef, useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

interface AttributionCompositeViewProps {
  backgroundImageUri: string;
  attributionText: string;
  logoUri: string | null;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  barHeight: number;
  logoSize: number;
  logoAspectRatio: number;
  onCaptureReady?: (captureFn: () => Promise<string>) => void;
}

/**
 * Component that composites an image with attribution text and logo using view-shot
 * This gives us full control over positioning without fighting the image-marker library
 */
export const AttributionCompositeView: React.FC<AttributionCompositeViewProps> = ({
  backgroundImageUri,
  attributionText,
  logoUri,
  fontSize,
  paddingX,
  paddingY,
  barHeight,
  logoSize,
  logoAspectRatio,
  onCaptureReady,
}) => {
  const viewRef = useRef<ViewShot>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    Image.getSize(
      backgroundImageUri,
      (width, height) => {
        setImageDimensions({ width, height });
      },
      (error) => {
        console.error('Error getting image size:', error);
      }
    );
  }, [backgroundImageUri]);

  useEffect(() => {
    if (imageDimensions.width > 0 && imageDimensions.height > 0 && onCaptureReady) {
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
      onCaptureReady(capture);
    }
  }, [imageDimensions, onCaptureReady]);

  if (imageDimensions.width === 0 || imageDimensions.height === 0) {
    return null;
  }

  const { width, height } = imageDimensions;
  const logoWidth = logoSize;
  const logoHeight = logoSize / logoAspectRatio;
  
  // Calculate positions matching web implementation
  const barY = height - barHeight;
  const logoX = width - paddingX - logoWidth;
  const logoY = barY + (barHeight - logoHeight) / 2 - (paddingY * 0.3);

  return (
    <ViewShot
      ref={viewRef}
      style={{ width, height }}
      options={{
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      }}
    >
      <View style={{ width, height, position: 'relative' }}>
        {/* Background Image */}
        <Image
          source={{ uri: backgroundImageUri }}
          style={{ width, height }}
          resizeMode="cover"
        />
        
        {/* Black Bar Background */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: barY,
            width: width,
            height: barHeight,
            backgroundColor: '#000000',
          }}
        />
        
        {/* Attribution Text */}
        <Text
          style={{
            position: 'absolute',
            left: paddingX,
            bottom: paddingY,
            color: '#FFFFFF',
            fontSize: fontSize,
            fontFamily: 'Roboto',
            fontWeight: 'bold',
            includeFontPadding: false,
            textAlignVertical: 'bottom',
          }}
        >
          {attributionText}
        </Text>
        
        {/* Logo */}
        {logoUri && (
          <Image
            source={{ uri: logoUri }}
            style={{
              position: 'absolute',
              left: logoX,
              top: logoY,
              width: logoWidth,
              height: logoHeight,
              resizeMode: 'contain',
            }}
          />
        )}
      </View>
    </ViewShot>
  );
};


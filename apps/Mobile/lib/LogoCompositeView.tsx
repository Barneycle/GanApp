import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface LogoCompositeViewProps {
  backgroundImageUri: string;
  logoUri: string;
  logoSize?: number;
  logoMargin?: number;
  logoPosition?: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
}

/**
 * Component-based logo compositing helper
 * This can be used with react-native-view-shot when markImage fails
 * 
 * Usage:
 * ```tsx
 * import { LogoCompositeView } from './LogoCompositeView';
 * import ViewShot, { captureRef } from 'react-native-view-shot';
 * 
 * const viewRef = useRef(null);
 * 
 * <ViewShot ref={viewRef} options={{ format: 'jpg', quality: 1.0 }}>
 *   <LogoCompositeView 
 *     backgroundImageUri={imageUri}
 *     logoUri={logoUri}
 *   />
 * </ViewShot>
 * 
 * const uri = await captureRef(viewRef.current, { format: 'jpg', quality: 1.0 });
 * ```
 */
export const LogoCompositeView = React.forwardRef<View, LogoCompositeViewProps>(({ 
  backgroundImageUri, 
  logoUri, 
  logoSize, 
  logoMargin = 20,
  logoPosition = 'bottomRight'
}, ref) => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  
  React.useEffect(() => {
    Image.getSize(backgroundImageUri, (width, height) => {
      setDimensions({ width, height });
    }, (error) => {
      console.error('Error getting image size:', error);
    });
  }, [backgroundImageUri]);
  
  const calculatedLogoSize = logoSize || Math.min(Math.min(dimensions.width, dimensions.height) * 0.15, 200);
  
  const logoStyle = React.useMemo(() => {
    const baseStyle = {
      position: 'absolute' as const,
      width: calculatedLogoSize,
      height: calculatedLogoSize,
      resizeMode: 'contain' as const,
    };
    
    switch (logoPosition) {
      case 'bottomRight':
        return { ...baseStyle, bottom: logoMargin, right: logoMargin };
      case 'bottomLeft':
        return { ...baseStyle, bottom: logoMargin, left: logoMargin };
      case 'topRight':
        return { ...baseStyle, top: logoMargin, right: logoMargin };
      case 'topLeft':
        return { ...baseStyle, top: logoMargin, left: logoMargin };
      default:
        return { ...baseStyle, bottom: logoMargin, right: logoMargin };
    }
  }, [calculatedLogoSize, logoMargin, logoPosition]);
  
  if (dimensions.width === 0 || dimensions.height === 0) {
    return null;
  }
  
  return (
    <View ref={ref} style={{ width: dimensions.width, height: dimensions.height, position: 'relative', overflow: 'hidden' }}>
      <Image
        source={{ uri: backgroundImageUri }}
        style={{ width: dimensions.width, height: dimensions.height }}
        resizeMode="cover"
      />
      <Image
        source={{ uri: logoUri }}
        style={logoStyle}
      />
    </View>
  );
});

LogoCompositeView.displayName = 'LogoCompositeView';


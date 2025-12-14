import { Image } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import React, { useRef, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { calculateAttributionParams } from './addAttributionWithViewShot';

/**
 * Internal component used for programmatic view-shot compositing
 * This component is rendered off-screen and captured
 */
const AttributionViewShotComponent: React.FC<{
  backgroundImageUri: string;
  attributionText: string;
  logoUri: string | null;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  barHeight: number;
  logoSize: number;
  logoAspectRatio: number;
  width: number;
  height: number;
  onReady: (captureFn: () => Promise<string>) => void;
}> = ({
  backgroundImageUri,
  attributionText,
  logoUri,
  fontSize,
  paddingX,
  paddingY,
  barHeight,
  logoSize,
  logoAspectRatio,
  width,
  height,
  onReady,
}) => {
  console.log('AttributionViewShotComponent: Component initialized with props', { width, height, backgroundImageUri });
  const viewRef = useRef<ViewShot | null>(null);
  const viewRefStable = useRef<ViewShot | null>(null); // Stable ref that won't be cleared
  const [isReady, setIsReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(!logoUri);
  const [layoutReady, setLayoutReady] = useState(false);
  const captureFnRef = useRef<(() => Promise<string>) | null>(null);

  // Fallback: Set imageLoaded after a timeout if it doesn't load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!imageLoaded) {
        console.warn('AttributionViewShotComponent: Image load timeout, proceeding anyway');
        setImageLoaded(true);
      }
    }, 2000); // 2 second timeout for image loading
    return () => clearTimeout(timer);
  }, [imageLoaded]);

  // Set isReady immediately if we have dimensions
  useEffect(() => {
    if (width > 0 && height > 0) {
      console.log('AttributionViewShotComponent: Dimensions available', { width, height });
      // Set ready immediately - component is mounted
      setIsReady(true);
    }
  }, [width, height]);

  useEffect(() => {
    const allReady = isReady && imageLoaded && logoLoaded && layoutReady && width > 0 && height > 0;
    const currentRef = viewRefStable.current || viewRef.current;
    console.log('AttributionViewShotComponent: Checking ready state', { 
      isReady, 
      imageLoaded, 
      logoLoaded,
      layoutReady,
      hasRef: !!currentRef,
      hasStableRef: !!viewRefStable.current,
      width,
      height,
      allReady,
      hasOnReady: !!onReady
    });

    if (allReady && onReady) {
      // Wait a bit more to ensure ref is set
      const timer = setTimeout(() => {
        const refToUse = viewRefStable.current || viewRef.current;
        if (!refToUse) {
          console.error('AttributionViewShotComponent: ViewShot ref still null after delay');
          return;
        }
        
        console.log('AttributionViewShotComponent: All conditions met, creating capture function', {
          hasStableRef: !!viewRefStable.current,
          hasRef: !!viewRef.current
        });
        
        // Store ref in closure to ensure it's available
        const stableRef = refToUse;
        const capture = async (): Promise<string> => {
          // Use the stable ref stored in closure
          if (!stableRef) {
            throw new Error('ViewShot ref not available during capture');
          }
          
          // Add a delay to ensure everything is fully rendered and laid out
          await new Promise(resolve => setTimeout(resolve, 200));
          
          console.log('AttributionViewShotComponent: Capturing with dimensions', { 
            width, 
            height, 
            hasRef: !!stableRef 
          });
          try {
            const uri = await captureRef(stableRef, {
              format: 'png',
              quality: 1.0,
              result: 'tmpfile',
            });
            console.log('AttributionViewShotComponent: Captured successfully', uri);
            return uri;
          } catch (error: any) {
            console.error('AttributionViewShotComponent: Capture error', error, { 
              width, 
              height, 
              hasRef: !!stableRef 
            });
            throw error;
          }
        };
        captureFnRef.current = capture;
        console.log('AttributionViewShotComponent: Calling onReady with capture function');
        onReady(capture);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, imageLoaded, logoLoaded, layoutReady, onReady, width, height, logoUri]);

  const barY = height - barHeight;
  const logoWidth = logoSize;
  const logoHeight = logoSize / logoAspectRatio;
  const logoX = width - paddingX - logoWidth;
  const logoY = barY + (barHeight - logoHeight) / 2 - (paddingY * 0.3);

  // Don't render if we don't have dimensions
  if (width <= 0 || height <= 0) {
    console.warn('AttributionViewShotComponent: Invalid dimensions', { width, height });
    return null;
  }

  return (
    <ViewShot
      ref={(ref) => {
        viewRef.current = ref;
        viewRefStable.current = ref; // Store in stable ref
        if (ref) {
          console.log('AttributionViewShotComponent: ViewShot ref set', { 
            hasRef: !!ref,
            hasStableRef: !!viewRefStable.current
          });
        } else {
          // Ref cleared during unmount - this is normal React behavior
          // The stable ref in closure will still work for ongoing captures
          console.log('AttributionViewShotComponent: ViewShot ref cleared (component unmounting)');
        }
      }}
      style={{ 
        width: Math.floor(width), 
        height: Math.floor(height),
        // Disable view collapsing on Android
        collapsable: false,
        // Ensure view is not removed from hierarchy
        overflow: 'hidden',
      }}
      options={{
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      }}
      onLayout={(event) => {
        const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
        console.log('AttributionViewShotComponent: ViewShot onLayout fired', { 
          layoutWidth, 
          layoutHeight, 
          expectedWidth: width, 
          expectedHeight: height,
          hasRef: !!viewRef.current
        });
        if (layoutWidth > 0 && layoutHeight > 0) {
          setLayoutReady(true);
        }
      }}
    >
      <View 
        style={{ 
          width: Math.floor(width), 
          height: Math.floor(height), 
          position: 'relative',
          // Disable view collapsing on Android
          collapsable: false,
        }}
        onLayout={(event) => {
          const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
          console.log('AttributionViewShotComponent: Inner View onLayout fired', { layoutWidth, layoutHeight });
        }}
      >
        {/* Background Image */}
        <Image
          source={{ uri: backgroundImageUri }}
          style={{ 
            width: Math.floor(width), 
            height: Math.floor(height), 
            position: 'absolute', 
            top: 0, 
            left: 0 
          }}
          resizeMode="cover"
          onLoadStart={() => {
            console.log('AttributionViewShotComponent: Background image load started', { backgroundImageUri, width, height });
          }}
          onLoad={(e) => {
            console.log('AttributionViewShotComponent: Background image loaded', { 
              width: e.nativeEvent.source.width, 
              height: e.nativeEvent.source.height,
              componentWidth: width,
              componentHeight: height
            });
            setImageLoaded(true);
          }}
          onError={(error) => {
            console.error('AttributionViewShotComponent: Background image error', error, { backgroundImageUri });
            // Set to true anyway to not block - maybe image is cached
            setImageLoaded(true);
          }}
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
            fontWeight: 'normal',
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
            onLoad={() => {
              console.log('AttributionViewShotComponent: Logo loaded');
              setLogoLoaded(true);
            }}
            onError={(error) => {
              console.error('AttributionViewShotComponent: Logo error', error);
              setLogoLoaded(true); // Set to true anyway to not block
            }}
          />
        )}
      </View>
    </ViewShot>
  );
};

/**
 * Global registry for attribution components
 * This allows us to render components programmatically
 */
let attributionComponentRegistry: {
  component: React.ReactElement | null;
  captureFn: (() => Promise<string>) | null;
  resolve: ((uri: string) => void) | null;
  reject: ((error: Error) => void) | null;
} = {
  component: null,
  captureFn: null,
  resolve: null,
  reject: null,
};

/**
 * Renders an attribution component and captures it
 * This is a workaround to use view-shot from a pure function
 */
export function renderAttributionComponent(
  component: React.ReactElement
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Set a timeout to prevent infinite waiting
    const timeout = setTimeout(() => {
      // Clear registry on timeout
      attributionComponentRegistry = {
        component: null,
        captureFn: null,
        resolve: null,
        reject: null,
      };
      reject(new Error('Attribution compositing timed out after 15 seconds'));
    }, 15000);

    attributionComponentRegistry = {
      component,
      captureFn: null,
      resolve: (uri: string) => {
        clearTimeout(timeout);
        resolve(uri);
      },
      reject: (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      },
    };
  });
}

/**
 * Gets the current attribution component to render
 * This should be called from a React component's render method
 */
export function getAttributionComponent(): React.ReactElement | null {
  return attributionComponentRegistry.component;
}

/**
 * Sets the capture function when the component is ready
 */
export function setAttributionCaptureFn(captureFn: () => Promise<string>) {
  console.log('setAttributionCaptureFn: Setting capture function', {
    hasResolve: !!attributionComponentRegistry.resolve,
    hasReject: !!attributionComponentRegistry.reject,
  });
  
  // Store the capture function
  attributionComponentRegistry.captureFn = captureFn;
  
  // If we have both captureFn and resolve, execute immediately
  if (attributionComponentRegistry.captureFn && attributionComponentRegistry.resolve) {
    console.log('setAttributionCaptureFn: Both captureFn and resolve available, executing capture...');
    
    // Store resolve/reject before clearing registry
    const resolve = attributionComponentRegistry.resolve;
    const reject = attributionComponentRegistry.reject;
    
    // Execute capture - but DON'T clear registry yet, keep component mounted
    const capturePromise = attributionComponentRegistry.captureFn();
    
    // Handle the capture result - clear registry AFTER capture completes
    capturePromise
      .then((uri) => {
        console.log('setAttributionCaptureFn: Capture successful', uri);
        // Clear registry after successful capture
        attributionComponentRegistry = {
          component: null,
          captureFn: null,
          resolve: null,
          reject: null,
        };
        resolve(uri);
      })
      .catch((error) => {
        console.error('setAttributionCaptureFn: Capture failed', error);
        // Clear registry after failed capture
        attributionComponentRegistry = {
          component: null,
          captureFn: null,
          resolve: null,
          reject: null,
        };
        reject(error);
      });
  } else {
    console.warn('setAttributionCaptureFn: Missing captureFn or resolve, will wait', {
      hasCaptureFn: !!attributionComponentRegistry.captureFn,
      hasResolve: !!attributionComponentRegistry.resolve,
    });
  }
}

/**
 * Adds attribution to an image using view-shot (component-based approach)
 * This function creates a component and uses a registry pattern to capture it
 */
export async function addAttributionToImageWithViewShot(
  imageUri: string,
  userName: string
): Promise<string> {
  try {
    console.log('addAttributionToImageWithViewShot: Starting', { imageUri, userName });
    
    // Load the logo asset
    const logoAsset = require('../assets/images/ganapp_attri.png');
    const asset = Asset.fromModule(logoAsset);
    await asset.downloadAsync();

    let logoPath = asset.localUri;
    if (!logoPath) {
      const logoFileName = 'ganapp_attri_logo.png';
      const logoLocalPath = `${FileSystem.cacheDirectory}${logoFileName}`;
      const fileInfo = await FileSystem.getInfoAsync(logoLocalPath);
      if (!fileInfo.exists && asset.uri && (asset.uri.startsWith('http://') || asset.uri.startsWith('https://'))) {
        const downloadResult = await FileSystem.downloadAsync(asset.uri, logoLocalPath);
        logoPath = downloadResult.uri;
      } else {
        logoPath = fileInfo.exists ? logoLocalPath : asset.uri;
      }
    }

    const logoUri = logoPath ? (logoPath.startsWith('file://') ? logoPath : `file://${logoPath}`) : null;
    console.log('addAttributionToImageWithViewShot: Logo loaded', { logoUri });

    // Calculate parameters
    const params = await calculateAttributionParams(
      imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`,
      userName,
      logoUri
    );
    console.log('addAttributionToImageWithViewShot: Parameters calculated', params);

    // Create the component - map imageWidth/imageHeight to width/height
    console.log('addAttributionToImageWithViewShot: Creating component with params', params);
    const component = React.createElement(AttributionViewShotComponent, {
      backgroundImageUri: params.backgroundImageUri,
      attributionText: params.attributionText,
      logoUri: params.logoUri,
      fontSize: params.fontSize,
      paddingX: params.paddingX,
      paddingY: params.paddingY,
      barHeight: params.barHeight,
      logoSize: params.logoSize,
      logoAspectRatio: params.logoAspectRatio,
      width: params.imageWidth, // Map imageWidth to width
      height: params.imageHeight, // Map imageHeight to height
      onReady: setAttributionCaptureFn,
    });
    console.log('addAttributionToImageWithViewShot: Component created, registering...', {
      width: params.imageWidth,
      height: params.imageHeight,
    });

    // Render and capture
    const result = await renderAttributionComponent(component);
    console.log('addAttributionToImageWithViewShot: Completed', result);
    return result;
  } catch (error: any) {
    console.error('Error adding attribution with view-shot:', error);
    throw error;
  }
}


import { Alert, Image, Platform, View, Text } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import React, { useRef, useEffect, useState } from 'react';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { calculateAttributionParams } from './addAttributionWithViewShot';

let attributionLogoDiagAlertShown = false;

function normalizeLogoUriCandidate(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const trimmed = String(uri).trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  // Keep known URI schemes as-is (do NOT force file:// onto these)
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('file://') ||
    lower.startsWith('content://') ||
    lower.startsWith('asset:') ||
    lower.startsWith('data:')
  ) {
    return trimmed;
  }

  // If it's an absolute filesystem path (Android/iOS), convert to file://
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }

  // Anything else (e.g. "assets_images_ganapp_attri") is NOT a resolvable file URI.
  return null;
}

function attributionLogoDiag(message: string, data?: any) {
  // In many RN/Expo production builds, `console.log` can be stripped while `warn/error` remain.
  // Use warn in production so it shows in release `adb logcat`.
  if (__DEV__) {
    console.log('[ATTRIBUTION_LOGO_DIAG]', message, data ?? '');
  } else {
    console.warn('[ATTRIBUTION_LOGO_DIAG]', message, data ?? '');
  }
}

function attributionLogoDiagAlertOnce(title: string, message: string) {
  if (attributionLogoDiagAlertShown) return;
  attributionLogoDiagAlertShown = true;
  try {
    Alert.alert(title, message);
  } catch (e) {
    // If alerts can't render (e.g., no UI context), fall back to console.
    console.error('[ATTRIBUTION_LOGO_DIAG] Failed to show alert', e);
  }
}

/**
 * Internal component used for programmatic view-shot compositing
 * This component is rendered off-screen and captured
 */
const AttributionViewShotComponent: React.FC<{
  backgroundImageUri: string;
  attributionText: string;
  logoUri: string | null;
  logoAssetModule?: any;
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
  logoAssetModule,
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
    const [logoLoaded, setLogoLoaded] = useState(!(logoUri || logoAssetModule));
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
          }}
          collapsable={false}
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
          {(logoUri || logoAssetModule) && (
            <Image
              source={logoAssetModule ? logoAssetModule : { uri: logoUri as string }}
              style={{
                position: 'absolute',
                left: logoX,
                top: logoY,
                width: logoWidth,
                height: logoHeight,
                resizeMode: 'contain',
              }}
              onLoadStart={() => {
                attributionLogoDiag('Logo load started', { logoUri });
              }}
              onLoad={() => {
                attributionLogoDiag('Logo loaded', { logoUri });
                setLogoLoaded(true);
              }}
              onError={(error) => {
                // Keep as error so it shows up in production logs and any error tracking integrations.
                console.error('[ATTRIBUTION_LOGO_DIAG] Logo error', {
                  logoUri,
                  nativeEvent: (error as any)?.nativeEvent,
                  error,
                });
                attributionLogoDiagAlertOnce(
                  'Attribution Logo Debug (Error)',
                  `Logo failed to load.\n\nlogoUri: ${logoUri}\n\nnativeEvent: ${JSON.stringify((error as any)?.nativeEvent ?? {}, null, 2)}`
                );
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
  const captureFnToUse = attributionComponentRegistry.captureFn;
  const resolveToUse = attributionComponentRegistry.resolve;
  const rejectToUse = attributionComponentRegistry.reject;

  if (captureFnToUse && resolveToUse) {
    console.log('setAttributionCaptureFn: Both captureFn and resolve available, executing capture...');

    // Execute capture - but DON'T clear registry yet, keep component mounted
    const capturePromise = captureFnToUse();

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
        resolveToUse(uri);
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
        if (rejectToUse) {
          rejectToUse(error);
        }
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

    // Load the logo asset - use Image.resolveAssetSource for reliable asset resolution
    const logoAsset = require('../assets/images/ganapp_attri.png');
    const logoAssetModule = logoAsset;
    let logoUri: string | null = null;
    let resolvedAssetForDiag: any = null;
    let assetForDiag: any = null;

    attributionLogoDiag('Starting attribution logo resolution', {
      platform: Platform.OS,
      isDev: __DEV__,
      logoAssetType: typeof logoAsset,
      // In RN `require("...png")` usually becomes a number (module id)
      logoAssetValue: logoAsset,
    });

    try {
      // Method 1: Try Image.resolveAssetSource (works in both dev and production)
      const resolvedAsset = Image.resolveAssetSource(logoAsset);
      resolvedAssetForDiag = resolvedAsset;
      attributionLogoDiag('Image.resolveAssetSource result', resolvedAsset);
      if (resolvedAsset?.uri) {
        const normalized = normalizeLogoUriCandidate(resolvedAsset.uri);
        if (normalized) {
          logoUri = normalized;
          attributionLogoDiag('Logo resolved via Image.resolveAssetSource (normalized)', {
            original: resolvedAsset.uri,
            logoUri,
          });
        } else {
          attributionLogoDiag('Image.resolveAssetSource returned non-URI candidate; will fallback to Asset.fromModule', {
            original: resolvedAsset.uri,
          });
        }
      }
    } catch (resolveError) {
      console.warn('[ATTRIBUTION_LOGO_DIAG] Image.resolveAssetSource failed, trying Asset.fromModule', resolveError);
    }

    // Method 2: Fallback to Asset.fromModule if Image.resolveAssetSource didn't work
    if (!logoUri) {
      try {
        const asset = Asset.fromModule(logoAsset);
        assetForDiag = {
          uri: asset.uri,
          localUri: asset.localUri,
          width: asset.width,
          height: asset.height,
          downloaded: asset.downloaded,
        };
        attributionLogoDiag('Asset.fromModule created', {
          uri: asset.uri,
          localUri: asset.localUri,
          width: asset.width,
          height: asset.height,
          downloaded: asset.downloaded,
        });
        await asset.downloadAsync();
        attributionLogoDiag('Asset.downloadAsync completed', {
          uri: asset.uri,
          localUri: asset.localUri,
          downloaded: asset.downloaded,
        });

        // Prefer localUri if available (production builds) — but only if it's a real URI/path
        if (asset.localUri) {
          const normalizedLocal = normalizeLogoUriCandidate(asset.localUri);
          if (normalizedLocal) {
            logoUri = normalizedLocal;
            attributionLogoDiag('Logo loaded via Asset.localUri (normalized)', {
              original: asset.localUri,
              logoUri,
            });
          } else {
            // Some environments expose localUri as a non-path identifier (e.g. "assets_images_ganapp_attri")
            // Do NOT force file:// onto it — fall back to other resolution methods instead.
            attributionLogoDiag('Asset.localUri is not a valid URI/path; ignoring', {
              original: asset.localUri,
            });
          }
        }

        if (!logoUri && asset.uri) {
          // If localUri is not available, use uri directly
          // For bundled assets, uri should work directly
          logoUri = normalizeLogoUriCandidate(asset.uri) ?? asset.uri;
          attributionLogoDiag('Logo loaded via Asset.uri', { logoUri });

          // If it's a remote URL, try to download it
          if (logoUri.startsWith('http://') || logoUri.startsWith('https://')) {
            const logoFileName = 'ganapp_attri_logo.png';
            const logoLocalPath = `${FileSystem.cacheDirectory}${logoFileName}`;
            const fileInfo = await FileSystem.getInfoAsync(logoLocalPath);

            if (!fileInfo.exists) {
              try {
                const downloadResult = await FileSystem.downloadAsync(logoUri, logoLocalPath);
                logoUri = downloadResult.uri;
                attributionLogoDiag('Logo downloaded to cache', { logoUri });
              } catch (downloadError) {
                console.warn('[ATTRIBUTION_LOGO_DIAG] Failed to download logo, using remote URI', downloadError);
              }
            } else {
              logoUri = logoLocalPath.startsWith('file://') ? logoLocalPath : `file://${logoLocalPath}`;
              attributionLogoDiag('Logo found in cache', { logoUri });
            }
          }
        }
      } catch (assetError) {
        console.error('[ATTRIBUTION_LOGO_DIAG] Asset.fromModule failed', assetError);
      }
    }

    attributionLogoDiag('Final logoUri selected', {
      logoUri,
      hasLogo: !!logoUri,
      scheme: logoUri ? logoUri.split(':')[0] : null,
    });

    // If we couldn't resolve a logo URI AND we somehow don't have a bundled asset module (should never happen),
    // surface this immediately as an alert in production.
    if (!logoUri && !logoAssetModule) {
      attributionLogoDiagAlertOnce(
        'Attribution Logo Debug (Missing)',
        `Logo URI could not be resolved.\n\nresolveAssetSource: ${JSON.stringify(resolvedAssetForDiag ?? null, null, 2)}\n\nasset: ${JSON.stringify(assetForDiag ?? null, null, 2)}`
      );
    }

    // Extra production diagnostics: verify file exists if it's a local file URI
    if (logoUri?.startsWith('file://')) {
      try {
        const info = await FileSystem.getInfoAsync(logoUri);
        attributionLogoDiag('Logo file info (FileSystem.getInfoAsync)', info);
        if (!info.exists) {
          attributionLogoDiagAlertOnce(
            'Attribution Logo Debug (File Missing)',
            `Logo resolved to a file:// URI but the file does not exist.\n\nlogoUri: ${logoUri}\n\ninfo: ${JSON.stringify(info, null, 2)}`
          );
        }
      } catch (e) {
        console.error('[ATTRIBUTION_LOGO_DIAG] Failed to stat logo file', { logoUri, error: e });
        attributionLogoDiagAlertOnce(
          'Attribution Logo Debug (Stat Failed)',
          `Failed to stat logo file.\n\nlogoUri: ${logoUri}\n\nerror: ${String(e)}`
        );
      }
    }

    // Calculate parameters
    const params = await calculateAttributionParams(
      imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`,
      userName,
      logoUri,
      logoAssetModule
    );
    console.log('addAttributionToImageWithViewShot: Parameters calculated', params);

    // Create the component - map imageWidth/imageHeight to width/height
    console.log('addAttributionToImageWithViewShot: Creating component with params', params);
    const component = React.createElement(AttributionViewShotComponent, {
      backgroundImageUri: params.backgroundImageUri,
      attributionText: params.attributionText,
      logoUri: params.logoUri,
      logoAssetModule,
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


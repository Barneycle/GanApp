import { Image } from 'react-native';
import { AttributionCompositeView } from './AttributionCompositeView';

/**
 * Calculates all the parameters needed for attribution compositing
 * This can be used to prepare data for AttributionCompositeView component
 */
export async function calculateAttributionParams(
  imageUri: string,
  userName: string,
  logoUri: string | null
): Promise<{
  backgroundImageUri: string;
  attributionText: string;
  logoUri: string | null;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  barHeight: number;
  logoSize: number;
  logoAspectRatio: number;
  imageWidth: number;
  imageHeight: number;
}> {
  const attributionText = `Posted in GanApp by ${userName}`;

  // Get image dimensions
  let imageWidth = 1920;
  let imageHeight = 1080;
  try {
    await new Promise<void>((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => {
          imageWidth = width;
          imageHeight = height;
          resolve();
        },
        reject
      );
    });
  } catch (error) {
    console.warn('Could not get image dimensions, using defaults:', error);
  }

  // Calculate dynamic font size (matching web: image.width / 40)
  const dynamicFontSize = Math.max(24, Math.floor(imageWidth / 40));

  // Check if it fits with the text length
  const leftPadding = Math.max(20, Math.floor(imageWidth / 50));
  const rightPadding = Math.max(20, Math.floor(imageWidth / 50));
  const logoSpace = logoUri ? dynamicFontSize * 6.0 : 0;
  const availableWidth = imageWidth - leftPadding - rightPadding - logoSpace;

  const textLength = attributionText.length;
  const maxFontSizeForText = Math.floor(availableWidth / (textLength * 0.6));
  const minFontSize = 20;
  const finalFontSize = Math.max(minFontSize, Math.min(dynamicFontSize, maxFontSizeForText));

  // Get logo dimensions
  let logoWidth = 0;
  let logoHeight = 0;
  if (logoUri) {
    try {
      await new Promise<void>((resolve) => {
        Image.getSize(
          logoUri,
          (width, height) => {
            logoWidth = width;
            logoHeight = height;
            resolve();
          },
          () => resolve()
        );
      });
    } catch (e) {
      console.warn('Could not get logo dimensions');
    }
  }

  // Calculate logo size
  const desiredLogoSize = finalFontSize * 6.0;
  const logoOriginalSize = Math.max(logoWidth, logoHeight) || 500;
  const logoAspectRatio = logoWidth && logoHeight ? logoWidth / logoHeight : 1;
  const logoSize = desiredLogoSize;

  // Calculate black bar dimensions
  const paddingY = Math.max(15, Math.floor(imageHeight / 80));
  const textHeight = finalFontSize;
  const barHeight = textHeight + paddingY * 2;
  const paddingX = Math.max(20, Math.floor(imageWidth / 50));

  return {
    backgroundImageUri: imageUri,
    attributionText,
    logoUri,
    fontSize: finalFontSize,
    paddingX,
    paddingY,
    barHeight,
    logoSize,
    logoAspectRatio,
    imageWidth,
    imageHeight,
  };
}

/**
 * Hook-style function that returns the AttributionCompositeView component
 * and a capture function. Use this in React components.
 * 
 * Example:
 * ```tsx
 * const { Component, capture } = useAttributionCompositing(imageUri, userName, logoUri);
 * 
 * return (
 *   <>
 *     <Component onCaptureReady={(captureFn) => { captureFn().then(uri => console.log(uri)); }} />
 *   </>
 * );
 * ```
 */
export function useAttributionCompositing(
  imageUri: string,
  userName: string,
  logoUri: string | null
) {
  // This would need to be used in a component with useState/useEffect
  // For now, export the component and calculation function separately
  return {
    AttributionCompositeView,
    calculateParams: () => calculateAttributionParams(imageUri, userName, logoUri),
  };
}


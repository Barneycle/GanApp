import Marker, { Position, ImageFormat, TextBackgroundType } from 'react-native-image-marker';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

/**
 * Checks if the image marker library is available
 */
function isImageMarkerAvailable(): boolean {
  try {
    return Marker && typeof Marker.markText === 'function';
  } catch (error) {
    return false;
  }
}



/**
 * Gets user's full name by user ID
 */
async function getUserNameById(userId: string): Promise<string> {
  try {
    // Try to get user profile from RPC function if available
    const { data: userProfile, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: userId });
    
    if (!rpcError && userProfile) {
      const profile = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile;
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      } else if (firstName) {
        return firstName;
      } else if (lastName) {
        return lastName;
      }
    }
    
    // Fallback: try to get from auth admin API (if available)
    // Note: This requires admin privileges, so it might not work
    // For now, extract from filename pattern if possible
    return 'User';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'User';
  }
}

/**
 * Adds Reddit-style attribution watermark to an image
 * @param imageUri - URI of the image to add attribution to
 * @param userName - Full name of the user who posted the photo
 * @returns URI of the image with attribution overlay
 */
export async function addAttributionToImage(
  imageUri: string,
  userName: string
): Promise<string> {
  // Check if library is available
  if (!isImageMarkerAvailable()) {
    console.warn('react-native-image-marker is not available. Attribution will not be added.');
    console.warn('Note: This library requires a native build. Please rebuild your app after installing.');
    return imageUri;
  }

  try {
    // Ensure imageUri is a proper file path (remove file:// prefix if needed for the library)
    let processedUri = imageUri;
    if (imageUri.startsWith('file://')) {
      processedUri = imageUri;
    } else if (!imageUri.startsWith('http') && !imageUri.startsWith('/')) {
      processedUri = `file://${imageUri}`;
    }
    
    // Create attribution text (Reddit-style: "Posted in GanApp by [Full Name]")
    const attributionText = `Posted in GanApp by ${userName}`;
    
    // Generate a unique filename for the attributed image
    const timestamp = Date.now();
    const filename = `attributed_${timestamp}`;
    
    // Load the logo asset and get its local URI
    const logoAsset = require('../assets/images/ganapp_attri.png');
    const asset = Asset.fromModule(logoAsset);
    
    // Download the asset to get a local file path
    await asset.downloadAsync();
    
    let logoPath = asset.localUri;
    
    // If localUri is still null (common in development), copy the asset to a local file
    if (!logoPath) {
      // Create a local file path in the cache directory
      const logoFileName = 'ganapp_attri_logo.png';
      const logoLocalPath = `${FileSystem.cacheDirectory}${logoFileName}`;
      
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(logoLocalPath);
      
      if (!fileInfo.exists) {
        // If asset.uri is a URL, download it to local file
        if (asset.uri && (asset.uri.startsWith('http://') || asset.uri.startsWith('https://'))) {
          const downloadResult = await FileSystem.downloadAsync(asset.uri, logoLocalPath);
          logoPath = downloadResult.uri;
        } else {
          // For bundled assets, we might need a different approach
          console.warn('Asset localUri is null and uri is not a downloadable URL');
          logoPath = asset.uri;
        }
      } else {
        logoPath = logoLocalPath;
      }
    }
    
    // Ensure logo path is a local file path (remove file:// prefix for the library)
    if (logoPath && logoPath.startsWith('file://')) {
      logoPath = logoPath.replace('file://', '');
    }
    
    console.log('Adding attribution to image:', {
      originalUri: imageUri,
      processedUri,
      userName,
      attributionText,
      logoPath,
      assetLocalUri: asset.localUri,
      assetUri: asset.uri,
    });
    
    // Try using Marker.mark() which might support both text and images simultaneously
    const markMethod = (Marker as any).mark || Marker.markText;
    const markImageMethod = (Marker as any).markImage;
    
    let markedImageUri: string;
    
    // First, try using mark() with both text and images if it exists
    if ((Marker as any).mark && typeof (Marker as any).mark === 'function') {
      try {
        console.log('Trying mark() method with both text and images');
        let imageSrc = processedUri;
        if (imageSrc.startsWith('file://')) {
          imageSrc = imageSrc.replace('file://', '');
        }
        
        let finalLogoPath = logoPath;
        if (finalLogoPath && finalLogoPath.startsWith('file://')) {
          finalLogoPath = finalLogoPath.replace('file://', '');
        }
        
        markedImageUri = await (Marker as any).mark({
          backgroundImage: {
            src: imageSrc,
            scale: 1,
            rotate: 0,
            alpha: 1,
          },
          watermarkTexts: [
            {
              text: attributionText,
              positionOptions: {
                position: Position.bottomLeft,
                X: 0,
                Y: 0,
              },
              style: {
                color: '#FFFFFF',
                fontName: 'Roboto',
                fontSize: 60,
                textAlign: 'left',
                textBackgroundStyle: {
                  paddingX: 40,
                  paddingY: 30,
                  type: TextBackgroundType.stretchX,
                  color: '#000000',
                },
              },
            },
          ],
          watermarkImages: finalLogoPath ? [
            {
              src: finalLogoPath,
              positionOptions: {
                position: Position.bottomRight,
                X: -40, // Match web padding
                Y: 0, // Center vertically
              },
              scale: 3.0, // Much bigger to match web version (6x font size)
              alpha: 1.0,
            }
          ] : [],
          quality: 100,
          filename: filename,
          saveFormat: ImageFormat.jpg,
        });
        console.log('Successfully used mark() method with both text and logo');
      } catch (markError) {
        console.warn('mark() method failed, falling back to two-pass approach:', markError);
        // Fall through to two-pass approach
        markedImageUri = '';
      }
    } else {
      markedImageUri = '';
    }
    
    // If mark() didn't work or doesn't exist, use two-pass approach
    if (!markedImageUri) {
      console.log('Using two-pass approach: text first, then logo');
      
      // Step 1: Add text attribution watermark
      console.log('Step 1: Adding text attribution watermark');
      let intermediateUri = await markMethod({
        backgroundImage: {
          src: processedUri,
          scale: 1,
          rotate: 0,
          alpha: 1,
        },
        watermarkTexts: [
          {
            text: attributionText,
            positionOptions: {
              position: Position.bottomLeft,
              X: 0,
              Y: 0,
            },
            style: {
              color: '#FFFFFF',
              fontName: 'Roboto',
              fontSize: 60,
              textAlign: 'left',
              textBackgroundStyle: {
                paddingX: 40,
                paddingY: 30,
                type: TextBackgroundType.stretchX,
                color: '#000000',
              },
            },
          },
        ],
        quality: 100,
        filename: `intermediate_${timestamp}`,
        saveFormat: ImageFormat.jpg,
      });
      
      // Normalize intermediate URI
      if (intermediateUri && !intermediateUri.startsWith('file://') && !intermediateUri.startsWith('http')) {
        intermediateUri = `file://${intermediateUri}`;
      }
      
      console.log('Text attribution added, intermediate image:', intermediateUri);
      
      // Step 2: Add logo using the exact API format from documentation
      // The error "please set image!" suggests the image path format is wrong
      if (logoPath) {
        try {
          // First, verify both files exist
          const intermediateFileInfo = await FileSystem.getInfoAsync(intermediateUri);
          const logoFileInfo = await FileSystem.getInfoAsync(
            logoPath.startsWith('file://') ? logoPath : `file://${logoPath}`
          );
          
          if (!intermediateFileInfo.exists) {
            console.warn('Intermediate image file does not exist:', intermediateUri);
            markedImageUri = intermediateUri;
          } else if (!logoFileInfo.exists) {
            console.warn('Logo file does not exist:', logoPath);
            markedImageUri = intermediateUri;
          } else {
            // Files exist, try different path formats
            const intermediatePath = intermediateUri.replace(/^file:\/\//, '');
            const logoPathClean = logoPath.replace(/^file:\/\//, '');
            
            // Try different API structures - the library might expect backgroundImage format
            const apiVariations = [
              // Variation 1: Simple format (src, markerSrc)
              {
                src: intermediatePath,
                markerSrc: logoPathClean,
                position: 'bottomRight',
                scale: 1,
                markerScale: 3.0, // Much bigger to match web version
                quality: 100,
              },
              // Variation 2: With file:// prefixes
              {
                src: intermediateUri,
                markerSrc: logoPath.startsWith('file://') ? logoPath : `file://${logoPath}`,
                position: 'bottomRight',
                scale: 1,
                markerScale: 3.0, // Much bigger to match web version
                quality: 100,
              },
              // Variation 3: Using backgroundImage structure (like markText)
              {
                backgroundImage: {
                  src: intermediatePath,
                  scale: 1,
                  rotate: 0,
                  alpha: 1,
                },
                watermarkImages: [{
                  src: logoPathClean,
                  positionOptions: {
                    position: Position.bottomRight,
                    X: -40, // Match web padding
                    Y: 0, // Center vertically
                  },
                  scale: 3.0, // Much bigger to match web version (6x font size)
                  alpha: 1.0,
                }],
                quality: 100,
                filename: filename,
                saveFormat: ImageFormat.jpg,
              },
              // Variation 4: backgroundImage with file://
              {
                backgroundImage: {
                  src: intermediateUri.replace(/^file:\/\//, ''),
                  scale: 1,
                },
                watermarkImages: [{
                  src: logoPathClean,
                  position: 'bottomRight',
                  X: -40, // Match web padding
                  Y: 0, // Center vertically
                  scale: 3.0, // Much bigger to match web version (6x font size)
                }],
                quality: 100,
                filename: filename,
                saveFormat: ImageFormat.jpg,
              },
              // Variation 5: Try with image and watermark as separate params
              {
                image: intermediatePath,
                watermark: logoPathClean,
                position: 'bottomRight',
                scale: 3.0, // Much bigger to match web version
                quality: 100,
              },
            ];
            
            const ImageMarker = Marker as any;
            let logoSuccess = false;
            
            for (let i = 0; i < apiVariations.length; i++) {
              try {
                const variation = apiVariations[i];
                console.log(`Trying logo API variation ${i + 1}:`, JSON.stringify(variation, null, 2).substring(0, 200));
                
                const logoResult = await ImageMarker.markImage(variation);
                
                if (logoResult) {
                  markedImageUri = logoResult.startsWith('file://') ? logoResult : `file://${logoResult}`;
                  console.log(`Logo added successfully using API variation ${i + 1}!`);
                  logoSuccess = true;
                  break;
                }
              } catch (variationError: any) {
                console.log(`API variation ${i + 1} failed:`, variationError.message || variationError);
                continue;
              }
            }
            
            if (!logoSuccess) {
              console.warn('All logo path variations failed - library may have a bug');
              markedImageUri = intermediateUri;
            }
          }
        } catch (logoError: any) {
          console.warn('Logo addition error:', logoError.message || logoError);
          markedImageUri = intermediateUri;
        }
      } else {
        markedImageUri = intermediateUri;
      }
    }
    
    console.log('Attribution added successfully:', markedImageUri);
    
    // Normalize the URI - ensure it has file:// prefix if it's a local file path
    let normalizedUri = markedImageUri;
    if (markedImageUri && !markedImageUri.startsWith('file://') && !markedImageUri.startsWith('http')) {
      normalizedUri = `file://${markedImageUri}`;
    }
    
    console.log('Normalized attribution URI:', normalizedUri);
    return normalizedUri;
  } catch (error) {
    console.error('Error adding attribution:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    // Return original image if attribution fails
    return imageUri;
  }
}

// Note: For component-based logo compositing when markImage fails,
// use LogoCompositeView from './LogoCompositeView' with react-native-view-shot


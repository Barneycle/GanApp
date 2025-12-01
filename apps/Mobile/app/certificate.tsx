import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as IntentLauncher from 'expo-intent-launcher';
import { EventService, Event } from '../lib/eventService';
import { CertificateService, Certificate as CertificateType } from '../lib/certificateService';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import { saveFileToDownloads } from '../lib/downloadsModule';

interface CertificateData {
  eventId: string;
  eventName: string;
  participantName: string;
  date: string;
  certificateId: string;
  organizer: string;
}

export default function Certificate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [certificate, setCertificate] = useState<CertificateType | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();
  
  const generateInProgressRef = useRef(false);
  const downloadInProgressRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (eventId && user?.id) {
      loadEventData();
    } else if (eventId) {
      setError('Event ID is missing');
      setLoading(false);
    }
  }, [eventId, user?.id]);

  // Get user name from database
  const getUserNameFromDB = async (userId: string): Promise<string> => {
    try {
      const { data: userProfile, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: userId });
      
      if (!rpcError && userProfile) {
        const firstName = userProfile.first_name || '';
        const lastName = userProfile.last_name || '';
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        } else if (firstName) {
          return firstName;
        } else if (lastName) {
          return lastName;
        }
      }
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && authUser && authUser.id === userId) {
        const firstName = authUser.user_metadata?.first_name || '';
        const lastName = authUser.user_metadata?.last_name || '';
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        } else if (firstName) {
          return firstName;
        } else if (lastName) {
          return lastName;
        }
        return authUser.email?.split('@')[0] || 'Participant';
      }
      
      return 'Participant';
    } catch (err) {
      console.error('Error fetching user name from DB:', err);
      return 'Participant';
    }
  };

  // Get name placement from certificate template
  const getNamePlacement = (template: any) => {
    const defaultPlacement = {
      x: 0.5,
      y: 0.5,
      fontSize: 36,
      color: '#000000',
      fontFamily: 'Arial',
      fontWeight: 'bold',
      textAlign: 'center' as const,
    };

    if (!template || !template.content_fields) {
      return defaultPlacement;
    }

    const namePosition = template.content_fields.name_position;
    if (namePosition && typeof namePosition === 'object') {
      return {
        x: namePosition.x !== undefined ? namePosition.x : defaultPlacement.x,
        y: namePosition.y !== undefined ? namePosition.y : defaultPlacement.y,
        fontSize: namePosition.fontSize || defaultPlacement.fontSize,
        color: namePosition.color || defaultPlacement.color,
        fontFamily: namePosition.fontFamily || defaultPlacement.fontFamily,
        fontWeight: namePosition.fontWeight || defaultPlacement.fontWeight,
        textAlign: (namePosition.textAlign || defaultPlacement.textAlign) as 'center' | 'left' | 'right',
      };
    }

    if (typeof namePosition === 'string') {
      try {
        const parsed = JSON.parse(namePosition);
        return {
          x: parsed.x !== undefined ? parsed.x : defaultPlacement.x,
          y: parsed.y !== undefined ? parsed.y : defaultPlacement.y,
          fontSize: parsed.fontSize || defaultPlacement.fontSize,
          color: parsed.color || defaultPlacement.color,
          fontFamily: parsed.fontFamily || defaultPlacement.fontFamily,
          fontWeight: parsed.fontWeight || defaultPlacement.fontWeight,
          textAlign: (parsed.textAlign || defaultPlacement.textAlign) as 'center' | 'left' | 'right',
        };
      } catch (e) {
        console.warn('Failed to parse name_position:', e);
      }
    }

    return defaultPlacement;
  };

  const loadEventData = async () => {
    if (!eventId || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setEligibilityError(null);
      
      // Check if certificate already exists
      const existingCert = await CertificateService.getUserCertificate(user.id, eventId);
      if (existingCert.certificate) {
        console.log('Found existing certificate:', existingCert.certificate.certificate_pdf_url || existingCert.certificate.certificate_png_url);
        setCertificate(existingCert.certificate);
        setIsGenerated(true);
        setShowSuccessMessage(false);
      }

      const eventResult = await EventService.getEventById(eventId);
      
      if (eventResult.error) {
        setError(eventResult.error || 'Failed to load event data');
        setLoading(false);
        return;
      }

      if (eventResult.event) {
        setEvent(eventResult.event);
        
        const participantName = await getUserNameFromDB(user.id);
        const eventDate = new Date(eventResult.event.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const organizer = user?.affiliated_organization || 'GanApp Events';

        const certData: CertificateData = {
          eventId: eventResult.event.id,
          eventName: eventResult.event.title,
          participantName: participantName,
          date: existingCert.certificate ? new Date(existingCert.certificate.completion_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : eventDate,
          certificateId: existingCert.certificate?.certificate_number || `CERT-${Date.now()}`,
          organizer: organizer
        };
        
        setCertificateData(certData);
      }
    } catch (err: any) {
      console.error('Error loading event data:', err);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate certificate (similar to web version)
  const generateCertificateHelper = async (
    userId: string,
    eventId: string,
    participantName: string,
    templateUrl: string
  ) => {
    // Get certificate template metadata
    const templateResult = await CertificateService.getCertificateTemplate(eventId);
    const certificateTemplate = templateResult.template;
    const namePlacement = getNamePlacement(certificateTemplate);

    // Detect template type
    const isImageTemplate = templateUrl.match(/\.(jpg|jpeg|png|gif)$/i) || 
                            (certificateTemplate && certificateTemplate.template_type === 'image');
    const isPdfTemplate = templateUrl.match(/\.pdf$/i) || 
                          (certificateTemplate && certificateTemplate.template_type === 'pdf');

    if (isPdfTemplate) {
      throw new Error('PDF templates are not yet supported on mobile. Please use the web app for PDF certificate generation.');
    }

    // Download template from storage
    let bucket: string | null = null;
    let path: string | null = null;
    let templateBytes: ArrayBuffer;
    
    if (templateUrl.includes('/storage/v1/object/public/')) {
      const urlParts = templateUrl.split('/storage/v1/object/public/');
      if (urlParts.length === 2) {
        const parts = urlParts[1].split('/');
        bucket = parts[0];
        path = parts.slice(1).join('/');
      }
    }
    
    if (bucket && path) {
      const { data: templateData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(path);
        
      if (downloadError || !templateData) {
        throw new Error(downloadError?.message || 'Failed to download template');
      }
      
      const arrayBuffer = await templateData.arrayBuffer();
      templateBytes = arrayBuffer;
    } else {
      // Try fetching directly
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      templateBytes = await response.arrayBuffer();
    }

    // For image templates, we'll need to overlay text
    // Since expo-image-manipulator doesn't support text overlay directly,
    // we'll save the template and note that text overlay needs to be done server-side
    // For now, we'll use the template as-is and let the server handle text overlay
    // Or we can use a workaround with react-native-view-shot
    
    // Save template to local file system
    const templateUri = `${FileSystem.cacheDirectory}certificate_template_${Date.now()}.png`;
    const base64 = btoa(String.fromCharCode(...new Uint8Array(templateBytes)));
    await FileSystem.writeAsStringAsync(templateUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // For now, we'll upload the template as-is
    // In a production app, you'd want to overlay the text using a canvas library
    // or handle it server-side
    const filledBytes = templateBytes;
    const fileExtension = 'png';
    const contentType = 'image/png';

    // Check if certificate already exists
    let existingCert = await CertificateService.getUserCertificate(userId, eventId);
    let certificateRecord: CertificateType;
    let isExistingCertificate = false;
    
    if (existingCert.certificate) {
      certificateRecord = existingCert.certificate;
      isExistingCertificate = true;
    } else {
      const result = await CertificateService.generateCertificate(userId, eventId, 'png');
      
      if (result.error) {
        if (result.error.includes('duplicate key') || result.error.includes('unique constraint')) {
          const retryCert = await CertificateService.getUserCertificate(userId, eventId);
          if (retryCert.certificate) {
            certificateRecord = retryCert.certificate;
            isExistingCertificate = true;
          } else {
            throw new Error('Certificate exists but could not be retrieved');
          }
        } else {
          throw new Error(result.error);
        }
      } else if (result.certificate) {
        certificateRecord = result.certificate;
      } else {
        throw new Error('Failed to create certificate record');
      }
    }

    // Upload filled certificate to generated-certificates bucket
    const certificateNumber = certificateRecord.certificate_number || `CERT-${Date.now()}`;
    const fileName = `${certificateNumber}.${fileExtension}`;
    const filePath = `certificates/${eventId}/${userId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-certificates')
      .upload(filePath, filledBytes, {
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Certificate ${isExistingCertificate ? 'updated' : 'created'} but upload failed: ${uploadError.message}`);
    }

    // Get public URL and update certificate record
    const { data: { publicUrl } } = supabase.storage
      .from('generated-certificates')
      .getPublicUrl(filePath);

    const updateField = isImageTemplate ? 'certificate_png_url' : 'certificate_pdf_url';
    const { error: updateError } = await supabase
      .from('certificates')
      .update({ [updateField]: publicUrl })
      .eq('id', certificateRecord.id);

    if (updateError) {
      console.error('Update error:', updateError);
      // Continue anyway - certificate is uploaded
    }

    return {
      ...certificateRecord,
      [updateField]: publicUrl
    };
  };

  // Generate Certificate
  const generateCertificate = useCallback(async () => {
    if (generateInProgressRef.current) {
      return;
    }
    
    if (!eventId || !user?.id) {
      setError('Missing event ID or user information');
      return;
    }
    
    generateInProgressRef.current = true;
    setIsGenerating(true);
    setError(null);
    setEligibilityError(null);
    
    try {
      // Check if certificate already exists
      const existingCert = await CertificateService.getUserCertificate(user.id, eventId);
      if (existingCert.certificate) {
        setError('Certificate already exists. You can only generate a certificate once. Please use the download button.');
        return;
      }

      // Check eligibility
      const eligibilityCheck = await CertificateService.checkEligibility(user.id, eventId);
      
      if (eligibilityCheck.error) {
        setEligibilityError(eligibilityCheck.error);
        return;
      }

      if (!eligibilityCheck.eligibility?.template_available) {
        setEligibilityError('Certificate template not available. Please contact the event organizer.');
        return;
      }

      if (!eligibilityCheck.eligibility?.eligible) {
        let errorMsg = 'You are not eligible for certificate generation. ';
        if (!eligibilityCheck.eligibility.attendance_verified) {
          errorMsg += 'Attendance not verified. ';
        }
        if (!eligibilityCheck.eligibility.survey_completed) {
          errorMsg += 'Survey not completed. ';
        }
        setEligibilityError(errorMsg);
        return;
      }

      // Get template URL
      if (!event?.certificate_templates_url) {
        setError('Certificate template not available');
        return;
      }

      const templateUrl = event.certificate_templates_url.split(',')[0].trim();

      // Get participant name
      const participantName = await getUserNameFromDB(user.id);

      // Generate certificate
      const generatedCertificate = await generateCertificateHelper(
        user.id,
        eventId,
        participantName,
        templateUrl
      );

      console.log('Certificate generated, URL:', generatedCertificate.certificate_png_url || generatedCertificate.certificate_pdf_url);
      setCertificate(generatedCertificate);
      setIsGenerated(true);
      setShowSuccessMessage(true);
      
      // Update certificate data
      if (certificateData) {
        setCertificateData({
          ...certificateData,
          certificateId: generatedCertificate.certificate_number,
          date: new Date(generatedCertificate.completion_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
      }
    } catch (err: any) {
      console.error('Error generating certificate:', err);
      setError(`Failed to generate certificate: ${err.message || 'Unknown error'}`);
    } finally {
      generateInProgressRef.current = false;
      setIsGenerating(false);
    }
  }, [eventId, user?.id, event, certificateData]);

  // Download Certificate
  const downloadCertificate = useCallback(async () => {
    if (downloadInProgressRef.current) {
      return;
    }
    
    if (!certificate) {
      Alert.alert('Error', 'Certificate not available');
      return;
    }
    
    // Check for both PNG and PDF URLs, prefer PNG if available and valid
    // Only use URL if it's not empty and is a valid Supabase URL
    const pngUrl = certificate.certificate_png_url && 
                   certificate.certificate_png_url.trim() !== '' && 
                   !certificate.certificate_png_url.includes('example.com') &&
                   !certificate.certificate_png_url.includes('placeholder')
                   ? certificate.certificate_png_url : null;
    
    const pdfUrl = certificate.certificate_pdf_url && 
                   certificate.certificate_pdf_url.trim() !== '' && 
                   !certificate.certificate_pdf_url.includes('example.com') &&
                   !certificate.certificate_pdf_url.includes('placeholder')
                   ? certificate.certificate_pdf_url : null;
    
    const certificateUrl = pngUrl || pdfUrl;
    const fileExtension = pngUrl ? 'png' : 'pdf';
    
    console.log('Downloading certificate:', {
      png_url: certificate.certificate_png_url,
      pdf_url: certificate.certificate_pdf_url,
      valid_png: pngUrl,
      valid_pdf: pdfUrl,
      selected_url: certificateUrl,
      extension: fileExtension
    });
    
    if (!certificateUrl) {
      Alert.alert('Error', 'Certificate is not available. The certificate was generated but the file is missing. Please contact support.');
      return;
    }
    
    downloadInProgressRef.current = true;
    setIsDownloading(true);
    
    try {
      // Use FileSystem.downloadAsync for direct download (more reliable in React Native)
      const fileName = `certificate-${certificate.certificate_number || 'certificate'}.${fileExtension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Download file directly to cache directory
      const downloadResult = await FileSystem.downloadAsync(certificateUrl, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download certificate: HTTP ${downloadResult.status}`);
      }
      
      // Handle images and PDFs differently
      if (fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg') {
        // For images, save to media library
        if (!MediaLibrary || !MediaLibrary.requestPermissionsAsync || !MediaLibrary.createAssetAsync) {
          Alert.alert(
            'Error', 
            'Media library not available. Please rebuild the app with native modules enabled.',
            [{ text: 'OK' }]
          );
          return;
        }

        const permissionResult = await MediaLibrary.requestPermissionsAsync(true);
        
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission Required',
            'Please grant photo library access to save the certificate. You can enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }

        const asset = await MediaLibrary.createAssetAsync(fileUri);
        
        // On Android, try to save to Downloads/GanApp folder
        if (Platform.OS === 'android') {
          try {
            const albumName = 'GanApp';
            let album = await MediaLibrary.getAlbumAsync(albumName);
            
            if (!album) {
              album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }
          } catch (albumError) {
            console.log('Album creation error (asset still saved):', albumError);
          }
        }
        
        Alert.alert('Success', 'Certificate downloaded to your Photos folder!');
      } else {
        // For PDFs, use system "Download / Save" dialog (BEST OPTION - works on ALL devices)
        // This is what browsers use - opens system share dialog with "Save" option
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Certificate to Downloads',
            UTI: Platform.OS === 'ios' ? 'com.adobe.pdf' : undefined,
          });
          // On Android, the share dialog includes "Save" or "Download" option
          // On iOS, it allows saving to Files app
        } else {
          Alert.alert('Success', `Certificate downloaded to: ${fileUri}`);
        }
      }
    } catch (err: any) {
      console.error('Error downloading certificate:', err);
      Alert.alert('Error', `Failed to download certificate: ${err.message || 'Unknown error'}`);
    } finally {
      downloadInProgressRef.current = false;
      setIsDownloading(false);
    }
  }, [certificate]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-blue-100 mt-4">Loading certificate data...</Text>
      </SafeAreaView>
    );
  }

  if (error && !certificateData) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center px-4">
        <View className="bg-white rounded-xl p-6 items-center max-w-md">
          <View className="w-16 h-16 rounded-full bg-red-100 mb-4 items-center justify-center">
            <Ionicons name="alert-circle" size={32} color="#dc2626" />
          </View>
          <Text className="text-red-800 text-lg mb-6 text-center">{error}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-600 px-6 py-4 rounded-xl"
          >
            <Text className="text-white font-semibold text-base">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!certificateData) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <View className="flex-1 mx-4 my-2">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ 
            paddingVertical: 20,
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 20) + 80
          }}
          showsVerticalScrollIndicator={false}
        >
          {showSuccessMessage && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#059669" style={{ marginRight: 12 }} />
                <Text className="text-green-800 font-medium">Certificate generated successfully!</Text>
              </View>
            </View>
          )}

          <View className="bg-white rounded-xl shadow-md p-6 mb-8">
            <View className="items-center mb-6">
              <Text className="text-xl sm:text-2xl font-bold text-gray-800 text-center">Certificate of Participation</Text>
            </View>

            <View className="space-y-4 sm:space-y-5">
              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Event Name</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.eventName}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Participant</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.participantName}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Date</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.date}</Text>
              </View>

              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base text-gray-600 mb-2">Organizer</Text>
                <Text className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.organizer}</Text>
              </View>

              <View>
                <Text className="text-base text-gray-600 mb-2">Certificate ID</Text>
                <Text className="text-base font-mono text-gray-500">{certificateData.certificateId}</Text>
              </View>
            </View>
          </View>

          {eligibilityError && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color="#d97706" style={{ marginRight: 12 }} />
                <Text className="text-yellow-800 text-sm flex-1">{eligibilityError}</Text>
              </View>
            </View>
          )}

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#dc2626" style={{ marginRight: 12 }} />
                <Text className="text-red-800 text-sm flex-1">{error}</Text>
              </View>
            </View>
          )}

          {!isGenerated ? (
            <TouchableOpacity
              onPress={generateCertificate}
              disabled={isGenerating || generateInProgressRef.current}
              className={`w-full py-5 rounded-lg items-center justify-center mb-6 ${
                isGenerating ? 'bg-green-400' : 'bg-green-600'
              }`}
            >
              <View className="flex-row items-center justify-center">
                {isGenerating && (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 12 }} />
                )}
                <Text className="text-white text-lg font-semibold">
                  {isGenerating ? 'Generating Certificate...' : 'Generate Certificate'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="space-y-4 mb-6">
              <TouchableOpacity
                onPress={downloadCertificate}
                disabled={isDownloading || downloadInProgressRef.current}
                className={`w-full py-5 rounded-lg items-center justify-center ${
                  isDownloading ? 'bg-green-400' : 'bg-green-500'
                }`}
                style={{ minHeight: 56 }}
              >
                <View className="flex-row items-center justify-center">
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 12 }} />
                  ) : (
                    <Ionicons name="download" size={24} color="white" style={{ marginRight: 12 }} />
                  )}
                  <Text className="text-white text-lg font-semibold">
                    {isDownloading ? 'Downloading...' : 'Download Certificate'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View className="space-y-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-full py-5 bg-blue-800 rounded-lg items-center justify-center"
            >
              <Text className="text-white text-lg font-semibold">Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

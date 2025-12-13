import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as ExpoClipboard from 'expo-clipboard';
let Clipboard: any = ExpoClipboard;
let MediaLibrary: any = null;
try {
  MediaLibrary = require('expo-media-library');
} catch (e) {
  console.log('expo-media-library not available:', e);
}
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { saveFileToGanApp } from '../lib/mediaStoreSaver';
import { generateQRCodeID, formatQRCodeID } from '../lib/qrCodeUtils';
import { Platform } from 'react-native';

export default function QRGenerator() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const eventId = params.eventId as string;
  const eventTitle = params.eventTitle as string;
  const eventDate = params.eventDate as string;
  const eventTime = params.eventTime as string;
  const eventVenue = params.eventVenue as string;

  const qrCodeViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrCodeToken, setQrCodeToken] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (eventId && user?.id) {
      generateEventQRCode();
    }
  }, [eventId, user?.id]);

  const generateEventQRCode = async () => {
    if (!user?.id || !eventId) return;

    try {
      setLoading(true);
      setError(null);

      // Create QR data for event registration
      const qrData = {
        eventId: eventId,
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        venue: eventVenue,
        userId: user.id,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        type: 'event_registration',
      };

      // Create a unique 8-character QR code ID
      const qrCodeID = generateQRCodeID();

      // Check if QR code already exists for this user+event combination
      // Check both created_by and owner_id to find QR codes created from either web or mobile
      const { data: existingQRs, error: fetchError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('event_id', eventId)
        .eq('code_type', 'event_checkin')
        .or(`created_by.eq.${user.id},owner_id.eq.${user.id}`)
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      const existingQR = existingQRs && existingQRs.length > 0 ? existingQRs[0] : null;

      if (existingQR) {
        // Update existing QR code
        const { data, error } = await supabase
          .from('qr_codes')
          .update({
            qr_data: qrData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingQR.id)
          .select();

        if (error) throw error;

        // If existing token is not 8 characters, generate a new random one and update
        let finalToken = existingQR.qr_token;
        if (!finalToken || finalToken.length !== 8) {
          finalToken = generateQRCodeID();
          await supabase
            .from('qr_codes')
            .update({ qr_token: finalToken })
            .eq('id', existingQR.id);
        }
        setQrCodeToken(finalToken);
        setQrCodeData(JSON.stringify(qrData));
      } else {
        // Create new QR code
        const { data, error } = await supabase
          .from('qr_codes')
          .insert({
            code_type: 'event_checkin',
            title: `${eventTitle} - Check-in QR Code`,
            description: `QR code for event check-in: ${eventTitle}`,
            created_by: user.id,
            owner_id: user.id,
            event_id: eventId,
            qr_data: qrData,
            qr_token: qrCodeID,
            is_active: true,
            is_public: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();

        if (error) throw error;
        const qrRecord = data && data.length > 0 ? data[0] : null;
        setQrCodeToken(qrRecord?.qr_token || qrCodeID);
        setQrCodeData(JSON.stringify(qrData));
      }
    } catch (err: any) {
      console.error('Error generating event QR code:', err);
      setError(`Failed to generate QR code: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = async () => {
    if (!qrCodeViewRef.current) {
      toast.error('QR code not available');
      return;
    }

    if (downloading) {
      return; // Prevent multiple simultaneous downloads
    }

    try {
      setDownloading(true);
      toast.info('Preparing download...');

      if (!FileSystem.cacheDirectory) {
        toast.error('File system not available. Please rebuild the app.');
        setDownloading(false);
        return;
      }

      const sanitizedTitle = (eventTitle || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}_qr_code.png`;

      // Capture the entire ViewShot (includes the styled card with QR code, name, and ID)
      const uri = await captureRef(qrCodeViewRef.current, {
        format: 'png',
        quality: 1.0,
      });

      if (!uri) {
        throw new Error('Failed to capture QR code');
      }

      const assetUri = uri.startsWith('file://') ? uri : `file://${uri}`;

      if (Platform.OS === 'ios') {
        if (!MediaLibrary || !MediaLibrary.requestPermissionsAsync || !MediaLibrary.createAssetAsync) {
          toast.error('Media library not available. Please rebuild the app with native modules enabled.');
          setDownloading(false);
          return;
        }

        const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();

        if (status === 'denied' && !canAskAgain) {
          toast.warning('Photo library access is required. Please enable it in your device settings.');
          setDownloading(false);
          return;
        }

        if (status !== 'granted') {
          const { status: newStatus } = await MediaLibrary.requestPermissionsAsync(false);
          if (newStatus !== 'granted') {
            toast.warning('Please grant photo library access to save the QR code.');
            setDownloading(false);
            return;
          }
        }

        const asset = await MediaLibrary.createAssetAsync(assetUri);
        const album = await MediaLibrary.getAlbumAsync('GanApp');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('GanApp', asset, false);
        }
        toast.success('QR code saved to your Photos/GanApp album!');
      } else {
        // Android
        await saveFileToGanApp(assetUri, filename, 'png');
        toast.success('QR code saved to your Downloads/GanApp folder!');
      }
    } catch (err: any) {
      console.error('Error downloading QR code:', err);
      toast.error(err.message || 'Unable to download QR code. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleCopyID = async () => {
    if (!qrCodeToken) return;

    const idToCopy = formatQRCodeID(qrCodeToken).replace(/-/g, '');
    
    try {
      await ExpoClipboard.setStringAsync(idToCopy);
      toast.success('ID copied!');
    } catch (err: any) {
      console.error('Clipboard error:', err);
      
      // If native module error, the app needs to be rebuilt
      if (err.message?.includes('native module') || err.message?.includes('ExpoClipboard') || err.message?.includes('Cannot find native module')) {
        toast.error(`App needs rebuild for copy.\nID: ${idToCopy}\n\nRun: npx expo run:android`);
      } else {
        toast.error('Failed to copy. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#1e3a8a' }}>
      <View className="flex-1" style={{ backgroundColor: '#1e3a8a' }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 py-3"
          style={{ 
            paddingTop: insets.top + 8,
            backgroundColor: '#1e3a8a',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold" style={{ color: '#ffffff' }}>Event QR Code</Text>
          <View className="w-10" />
        </View>

        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ 
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 20) + 20
          }}
        >
          {loading && (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="mt-4" style={{ color: '#ffffff' }}>Generating QR code...</Text>
            </View>
          )}

          {error && !loading && (
            <View className="items-center py-12">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="alert-circle" size={32} color="#dc2626" />
              </View>
              <Text className="text-red-600 mb-4 text-center">{error}</Text>
              <TouchableOpacity onPress={generateEventQRCode} className="bg-blue-600 px-6 py-3 rounded-lg">
                <Text className="text-white font-medium">Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {qrCodeData && !loading && !error && (
            <View>
              <ViewShot
                ref={qrCodeViewRef}
                options={{ format: 'png', quality: 1.0 }}
                style={{
                  backgroundColor: '#0f172a',
                  borderRadius: 24,
                  padding: 24,
                  marginBottom: 24,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 24,
                    opacity: 0.1,
                    backgroundColor: '#1e40af',
                  }}
                />

                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 20,
                    width: '100%',
                    maxWidth: 320,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    {qrCodeData && (
                      <QRCode
                        value={qrCodeData}
                        size={240}
                        color="#1e3a8a"
                        backgroundColor="#ffffff"
                        quietZone={8}
                        enableLinearGradient={true}
                        linearGradient={['#3b82f6', '#1e40af', '#1e3a8a']}
                        gradientDirection={['0', '0', '240', '240']}
                      />
                    )}
                  </View>

                  {user && (
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#000000',
                        marginTop: 8,
                        marginBottom: 4,
                      }}
                    >
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email?.split('@')[0] || 'User'}
                    </Text>
                  )}

                  <Text
                    style={{
                      fontSize: 14,
                      color: '#64748b',
                      textAlign: 'center',
                      marginBottom: 16,
                    }}
                  >
                    {eventTitle}
                  </Text>

                  {qrCodeToken && (
                    <View
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#e2e8f0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: '#64748b',
                          marginBottom: 8,
                          textAlign: 'center',
                          fontWeight: '500',
                        }}
                      >
                        Manual Entry ID
                      </Text>
                      <TouchableOpacity
                        onPress={handleCopyID}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          borderRadius: 8,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            color: '#1e3a8a',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            letterSpacing: 3,
                          }}
                          selectable={true}
                        >
                          {formatQRCodeID(qrCodeToken)}
                        </Text>
                        <Ionicons name="copy-outline" size={16} color="#1e3a8a" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 9,
                          color: '#94a3b8',
                          marginTop: 6,
                          textAlign: 'center',
                        }}
                      >
                        Tap to copy • Use if camera doesn't work
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    marginTop: 16,
                    textAlign: 'center',
                  }}
                >
                  Scan for event check-in
                </Text>
              </ViewShot>

              <View className="bg-blue-50 rounded-xl p-4 mb-4">
                <Text className="font-semibold text-gray-800 mb-2">{eventTitle}</Text>
                <View className="space-y-1">
                  {eventDate && (
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-gray-600 ml-2">{formatDate(eventDate)}</Text>
                    </View>
                  )}
                  {eventTime && (
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-gray-600 ml-2">{formatTime(eventTime)}</Text>
                    </View>
                  )}
                  {eventVenue && (
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-gray-600 ml-2">{eventVenue}</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={downloadQRCode}
                disabled={downloading}
                style={{
                  backgroundColor: '#16a34a',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                {downloading ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '500', marginLeft: 8 }}>
                      Downloading...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '500', marginLeft: 8 }}>
                      Download PNG
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}


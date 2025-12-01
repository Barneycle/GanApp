import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Camera,
  getCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { QRScanService, QRScanResult } from '../../lib/qrScanService';
import { ParticipantService } from '../../lib/participantService';
import { useAuth } from '../../lib/authContext';
import TutorialOverlay from '../../components/TutorialOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_SIZE = SCREEN_WIDTH * 0.85;

export default function QRScanner() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, cameraType);
  const activeDevice = device || devices.find(d => d.position === 'back') || devices[0];

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        if (hasPermission === false) {
          const granted = await requestPermission();
          if (!granted) {
            setError('Camera permission is required to scan QR codes.');
          }
        }
      } catch (err) {
        setError('Failed to initialize camera.');
      } finally {
        setIsInitializing(false);
      }
    };

    if (activeDevice) {
      init();
    } else {
      setError('No camera available on this device.');
      setIsInitializing(false);
    }
  }, [hasPermission, requestPermission, activeDevice]);

  // Scanning line animation
  useEffect(() => {
    if (hasPermission && activeDevice && !isProcessing) {
      const lineHeight = 2;
      const maxTranslateY = SCAN_SIZE - lineHeight; // Ensures line reaches bottom edge
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: maxTranslateY,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [hasPermission, activeDevice, isProcessing, scanLineAnim]);

  const showSuccess = () => {
    Animated.sequence([
      Animated.spring(successAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
      }),
      Animated.delay(500),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleQRScan = useCallback(
    async (qrData: string) => {
      if (isProcessing) return;

      setIsProcessing(true);
      showSuccess();

      try {
        const deviceInfo = {
          platform: Platform.OS,
          version: Platform.Version.toString(),
        };

        const userId = user?.id || '00000000-0000-0000-0000-000000000000';
        const result: QRScanResult = await QRScanService.processQRScan(
          qrData,
          userId,
          deviceInfo
        );

        setIsProcessing(false);

        if (result.success && result.event) {
          const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

          if (isOrganizer) {
            try {
              let participantId: string | null = null;
              try {
                const parsed = JSON.parse(qrData);
                participantId = parsed.userId || parsed.id;
              } catch {
                participantId = qrData;
              }

              if (participantId) {
                const participant = await ParticipantService.getParticipantInfo(
                  participantId,
                  result.event.id
                );

                if (participant) {
                  router.push({
                    pathname: '/participant-details',
                    params: {
                      participantId: participant.id,
                      eventId: result.event.id,
                      eventTitle: result.event.title,
                    },
                  });
                  return;
                }
              }
            } catch (err) {
              console.error('Error fetching participant:', err);
            }
          }

          Alert.alert(
            'Check-in Successful!',
            `Event: ${result.event.title}\n\n${result.message}`,
            [
              {
                text: 'Continue to Survey',
                onPress: () => {
                  router.push({
                    pathname: '/survey',
                    params: {
                      eventId: result.event!.id,
                      eventTitle: result.event!.title,
                      attendanceLogId: result.attendanceLog?.id,
                    },
                  });
                },
              },
              { text: 'Done', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('Check-in Failed', result.message || result.error || 'Unable to process QR code');
        }
      } catch (err) {
        setIsProcessing(false);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    },
    [isProcessing, user, router]
  );

  // Calculate frame position (centered in available space)
  // Account for header and safe area
  const headerHeight = insets.top + 50; // Header + padding
  const bottomPadding = Math.max(insets.bottom, 20) + 60; // Bottom safe area + text
  const availableHeight = SCREEN_HEIGHT - headerHeight - bottomPadding;
  const frameLeft = (SCREEN_WIDTH - SCAN_SIZE) / 2;
  const frameTop = headerHeight + (availableHeight - SCAN_SIZE) / 2;
  const frameRight = frameLeft + SCAN_SIZE;
  const frameBottom = frameTop + SCAN_SIZE;

  // Calculate region of interest for faster scanning (normalized 0-1 coordinates)
  const regionOfInterest = {
    x: frameLeft / SCREEN_WIDTH,
    y: frameTop / SCREEN_HEIGHT,
    width: SCAN_SIZE / SCREEN_WIDTH,
    height: SCAN_SIZE / SCREEN_HEIGHT,
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    regionOfInterest: regionOfInterest,
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value && !isProcessing) {
        handleQRScan(codes[0].value);
      }
    },
  });

  // Loading
  if (isInitializing) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-blue-100 text-lg font-medium mt-4">Initializing Camera</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error states
  if (hasPermission === false || error) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 bg-red-600 rounded-full items-center justify-center mb-6">
            <Ionicons name="camera" size={40} color="white" />
          </View>
          <Text className="text-white text-xl font-bold mb-3 text-center">
            Camera Access Required
          </Text>
          <Text className="text-white text-center mb-8 opacity-80 leading-6">
            {error || 'Camera permission is required to scan QR codes.'}
          </Text>

          <View className="w-full max-w-sm space-y-3">
            <TouchableOpacity
              onPress={async () => {
                setIsInitializing(true);
                setError(null);
                const granted = await requestPermission();
                if (!granted) {
                  setError('Camera permission denied. Please enable it in Settings.');
                }
                setIsInitializing(false);
              }}
              className="bg-blue-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Grant Permission</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              className="bg-slate-700 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // No device
  if (!activeDevice) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 bg-red-600 rounded-full items-center justify-center mb-6">
            <Ionicons name="camera" size={40} color="white" />
          </View>
          <Text className="text-white text-xl font-bold mb-3 text-center">
            Camera Not Available
          </Text>
          <Text className="text-white text-center opacity-80">
            No camera found on this device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main camera view
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <TutorialOverlay
        screenId="qrscanner"
        steps={[
          {
            id: '1',
            title: 'QR Code Scanner',
            description: 'Use this scanner to check in participants at events. Point the camera at a participant\'s QR code to scan it.',
          },
          {
            id: '2',
            title: 'How to Scan',
            description: 'Position the QR code within the scanning frame. The app will automatically detect and scan the code. Make sure there\'s good lighting.',
          },
          {
            id: '3',
            title: 'Check-in Results',
            description: 'After scanning, you\'ll see the participant\'s details and can mark them as checked in for the event.',
          },
        ]}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header - camera flip button only */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingTop: insets.top + 8,
            zIndex: 100,
          }}
        >
          <TouchableOpacity
            onPress={() => setCameraType(prev => prev === 'back' ? 'front' : 'back')}
            style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="camera-reverse" size={32} color="white" />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <View style={StyleSheet.absoluteFill}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={activeDevice}
            isActive={true}
            codeScanner={codeScanner}
          />

          {/* Dimmed overlay - 4 rectangles covering everything except scanning area */}
          <View className="absolute inset-0" pointerEvents="none" style={{ zIndex: 1 }}>
          {/* Top dimmed area */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: frameTop,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          />
          {/* Bottom dimmed area - covers from frame bottom to screen bottom, but leaves space for text */}
          <View
            style={{
              position: 'absolute',
              bottom: 100, // Leave space for bottom text
              left: 0,
              right: 0,
              top: frameBottom,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          />
          {/* Left dimmed area */}
          <View
            style={{
              position: 'absolute',
              top: frameTop,
              left: 0,
              width: frameLeft,
              height: SCAN_SIZE,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          />
          {/* Right dimmed area */}
          <View
            style={{
              position: 'absolute',
              top: frameTop,
              right: 0,
              width: SCREEN_WIDTH - frameRight,
              height: SCAN_SIZE,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          />
          </View>

          {/* Message above scanning frame - on top of dimmed overlay */}
          <View
            style={{
              position: 'absolute',
              top: frameTop - 50,
              left: 0,
              right: 0,
              alignItems: 'center',
              paddingHorizontal: 24,
              zIndex: 10,
            }}
            pointerEvents="none"
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
                textShadowColor: 'rgba(0, 0, 0, 0.75)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              Align QR code within the frame
            </Text>
          </View>

          {/* Scanning frame overlay */}
          <View
            className="absolute justify-center items-center"
            style={{
              left: frameLeft,
              top: frameTop,
              width: SCAN_SIZE,
              height: SCAN_SIZE,
            }}
            pointerEvents="none"
          >
          {/* Corner brackets */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 40,
              height: 40,
              borderTopWidth: 4,
              borderLeftWidth: 4,
              borderColor: '#ffffff',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 40,
              height: 40,
              borderTopWidth: 4,
              borderRightWidth: 4,
              borderColor: '#ffffff',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 40,
              height: 40,
              borderBottomWidth: 4,
              borderLeftWidth: 4,
              borderColor: '#ffffff',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 40,
              height: 40,
              borderBottomWidth: 4,
              borderRightWidth: 4,
              borderColor: '#ffffff',
            }}
          />

          {/* Scanning line */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: '#ffffff',
              transform: [{ translateY: scanLineAnim }],
            }}
          />

          {/* Success flash */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              opacity: successAnim,
            }}
          />

          {/* Processing overlay */}
          {isProcessing && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="text-white mt-4 font-medium">Processing...</Text>
            </View>
          )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

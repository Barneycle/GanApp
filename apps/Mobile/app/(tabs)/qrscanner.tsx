import React, { useState, useRef, useCallback, useEffect } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Camera,
  getCameraDevice,
  useCameraDevices,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import { supabase } from "../../lib/supabase";
import { QRScanService, QRScanResult } from "../../lib/qrScanService";
import { ParticipantService } from "../../lib/participantService";
import { useAuth } from "../../lib/authContext";

export default function QRScanner() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<"front" | "back">("back");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const router = useRouter();
  const { user } = useAuth();
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, cameraType);

  // Animation values
  const scanningLineAnim = useRef(new Animated.Value(0)).current;
  const cornerPulseAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const successOpacityAnim = useRef(new Animated.Value(0)).current;
  const processingSpinnerAnim = useRef(new Animated.Value(0)).current;

  // Start scanning animation when camera is active
  useEffect(() => {
    if (showCamera && hasPermission) {
      // Scanning line animation (moves up and down)
      const scanningAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanningLineAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scanningLineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );

      // Corner pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(cornerPulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(cornerPulseAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );

      scanningAnimation.start();
      pulseAnimation.start();

      return () => {
        scanningAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [showCamera, hasPermission, scanningLineAnim, cornerPulseAnim]);

  // Start processing spinner animation
  useEffect(() => {
    if (isProcessing) {
      const spinnerAnimation = Animated.loop(
        Animated.timing(processingSpinnerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinnerAnimation.start();
      return () => spinnerAnimation.stop();
    }
  }, [isProcessing, processingSpinnerAnim]);

  // Trigger success animation when QR is successfully scanned
  const triggerSuccessAnimation = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(successScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(successOpacityAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(successOpacityAnim, {
        toValue: 0,
        duration: 500,
        delay: 800,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => {
      successScaleAnim.setValue(0);
    });
  };

  // Safety check for device availability and get best available device
  const getBestAvailableDevice = () => {
    if (devices.length === 0) {
      return null;
    }
    
    // Try to get back camera first (better for QR scanning)
    const backDevice = devices.find(d => d.position === 'back');
    if (backDevice) {
      return backDevice;
    }
    
    // Fallback to any available device
    return devices[0];
  };

  const bestDevice = getBestAvailableDevice();
  const activeDevice = device || bestDevice;

  // Safety check for device availability
  if (!activeDevice) {
    console.warn('No camera device available');
  }

  // Automatically request permission and open camera when component mounts
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        setCameraError(null);
        
        if (hasPermission === false) {
          // Automatically request permission if not granted
          const permission = await requestPermission();
          if (permission) {
            // If permission granted, automatically open camera
            setShowCamera(true);
          } else {
            setCameraError('Camera permission denied. Please enable camera access in Settings to scan QR codes.');
          }
        } else if (hasPermission === true) {
          // If permission already granted, automatically open camera
          setShowCamera(true);
        }
      } catch (error) {
        console.error('Error initializing camera:', error);
        setCameraError('Camera functionality is not available. This may be due to device restrictions or policies.');
      } finally {
        setIsInitializing(false);
      }
    };

    // Only initialize if we have a valid device
    if (activeDevice) {
      initializeCamera();
    } else {
      setCameraError('No camera device found on this device.');
      setIsInitializing(false);
    }
  }, [hasPermission, requestPermission, activeDevice]);

  const handleBarCodeScanned = useCallback(
    async (data: string) => {
      if (isScanning || isProcessing) return;
      
      setIsScanning(true);
      setIsProcessing(true);

      // Safety timeout to reset states if something goes wrong
      const resetTimeout = setTimeout(() => {
        setIsScanning(false);
        setIsProcessing(false);
      }, 10000); // 10 second timeout

      try {
        // Get device information
        const deviceInfo = {
          platform: Platform.OS,
          version: Platform.Version.toString(),
          model: Platform.select({
            ios: 'iOS Device',
            android: 'Android Device',
            default: 'Unknown'
          })
        };

        // For testing: use a dummy UUID if no user is logged in
        const userId = user?.id || '00000000-0000-0000-0000-000000000000';

        // Process QR scan with database logic
        const result: QRScanResult = await QRScanService.processQRScan(
          data,
          userId,
          deviceInfo
        );

        if (result.success) {
          // Clear the safety timeout since we're handling the result
          clearTimeout(resetTimeout);
          
          // Trigger success animation
          triggerSuccessAnimation();
          
          // Check if the current user is an organizer
          const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
          console.log('Complete user object:', user);
          console.log('User role:', user?.role, 'Is organizer:', isOrganizer);
          
          if (isOrganizer && result.event) {
            console.log('Showing participant modal for organizer');
            
            // For organizers, show participant information modal
            try {
              // Extract participant ID from QR data
              let participantId: string | null = null;
              try {
                const parsedData = JSON.parse(data);
                participantId = parsedData.userId || parsedData.id;
                console.log('Parsed participant ID from JSON:', participantId);
              } catch {
                participantId = data; // If not JSON, treat as user ID
                console.log('Using QR data as participant ID:', participantId);
              }
              
              if (participantId) {
                console.log('Fetching participant info for ID:', participantId, 'Event:', result.event.id);
                // Fetch participant information
                const participant = await ParticipantService.getParticipantInfo(participantId, result.event.id);
                console.log('Participant info fetched:', participant);
                
                if (participant) {
                  console.log('Navigating to participant details screen');
                  setIsScanning(false);
                  setIsProcessing(false);
                  router.push({
                    pathname: '/participant-details',
                    params: {
                      participantId: participant.id,
                      eventId: result.event.id,
                      eventTitle: result.event.title,
                    },
                  });
                  return;
                } else {
                  console.log('No participant found, falling back to regular message');
                }
              } else {
                console.log('No participant ID found');
              }
            } catch (error) {
              console.error('Error fetching participant info:', error);
            }
          } else {
            console.log('Not an organizer or no event, showing regular message');
          }
          
          // For non-organizers or if participant info fetch failed, show regular success message
          const eventDate = new Date(result.event!.start_date).toLocaleDateString();
          const eventTime = result.event!.start_time;
          
          Alert.alert(
            "Check-in Successful!",
            `Event: ${result.event!.title}\nDate: ${eventDate}\nTime: ${eventTime}\nVenue: ${result.event!.venue}\n\n${result.message}`,
            [
              {
                text: "Continue to Survey",
                onPress: () => {
                  setIsScanning(false);
                  setIsProcessing(false);
                  router.push({
                    pathname: "/survey",
                    params: { 
                      eventId: result.event!.id, 
                      eventTitle: result.event!.title,
                      attendanceLogId: result.attendanceLog?.id
                    },
                  });
                },
              },
              {
                text: "Done",
                style: "cancel",
                onPress: () => {
                  setIsScanning(false);
                  setIsProcessing(false);
                }
              }
            ]
          );
        } else {
          // Clear the safety timeout since we're handling the result
          clearTimeout(resetTimeout);
          
          // Show error message
          Alert.alert(
            "Check-in Failed",
            result.message || result.error || "Unable to process QR code",
            [
              { 
                text: "OK", 
                onPress: () => {
                  setIsScanning(false);
                  setIsProcessing(false);
                }
              }
            ]
          );
        }
      } catch (error) {
        // Clear the safety timeout since we're handling the error
        clearTimeout(resetTimeout);
        
        Alert.alert(
          "Error", 
          "An unexpected error occurred. Please try again.", 
          [
            { 
              text: "OK", 
              onPress: () => {
                setIsScanning(false);
                setIsProcessing(false);
              }
            }
          ]
        );
      }
    },
    [isScanning, isProcessing, user, router]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "code-128", "code-39"],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        handleBarCodeScanned(codes[0].value);
      }
    },
  });

  const toggleCamera = () => {
    setShowCamera(!showCamera);
  };

  const toggleCameraType = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  // Show loading state during initialization
  if (isInitializing || hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <View className="items-center">
          <View className="w-16 h-16 bg-blue-600 rounded-full items-center justify-center mb-6">
            <Ionicons name="camera" size={32} color="white" />
          </View>
          <Text className="text-white text-lg font-semibold mb-2">
            {hasPermission === null ? 'Requesting Camera Access' : 'Initializing Camera'}
          </Text>
          <Text className="text-white text-center opacity-80">
            {hasPermission === null 
              ? 'Please wait while we request camera permissions...' 
              : 'Setting up QR scanner...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <View className="items-center">
          <View className="w-20 h-20 bg-red-500 rounded-full items-center justify-center mb-6">
            <Ionicons name="camera" size={40} color="white" />
          </View>
          <Text className="text-white text-xl font-bold mb-4 text-center">
            Camera Access Required
          </Text>
          <Text className="text-white text-center mb-6 opacity-80 leading-6">
            This app needs camera access to scan QR codes. Please enable camera
            permissions in your device settings.
          </Text>

          <View className="space-y-3 w-full">
            <TouchableOpacity
              onPress={async () => {
                setIsInitializing(true);
                const permission = await requestPermission();
                if (permission) {
                  setShowCamera(true);
                }
                setIsInitializing(false);
              }}
              className="bg-blue-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openSettings}
              className="bg-slate-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">
                Open Settings
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show camera error state
  if (cameraError) {
    const isRestricted = cameraError.includes('restricted') || cameraError.includes('device policy');
    
    return (
      <SafeAreaView className="flex-1 bg-blue-900 justify-center items-center px-6">
        <View className="items-center">
          <View className="w-20 h-20 bg-red-500 rounded-full items-center justify-center mb-6">
            <Ionicons name={isRestricted ? "lock-closed" : "warning"} size={40} color="white" />
          </View>
          <Text className="text-white text-xl font-bold mb-4 text-center">
            {isRestricted ? 'Camera Restricted' : 'Camera Not Available'}
          </Text>
          <Text className="text-blue-100 text-center mb-6 leading-6">
            {cameraError}
          </Text>
          
          {isRestricted && (
            <View className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-50 rounded-xl p-4 mb-6">
              <Text className="text-red-100 text-sm text-center leading-5">
                📱 This is typically caused by device management policies or parental controls. 
                Contact your device administrator to enable camera access.
              </Text>
            </View>
          )}

          <View className="space-y-3 w-full">
            {!isRestricted && (
              <TouchableOpacity
                onPress={() => {
                  setCameraError(null);
                  setIsInitializing(true);
                  // Retry initialization
                  const initializeCamera = async () => {
                    try {
                      if (!hasPermission) {
                        const permission = await requestPermission();
                        if (permission) {
                          setShowCamera(true);
                        } else {
                          setCameraError('Camera permission denied. Please enable camera access in Settings to scan QR codes.');
                        }
                      } else if (hasPermission) {
                        setShowCamera(true);
                      }
                    } catch (error) {
                      setCameraError('Camera functionality is not available. This may be due to device restrictions or policies.');
                    } finally {
                      setIsInitializing(false);
                    }
                  };
                  initializeCamera();
                }}
                className="bg-blue-700 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">
                  Try Again
                </Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show camera automatically when permission is granted and device is available
  if (hasPermission === true && activeDevice) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        {/* Camera Header */}
        <View className="flex-row items-center justify-between p-6 pt-12 bg-black rounded-2xl mb-6 mx-4 z-10 absolute top-0 left-0 right-0">
          <View className="w-10" />

          <View className="flex-row items-center">
            <Ionicons name="camera" size={18} color="white" />
            <Text className="text-white text-lg font-bold ml-3">
              Camera Scanner
            </Text>
          </View>

          <TouchableOpacity
            onPress={toggleCameraType}
            className="w-10 h-10 bg-white bg-opacity-90 rounded-full items-center justify-center shadow-lg"
          >
            <Ionicons name="camera-reverse" size={20} color="#1e3a8a" />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <View className="flex-1 mt-24">
          <Camera
            ref={cameraRef}
            style={{ flex: 1 }}
            device={activeDevice}
            isActive={showCamera}
            codeScanner={codeScanner}
            enableZoomGesture={false}
            enableFpsGraph={false}
            enableDepthData={false}
            enablePortraitEffectsMatteDelivery={false}
            enableBufferCompression={true}
            photoQualityBalance="speed"
            videoStabilizationMode="off"
            pixelFormat="yuv"
            onError={(error) => {
              console.error('Camera error:', error);
              
              // Check for specific camera restriction errors
              const errorMessage = error.message || error.toString();
              
              if (errorMessage.includes('restricted') || errorMessage.includes('is-restricted')) {
                setCameraError(
                  'The camera is restricted by device policies (e.g., MDM or parental controls). ' +
                  'Please contact your administrator or remove the restriction to use this feature.'
                );
              } else if (errorMessage.includes('permission') || errorMessage.includes('permission-denied')) {
                setCameraError('Camera permission is required to scan QR codes. Please enable camera access in device settings.');
              } else {
                setCameraError(`Camera error: ${errorMessage}`);
              }
            }}
          />

          {/* Camera Overlay */}
          <View className="absolute inset-0 justify-center items-center pointer-events-none">
            {/* Scanner Frame */}
            <View className="w-64 h-64 relative border-4 border-white rounded-lg" 
                style={{ 
                  shadowColor: '#000', 
                  shadowOffset: { width: 0, height: 0 }, 
                  shadowOpacity: 0.6, 
                  shadowRadius: 25,
                  elevation: 15,
                }}>
              {/* Corner Indicators with Pulse Animation */}
              <Animated.View 
                className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 rounded-tl-lg"
                style={{
                  borderColor: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgb(37, 99, 235)', 'rgb(59, 130, 246)']
                  }),
                  opacity: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.6]
                  })
                }}
              />
              <Animated.View 
                className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 rounded-tr-lg"
                style={{
                  borderColor: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgb(37, 99, 235)', 'rgb(59, 130, 246)']
                  }),
                  opacity: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.6]
                  })
                }}
              />
              <Animated.View 
                className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 rounded-bl-lg"
                style={{
                  borderColor: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgb(37, 99, 235)', 'rgb(59, 130, 246)']
                  }),
                  opacity: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.6]
                  })
                }}
              />
              <Animated.View 
                className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 rounded-br-lg"
                style={{
                  borderColor: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgb(37, 99, 235)', 'rgb(59, 130, 246)']
                  }),
                  opacity: cornerPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.6]
                  })
                }}
              />

              {/* Animated Scanning Line */}
              <Animated.View 
                className="absolute left-0 right-0"
                style={{
                  transform: [{
                    translateY: scanningLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 220]
                    })
                  }]
                }}
              >
                <View className="h-0.5 bg-blue-600 shadow-lg shadow-blue-600/50" />
                <View className="h-1 w-1 bg-blue-500 rounded-full mx-auto -mt-0.5" />
              </Animated.View>

              {/* Success Animation Overlay */}
              {isScanning && (
                <Animated.View
                  className="absolute inset-0 bg-green-500 bg-opacity-20 justify-center items-center"
                  style={{
                    opacity: successOpacityAnim,
                    transform: [{
                      scale: successScaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }]
                  }}
                >
                  <View className="bg-green-500 rounded-full p-3">
                    <Ionicons name="checkmark" size={48} color="white" />
                  </View>
                </Animated.View>
              )}

              {/* Processing Overlay */}
              {isProcessing && (
                <View className="absolute inset-0 bg-black bg-opacity-60 justify-center items-center rounded-lg">
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: processingSpinnerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }]
                    }}
                  >
                    <Ionicons name="refresh" size={48} color="white" />
                  </Animated.View>
                  <Text className="text-white mt-4 font-semibold">Processing...</Text>
                </View>
              )}
            </View>

            {/* Instructions */}
            <View className="items-center mt-8 px-4">
            <Text className="text-white text-center text-lg font-semibold mb-3">
              {isProcessing ? 'Processing QR Code...' : 'Position QR Code in Frame'}
            </Text>
            <Text className="text-white text-base opacity-80 mb-4 text-center">
              {isProcessing 
                ? 'Please wait while we verify your registration'
                : 'Hold your device steady to scan the event QR code'
              }
            </Text>
            <Text className="text-white text-sm opacity-60 text-center">
              The camera will automatically detect QR codes
            </Text>
          </View>
          </View>
        </View>

        {/* Camera Controls */}
        <View className="absolute bottom-6 left-0 right-0 items-center">
          <View className="flex-row items-center space-x-6">
            <TouchableOpacity
              onPress={toggleCameraType}
              className="w-16 h-16 bg-white bg-opacity-20 rounded-full items-center justify-center"
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleCamera}
              className="w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg"
            >
              <Ionicons name="create" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Info */}
        <View className="bg-black p-6 rounded-2xl mb-6 mx-4">
          <View className="items-center">
            <Text className="text-white text-center text-sm opacity-70 mb-2">
              Camera scanning active
            </Text>
            <Text className="text-white text-xs opacity-50 text-center">
              Point camera at event QR code
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row items-center justify-between p-6 pt-12 bg-black rounded-2xl mb-6 mx-4 z-10">
          <View className="w-10" />

          <View className="flex-row items-center">
            <Ionicons name="qr-code" size={18} color="white" />
            <Text className="text-white text-lg font-bold ml-3">
              QR Code Scanner
            </Text>
          </View>

          <TouchableOpacity
            onPress={toggleCamera}
            className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center"
          >
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-red-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="camera" size={48} color="white" />
            </View>
            <Text className="text-white text-xl font-bold mb-3 text-center">
              Camera Not Available
            </Text>
            <Text className="text-white text-base opacity-80 mb-2 text-center">
              Unable to access camera device
            </Text>
            <Text className="text-white text-sm opacity-60 text-center">
              Please check your device settings or try again
            </Text>
          </View>

          {/* Retry Button */}
          <TouchableOpacity
            onPress={async () => {
              setIsInitializing(true);
              const permission = await requestPermission();
              if (permission) {
                setShowCamera(true);
              }
              setIsInitializing(false);
            }}
            className="bg-blue-600 px-8 py-4 rounded-lg flex-row items-center"
          >
            <Ionicons name="refresh" size={24} color="white" />
            <Text className="text-white font-semibold text-center text-lg ml-3">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info */}
        <View className="bg-black p-6 rounded-2xl mb-6 mx-4">
          <View className="items-center">
            <Text className="text-white text-center text-sm opacity-70 mb-2">
              Camera QR code scanning
            </Text>
            <Text className="text-white text-xs opacity-50 text-center">
              Use your camera to scan event QR codes for check-in
            </Text>
          </View>
        </View>
        
      </SafeAreaView>
    </View>
  );
}

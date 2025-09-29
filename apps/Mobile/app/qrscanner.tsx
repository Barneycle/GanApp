import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Camera,
  getCameraDevice,
  useCameraDevices,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import { supabase } from "../lib/supabase";
import { QRScanService, QRScanResult } from "../lib/qrScanService";
import { useAuth } from "../lib/authContext";

export default function QRScanner() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<"front" | "back">("back");
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const router = useRouter();
  const { user } = useAuth();
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, cameraType);

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
          
          // Show success message
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
    codeTypes: ["qr"],
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

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <View className="items-center">
          <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-6">
            <Ionicons name="camera" size={32} color="white" />
          </View>
          <Text className="text-white text-lg font-semibold mb-2">
            Requesting Camera Access
          </Text>
          <Text className="text-white text-center opacity-80">
            Please wait while we request camera permissions...
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
              onPress={requestPermission}
              className="bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">
                Request Permission
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openSettings}
              className="bg-gray-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">
                Open Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-gray-800 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera && device) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        {/* Camera Header */}
        <View className="flex-row items-center justify-between p-6 pt-12 bg-black rounded-2xl mb-6 mx-4 z-10 absolute top-0 left-0 right-0">
          <TouchableOpacity
            onPress={toggleCamera}
            className="w-10 h-10 bg-white bg-opacity-90 rounded-full items-center justify-center shadow-lg"
          >
            <Ionicons name="arrow-back" size={20} color="#1e3a8a" />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <Ionicons name="camera" size={18} color="white" />
            <Text className="text-white text-lg font-bold ml-3">
              Camera Scanner
            </Text>
          </View>

          <TouchableOpacity
            onPress={toggleCameraType}
            className="w-10 h-10 bg-white bg-opacity-20 rounded-full items-center justify-center"
          >
            <Ionicons name="camera-reverse" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <View className="flex-1 mt-24">
          <Camera
            ref={cameraRef}
            style={{ flex: 1 }}
            device={device}
            isActive={true}
            codeScanner={codeScanner}
          />

          {/* Camera Overlay */}
          <View className="absolute inset-0 justify-center items-center pointer-events-none">
            {/* Scanner Frame */}
            <View className="w-64 h-64 border-2 border-white rounded-lg relative">
              {/* Corner Indicators */}
              <View className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-400 rounded-tl-lg" />
              <View className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-400 rounded-tr-lg" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-400 rounded-bl-lg" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-400 rounded-br-lg" />

              {/* Scanning Line Animation */}
              <View className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 animate-pulse" />
            </View>

            {/* Instructions */}
            <View className="items-center mt-8 px-4">
              <Text className="text-white text-center text-lg font-semibold mb-3">
                Position QR Code in Frame
              </Text>
              <Text className="text-white text-base opacity-80 mb-4 text-center">
                Hold your device steady to scan the event QR code
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
              className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center shadow-lg"
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
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 pt-12 bg-black rounded-2xl mb-6 mx-4 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white bg-opacity-90 rounded-full items-center justify-center shadow-lg"
        >
          <Ionicons name="arrow-back" size={20} color="#1e3a8a" />
        </TouchableOpacity>

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
          <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center mb-6">
            <Ionicons name="qr-code" size={48} color="white" />
          </View>
          <Text className="text-white text-xl font-bold mb-3 text-center">
            Scan Event QR Code
          </Text>
          <Text className="text-white text-base opacity-80 mb-2 text-center">
            Use your camera to scan the event QR code
          </Text>
          <Text className="text-white text-sm opacity-60 text-center">
            Point your camera at the QR code to check in
          </Text>
        </View>

        {/* Camera Button */}
        <TouchableOpacity
          onPress={toggleCamera}
          className="bg-blue-500 px-8 py-4 rounded-lg flex-row items-center"
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text className="text-white font-semibold text-center text-lg ml-3">
            Open Camera Scanner
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
  );
}

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Linking,
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

export default function QRScanner() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<"front" | "back">("back");
  const cameraRef = useRef<Camera>(null);
  const router = useRouter();
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, cameraType);

  const handleBarCodeScanned = useCallback(
    async (data: string) => {
      if (isScanning) return;
      setIsScanning(true);

      try {
        let eventData;
        try {
          eventData = JSON.parse(data);
        } catch {
          eventData = { eventId: data };
        }

        const { data: event, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventData.eventId || eventData.id)
          .eq("status", "published")
          .single();

        if (error || !event) {
          Alert.alert(
            "Invalid QR Code",
            "This QR code is not associated with a valid event.",
            [{ text: "OK", onPress: () => setIsScanning(false) }]
          );
          return;
        }

        Alert.alert(
          "Event Found!",
          `Event: ${event.title}\nDate: ${new Date(
            event.start_date
          ).toLocaleDateString()}\n\nRedirecting to survey...`,
          [
            {
              text: "Continue",
              onPress: () => {
                router.push({
                  pathname: "/survey",
                  params: { eventId: event.id, eventTitle: event.title },
                });
              },
            },
          ]
        );
      } catch (error) {
        console.error("Error processing QR code:", error);
        Alert.alert("Error", "Failed to process QR code. Please try again.", [
          { text: "OK", onPress: () => setIsScanning(false) },
        ]);
      }
    },
    [isScanning, router]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        handleBarCodeScanned(codes[0].value);
      }
    },
  });

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      handleBarCodeScanned(manualInput.trim());
    }
  };

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
            Enter Event QR Code
          </Text>
          <Text className="text-white text-base opacity-80 mb-2 text-center">
            Scan the QR code and enter the data manually
          </Text>
          <Text className="text-white text-sm opacity-60 text-center">
            Or enter the event ID directly
          </Text>
        </View>

        {/* Manual Input */}
        <View className="w-full max-w-sm">
          <TextInput
            value={manualInput}
            onChangeText={setManualInput}
            placeholder="Enter event ID or QR code data"
            placeholderTextColor="#9CA3AF"
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-black text-center mb-4"
            onSubmitEditing={handleManualSubmit}
            autoFocus={true}
          />
          <TouchableOpacity
            onPress={handleManualSubmit}
            disabled={!manualInput.trim()}
            className={`px-6 py-3 rounded-lg ${
              manualInput.trim() ? "bg-blue-500" : "bg-gray-400"
            }`}
          >
            <Text className="text-white font-semibold text-center text-lg">
              Submit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Camera Button */}
        <TouchableOpacity
          onPress={toggleCamera}
          className="mt-8 bg-blue-500 px-6 py-3 rounded-lg flex-row items-center"
        >
          <Ionicons name="camera" size={20} color="white" />
          <Text className="text-white font-semibold text-center text-lg ml-2">
            Open Camera Scanner
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View className="bg-black p-6 rounded-2xl mb-6 mx-4">
        <View className="items-center">
          <Text className="text-white text-center text-sm opacity-70 mb-2">
            Manual QR code entry
          </Text>
          <Text className="text-white text-xs opacity-50 text-center">
            Enter event codes manually or use camera capture
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

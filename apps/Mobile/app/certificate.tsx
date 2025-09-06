import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function Certificate() {
  const router = useRouter();
  const [certificateData, setCertificateData] = useState({
    participantName: 'John Doe',
    eventName: 'Tech Conference 2025',
    completionDate: '2024-06-15',
    certificateId: 'TC2025-001'
  });

  const downloadCertificate = () => {
    // Handle certificate download
    console.log('Downloading certificate...');
  };

  const shareCertificate = () => {
    // Handle certificate sharing
    console.log('Sharing certificate...');
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
      <ScrollView className="flex-1 px-4">
        <View className="py-6">
          <Text className="text-3xl font-bold text-slate-800 mb-2">Certificate</Text>
          <Text className="text-slate-600 mb-6">Your event completion certificate</Text>

          {/* Certificate Preview */}
          <View className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <View className="items-center mb-6">
              <Text className="text-2xl font-bold text-blue-600 mb-2">CERTIFICATE OF COMPLETION</Text>
              <View className="w-full h-1 bg-blue-600 mb-4"></View>
            </View>

            <View className="items-center mb-6">
              <Text className="text-lg text-slate-600 mb-2">This is to certify that</Text>
              <Text className="text-2xl font-bold text-slate-800 mb-4">{certificateData.participantName}</Text>
              <Text className="text-lg text-slate-600 mb-2">has successfully completed</Text>
              <Text className="text-xl font-semibold text-slate-800 mb-4">{certificateData.eventName}</Text>
            </View>

            <View className="items-center mb-6">
              <Text className="text-slate-600">Completed on: {certificateData.completionDate}</Text>
              <Text className="text-slate-600">Certificate ID: {certificateData.certificateId}</Text>
            </View>

            <View className="items-center">
              <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center">
                <Text className="text-blue-600 font-bold text-2xl">✓</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-4">
            <TouchableOpacity
              onPress={downloadCertificate}
              className="bg-blue-600 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-semibold text-lg">Download Certificate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={shareCertificate}
              className="bg-slate-100 py-4 rounded-lg items-center"
            >
              <Text className="text-slate-800 font-semibold text-lg">Share Certificate</Text>
            </TouchableOpacity>
          </View>

          {/* Certificate Info */}
          <View className="bg-blue-50 rounded-lg p-4 mt-6">
            <Text className="text-blue-800 font-semibold mb-2">Certificate Information</Text>
            <Text className="text-blue-700 text-sm">
              This certificate is digitally verified and can be used to verify your participation in the event.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

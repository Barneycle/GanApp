import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParticipantInfo as ParticipantInfoType } from '../lib/participantService';

interface ParticipantInfoProps {
  visible: boolean;
  onClose: () => void;
  participant: ParticipantInfoType | null;
  eventTitle: string;
}

export default function ParticipantInfo({ 
  visible, 
  onClose, 
  participant, 
  eventTitle 
}: ParticipantInfoProps) {
  const insets = useSafeAreaInsets();

  console.log('ParticipantInfo render - visible:', visible, 'participant exists:', !!participant);

  const getStatusColor = (status: string, type: 'registration' | 'attendance') => {
    if (type === 'registration') {
      switch (status) {
        case 'registered': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Registered' };
        case 'pending': return { bg: '#FFF3E0', text: '#F57C00', label: 'Pending' };
        default: return { bg: '#F3E5F5', text: '#6A1B9A', label: 'Not Registered' };
      }
    } else {
      switch (status) {
        case 'checked_in': return { bg: '#E3F2FD', text: '#1565C0', label: 'Checked In' };
        case 'not_checked_in': return { bg: '#FFF8E1', text: '#F57F17', label: 'Not Checked In' };
        default: return { bg: '#ECEFF1', text: '#455A64', label: 'Unknown' };
      }
    }
  };

  const registrationStatus = getStatusColor(participant?.registration_status || 'unknown', 'registration');
  const attendanceStatus = getStatusColor(participant?.attendance_status || 'not_checked_in', 'attendance');

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible && !!participant}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40">
        <View className="flex-1 justify-end">
          <View
            className="bg-white rounded-t-3xl overflow-hidden"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            {/* Header with Close Button */}
            <View className="flex-row justify-between items-center px-6 pt-6 pb-4">
              <Text className="text-2xl font-bold text-gray-900">Participant Details</Text>
              <TouchableOpacity 
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {/* Avatar Section */}
              {participant?.avatar_url ? (
                <View className="px-6 pb-6">
                  <View className="w-full h-64 rounded-2xl overflow-hidden bg-gray-200 shadow-lg">
                    <Image
                      source={{ uri: participant.avatar_url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                </View>
              ) : (
                <View className="px-6 pb-6">
                  <View className="w-full h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 items-center justify-center shadow-lg">
                    <Ionicons name="person" size={80} color="white" />
                  </View>
                </View>
              )}

              {/* Name and Role */}
              <View className="px-6 pb-6">
                <Text className="text-3xl font-bold text-gray-900 mb-2">
                  {participant?.first_name} {participant?.last_name}
                </Text>
                <Text className="text-base text-gray-500 capitalize">
                  {participant?.role}
                </Text>
              </View>

              {/* Event Info Card */}
              <View className="mx-6 mb-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
                <Text className="text-sm text-blue-600 font-semibold mb-2">Event</Text>
                <Text className="text-lg font-bold text-blue-900">{eventTitle}</Text>
              </View>

              {/* Status Badges */}
              <View className="mx-6 mb-6 flex-row gap-3">
                <View 
                  className="flex-1 rounded-xl p-4"
                  style={{ backgroundColor: registrationStatus.bg }}
                >
                  <Text className="text-xs font-semibold mb-1" style={{ color: registrationStatus.text }}>
                    Registration
                  </Text>
                  <Text className="text-base font-bold" style={{ color: registrationStatus.text }}>
                    {registrationStatus.label}
                  </Text>
                </View>
                <View 
                  className="flex-1 rounded-xl p-4"
                  style={{ backgroundColor: attendanceStatus.bg }}
                >
                  <Text className="text-xs font-semibold mb-1" style={{ color: attendanceStatus.text }}>
                    Check-in
                  </Text>
                  <Text className="text-base font-bold" style={{ color: attendanceStatus.text }}>
                    {attendanceStatus.label}
                  </Text>
                </View>
              </View>

              {/* Contact Information */}
              <View className="mx-6 mb-6">
                <Text className="text-sm font-semibold text-gray-600 mb-3">Contact Information</Text>
                
                {/* Email */}
                <View className="bg-gray-50 rounded-xl p-4 mb-3 flex-row items-center">
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                    <Ionicons name="mail" size={20} color="#1E40AF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">Email</Text>
                    <Text className="text-base font-medium text-gray-900">{participant?.email || 'Not provided'}</Text>
                  </View>
                </View>

                {/* Phone */}
                <View className="bg-gray-50 rounded-xl p-4 flex-row items-center">
                  <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-4">
                    <Ionicons name="call" size={20} color="#15803D" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">Phone</Text>
                    <Text className="text-base font-medium text-gray-900">{participant?.phone || 'Not provided'}</Text>
                  </View>
                </View>
              </View>

              {/* Check-in Details */}
              {participant?.check_in_time && (
                <View className="mx-6 mb-6">
                  <Text className="text-sm font-semibold text-gray-600 mb-3">Check-in Details</Text>
                  
                  <View className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 mb-3">
                    <Text className="text-xs text-purple-600 mb-1">Check-in Time</Text>
                    <Text className="text-base font-medium text-purple-900">
                      {new Date(participant.check_in_time).toLocaleString()}
                    </Text>
                  </View>

                  {participant?.check_in_method && (
                    <View className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4">
                      <Text className="text-xs text-amber-600 mb-1">Check-in Method</Text>
                      <Text className="text-base font-medium text-amber-900 capitalize">
                        {participant.check_in_method.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Registration Date */}
              {participant?.registration_date && (
                <View className="mx-6 mb-6 bg-gray-50 rounded-xl p-4">
                  <Text className="text-xs text-gray-500 mb-1">Registered On</Text>
                  <Text className="text-base font-medium text-gray-900">
                    {new Date(participant.registration_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Close Button */}
            <View className="px-6 py-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={onClose}
                className="bg-blue-600 rounded-xl py-4 items-center shadow-lg"
              >
                <Text className="text-white font-semibold text-lg">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}



import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const sampleEvents = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'TechCon 2024: AI & Future Tech',
    date: 'March 15, 2024',
    time: '9:00 AM - 5:00 PM',
    location: 'Convention Center, Downtown',
    image: 'https://via.placeholder.com/400x250',
    category: 'Conference',
    price: 'Free',
    attendees: 250,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Startup Networking Mixer',
    date: 'March 22, 2024',
    time: '6:00 PM - 9:00 PM',
    location: 'Innovation Hub, Tech District',
    image: 'https://via.placeholder.com/400x250',
    category: 'Networking',
    price: '$25',
    attendees: 80,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Web Development Workshop',
    date: 'March 30, 2024',
    time: '10:00 AM - 4:00 PM',
    location: 'Code Academy, Downtown',
    image: 'https://via.placeholder.com/400x250',
    category: 'Workshop',
    price: '$50',
    attendees: 40,
  },
];

export default function Events() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-3 pt-12 mt-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={18} color="#374151" />
            <Text className="text-lg font-bold text-gray-800 ml-2">All Events</Text>
          </View>
          
          <View className="w-10" />
        </View>
      </View>

      <View className="flex-1 mx-4 my-2">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Upcoming Events</Text>
          
          {sampleEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              className="bg-white rounded-xl shadow-md mb-4 overflow-hidden"
              onPress={() => router.push('/eventregistration')}
            >
              <Image 
                source={{ uri: event.image }} 
                className="w-full h-32 sm:h-40"
                resizeMode="cover"
              />
              
              <View className="p-3 sm:p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {event.category}
                  </Text>
                  <Text className="text-sm text-gray-600">{event.price}</Text>
                </View>
                
                <Text className="text-base sm:text-lg font-bold text-gray-800 mb-2">{event.title}</Text>
                
                <View className="space-y-1 mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar" size={16} color="#6b7280" className="mr-2" />
                    <Text className="text-xs sm:text-sm text-gray-600">{event.date} • {event.time}</Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={16} color="#6b7280" className="mr-2" />
                    <Text className="text-xs sm:text-sm text-gray-600">{event.location}</Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Ionicons name="people" size={16} color="#6b7280" className="mr-2" />
                    <Text className="text-xs sm:text-sm text-gray-600">{event.attendees} registered</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  className="bg-blue-500 rounded-lg py-2 sm:py-3 px-3 sm:px-4 items-center"
                  onPress={() => router.push('/eventregistration')}
                >
                  <Text className="text-white text-sm sm:text-base font-bold">Register Now</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          
          <View className="h-6" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

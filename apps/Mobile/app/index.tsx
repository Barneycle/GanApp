import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LoadingScreen } from './loadingscreen';
import { EventService, Event } from '../lib/eventService';
import { useAuth } from '../lib/authContext';

const latestEvent = {
  title: "Annual Tech Conference 2024",
  date: "June 15, 2024",
  time: "9:00 AM - 5:00 PM",
  venue: "Grand Convention Center, Cityville",
  sponsors: [
    "TechCorp",
    "InnovateX",
    "Future Solutions"
  ],
  guestSpeakers: [
    "Dr. Jane Smith",
    "Mr. John Doe",
    "Prof. Emily Johnson"
  ],
  rationale: "The Annual Tech Conference 2024 aims to foster collaboration and innovation among technology professionals by providing a platform for sharing knowledge, networking, and showcasing the latest advancements in the industry.",
  imageUrl: 'https://via.placeholder.com/400x250'
};

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const { user: currentUser, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Set minimum loading time regardless of auth state
    const minLoadingTimer = setTimeout(() => {
      setIsLoading(false);
      loadEvents();
    }, 3000); // 3 seconds minimum

    return () => {
      clearTimeout(minLoadingTimer);
    };
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    // Redirect to login if not authenticated, but only after loading screen completes
    if (!authLoading && !currentUser && !isLoading) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, isLoading]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              Alert.alert('Success', 'You have been signed out successfully');
            }
          }
        }
      ]
    );
  };

  const loadEvents = async () => {
    try {
      setIsLoadingEvents(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout after 10 seconds')), 10000)
      );
      
      // Fetch published events
      const eventsPromise = EventService.getPublishedEvents();
      
      const result = await Promise.race([eventsPromise, timeoutPromise]) as { events?: Event[]; error?: string };
      
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      setError('Failed to load events from database');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Use the first event as the featured event, or fallback to default
  const featuredEvent = events[0] || latestEvent;
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to format time
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return <LoadingScreen onComplete={() => {
      setIsLoading(false);
      loadEvents();
    }} />;
  }

  // Don't render if not authenticated
  if (!currentUser) {
    return null;
  }

  if (error && events.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 mx-4 my-2 justify-center items-center">
          <View className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
            <View className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 items-center justify-center">
              <Text className="text-red-600 text-2xl">⚠️</Text>
            </View>
            <Text className="text-lg font-semibold text-gray-800 mb-2 text-center">Error Loading Events</Text>
            <Text className="text-gray-600 mb-4 text-center">{error}</Text>
            <TouchableOpacity 
              onPress={loadEvents}
              className="bg-blue-500 py-2 px-4 rounded-lg self-center"
            >
              <Text className="text-white font-medium">Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 mx-4 my-2 pt-12 mt-6">
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <View className="w-full overflow-hidden h-48 rounded-2xl mb-6">
            <Image 
              source={{ 
                uri: featuredEvent.banner_url || featuredEvent.imageUrl || 'https://via.placeholder.com/400x250' 
              }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          
          {/* Title */}
          <Text className="text-3xl font-bold text-blue-900 text-center mb-8">
            {featuredEvent.title}
          </Text>
          
          {/* Event Details Grid */}
          <View>
            {/* Event Programme and Kits */}
            <View className="mb-8">
              <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white mb-6">
                <Text className="text-lg font-semibold text-blue-900 mb-3">Event Programme</Text>
                <Text className="text-gray-700 text-base mb-4">View the complete schedule and agenda for the conference</Text>
                <TouchableOpacity className="bg-blue-500 py-2 px-4 rounded-lg self-start">
                  <Text className="text-white font-medium">View Programme</Text>
                </TouchableOpacity>
              </View>
              <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white">
                <Text className="text-lg font-semibold text-blue-900 mb-3">Event Kits</Text>
                <Text className="text-gray-700 text-base mb-4">Access event materials, presentations, and resources</Text>
                <TouchableOpacity className="bg-blue-500 py-2 px-4 rounded-lg self-start">
                  <Text className="text-white font-medium">View Kits</Text>
                </TouchableOpacity>
              </View>
            </View>
            
             {/* Date, Time, Venue Grid */}
             <View className="mb-8">
               <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white mb-6">
                 <Text className="text-lg font-semibold text-blue-900 mb-3">Date:</Text>
                 <Text className="text-gray-700 text-base">
                   {featuredEvent.start_date ? formatDate(featuredEvent.start_date) : featuredEvent.date || 'TBA'}
                 </Text>
               </View>
               <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white mb-6">
                 <Text className="text-lg font-semibold text-blue-900 mb-3">Time:</Text>
                 <Text className="text-gray-700 text-base">
                   {featuredEvent.start_time ? `${formatTime(featuredEvent.start_time)} - ${formatTime(featuredEvent.end_time)}` : featuredEvent.time || 'TBA'}
                 </Text>
               </View>
               <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white">
                 <Text className="text-lg font-semibold text-blue-900 mb-3">Venue:</Text>
                 <Text className="text-gray-700 text-base">{featuredEvent.venue || 'TBA'}</Text>
               </View>
             </View>
            
             {/* Rationale */}
             {featuredEvent.rationale && (
               <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white mb-8">
                 <Text className="text-lg font-semibold text-blue-900 mb-3">Rationale:</Text>
                 <Text className="text-gray-700 text-base leading-6">{featuredEvent.rationale}</Text>
               </View>
             )}
             
             {/* Guest Speakers */}
             {featuredEvent.guest_speakers && featuredEvent.guest_speakers.length > 0 && (
               <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white mb-8">
                 <Text className="text-lg font-semibold text-blue-900 mb-3">Guest Speaker/s:</Text>
                 <View className="flex-row flex-wrap justify-start">
                   {featuredEvent.guest_speakers.map((speaker, index) => (
                     <View key={`speaker-${index}`} className="w-1/2 mb-4 px-2">
                       <View className="items-center">
                         <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mb-2">
                           {featuredEvent.speaker_photos_url ? (() => {
                             const photoUrls = featuredEvent.speaker_photos_url.split(',').map((url: string) => url.trim());
                             const speakerPhotoUrl = photoUrls[index];
                             return speakerPhotoUrl ? (
                               <Image 
                                 source={{ uri: speakerPhotoUrl }} 
                                 className="w-full h-full"
                                 resizeMode="cover"
                               />
                             ) : null;
                           })() : null}
                           {(!featuredEvent.speaker_photos_url || !featuredEvent.speaker_photos_url.split(',')[index]) && (
                             <View className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 items-center justify-center">
                               <Text className="text-white font-semibold text-lg">
                                 {speaker.name ? speaker.name.charAt(0).toUpperCase() : 'S'}
                               </Text>
                             </View>
                           )}
                         </View>
                         <Text className="text-gray-800 text-sm font-medium text-center">{speaker.name}</Text>
                         {speaker.title && (
                           <Text className="text-gray-500 text-xs text-center">{speaker.title}</Text>
                         )}
                       </View>
                     </View>
                   ))}
                 </View>
               </View>
             )}
             
             {/* Sponsors */}
             {featuredEvent.sponsors && featuredEvent.sponsors.length > 0 && (
               <View className="border border-gray-200 rounded-lg shadow-md p-6 bg-white">
                 <Text className="text-lg font-semibold text-blue-900 mb-3">Sponsor/s:</Text>
                 <View className="flex-row flex-wrap justify-start">
                   {featuredEvent.sponsors.map((sponsor, index) => (
                     <View key={`sponsor-${index}`} className="w-1/2 mb-4 px-2">
                       <View className="items-center">
                         <View className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-200 mb-2 items-center justify-center">
                           {featuredEvent.sponsor_logos_url ? (() => {
                             const logoUrls = featuredEvent.sponsor_logos_url.split(',').map((url: string) => url.trim());
                             const sponsorLogoUrl = logoUrls[index];
                             return sponsorLogoUrl ? (
                               <Image 
                                 source={{ uri: sponsorLogoUrl }} 
                                 className="w-full h-full"
                                 resizeMode="contain"
                               />
                             ) : null;
                           })() : null}
                           {(!featuredEvent.sponsor_logos_url || !featuredEvent.sponsor_logos_url.split(',')[index]) && (
                             <View className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 items-center justify-center">
                               <Text className="text-white font-semibold text-lg">
                                 {sponsor.name ? sponsor.name.charAt(0).toUpperCase() : 'S'}
                               </Text>
                             </View>
                           )}
                         </View>
                         <Text className="text-gray-800 text-sm font-medium text-center">{sponsor.name}</Text>
                         {sponsor.website && (
                           <Text className="text-blue-600 text-xs text-center">Visit Website</Text>
                         )}
                       </View>
                     </View>
                   ))}
                 </View>
               </View>
             )}
          </View>
          
          {/* Sign Out Button */}
          {currentUser && (
            <View className="mt-8 mb-4">
              <TouchableOpacity
                onPress={handleSignOut}
                className="bg-red-500 py-4 px-6 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-lg">Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

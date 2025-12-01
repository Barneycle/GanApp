import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { EventService, Event } from '../lib/eventService';
import { SpeakerService } from '../lib/speakerService';
import { SponsorService } from '../lib/sponsorService';
import { useAuth } from '../lib/authContext';
import RenderHTML from 'react-native-render-html';
import { Dimensions } from 'react-native';
import { decodeHtml, getHtmlContentWidth, defaultHtmlStyles } from '../lib/htmlUtils';
import TutorialOverlay from '../components/TutorialOverlay';

const { width: screenWidth } = Dimensions.get('window');

interface EventSpeaker {
  id: string;
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
    prefix?: string;
    affix?: string;
    designation?: string;
    organization?: string;
    photo_url?: string;
  };
  is_keynote: boolean;
}

interface EventSponsor {
  id: string;
  sponsor: {
    id: string;
    name: string;
    contact_person?: string;
    role?: string;
    contribution?: string;
    logo_url?: string;
  };
}

export default function EventDetails() {
  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSpeakers, setLoadingSpeakers] = useState(false);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();

  useEffect(() => {
    if (eventId) {
      loadEventDetails();
    } else {
      setError('Event ID is required');
      setLoading(false);
    }
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load event details
      const eventResult = await EventService.getEventById(eventId!);
      
      if (eventResult.error || !eventResult.event) {
        setError(eventResult.error || 'Event not found');
        return;
      }
      
      setEvent(eventResult.event);
      
      // Load speakers and sponsors in parallel
      loadSpeakers(eventId!);
      loadSponsors(eventId!);
      
    } catch (err) {
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const loadSpeakers = async (eventId: string) => {
    try {
      setLoadingSpeakers(true);
      const result = await SpeakerService.getEventSpeakers(eventId);
      setSpeakers(result.speakers || []);
    } catch (err) {
      console.error('Failed to load speakers:', err);
      setSpeakers([]);
    } finally {
      setLoadingSpeakers(false);
    }
  };

  const loadSponsors = async (eventId: string) => {
    try {
      setLoadingSponsors(true);
      const result = await SponsorService.getEventSponsors(eventId);
      setSponsors(result.sponsors || []);
    } catch (err) {
      console.error('Failed to load sponsors:', err);
      setSponsors([]);
    } finally {
      setLoadingSponsors(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'TBA';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleMaterialPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-blue-100 mt-4">Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView className="flex-1 bg-blue-900">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={48} color="#ffffff" />
          <Text className="text-white text-lg font-semibold mt-4 mb-4 text-center">
            Error Loading Event
          </Text>
          <Text className="text-blue-100 text-center mb-6">{error}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-700 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <TutorialOverlay
        screenId="event-details"
        steps={[
          {
            id: '1',
            title: 'Event Details',
            description: 'View complete information about this event including description, speakers, sponsors, and schedule.',
          },
          {
            id: '2',
            title: 'Register for Event',
            description: 'Tap the "Register" button to sign up for this event. After registration, you\'ll be able to access event features.',
          },
        ]}
      />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ 
          paddingBottom: Math.max(insets.bottom, 20)
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Single Event Card */}
        <View className="mx-4 mt-4">
          <View className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Event Banner */}
            <Image
              source={{ uri: event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center' }}
              className="w-full h-48"
              resizeMode="cover"
            />
            
            {/* Event Content */}
            <View className="p-6">
              {/* Event Title and Description */}
              <View className="mb-6">
                <Text className="text-2xl font-bold text-gray-800 mb-3 text-center">
                  {event.title}
                </Text>
                {event.description && (
                  <View className="mt-2">
                    <RenderHTML
                      contentWidth={getHtmlContentWidth(48)}
                      source={{ html: decodeHtml(event.description) }}
                      baseStyle={{ ...defaultHtmlStyles.baseStyle, textAlign: 'center' }}
                      tagsStyles={defaultHtmlStyles.tagsStyles}
                      enableExperimentalMarginCollapsing={true}
                    />
                  </View>
                )}
              </View>

              {/* Event Rationale */}
              {event.rationale && (
                <View className="mb-6">
                  <View className="flex-row items-center mb-3">
                    <View className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center mr-3">
                      <Ionicons name="bulb" size={20} color="#ffffff" />
                    </View>
                    <Text className="text-lg font-semibold text-gray-800">Event Rationale</Text>
                  </View>
                  <View className="bg-blue-50 p-4 rounded-xl">
                    <RenderHTML
                      contentWidth={getHtmlContentWidth(80)}
                      source={{ html: decodeHtml(event.rationale) }}
                      baseStyle={defaultHtmlStyles.baseStyle}
                      tagsStyles={defaultHtmlStyles.tagsStyles}
                      enableExperimentalMarginCollapsing={true}
                    />
                  </View>
                </View>
              )}

              {/* Event Materials - Show for authenticated users */}
              {user && (event.event_kits_url || event.event_programmes_url || event.materials_url || event.programme_url) && (
                <View className="mb-6">
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 bg-green-600 rounded-full items-center justify-center mr-3">
                      <Ionicons name="document" size={20} color="#ffffff" />
                    </View>
                    <Text className="text-lg font-semibold text-gray-800">Event Materials</Text>
                  </View>
                  
                  {/* Event Kits */}
                  {(event.event_kits_url || event.materials_url) && (
                    <View className="mb-4">
                      <View className="flex-row items-center mb-2">
                        <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mr-2">
                          <Ionicons name="briefcase" size={16} color="#3b82f6" />
                        </View>
                        <Text className="font-semibold text-gray-800">Event Kits</Text>
                      </View>
                      <Text className="text-sm text-gray-600 mb-3">Materials and resources for this event</Text>
                      {(event.event_kits_url || event.materials_url).split(',').map((url, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => handleMaterialPress(url.trim())}
                          className="bg-blue-600 py-3 px-4 rounded-lg mb-2"
                        >
                          <View className="flex-row items-center justify-center">
                            <Ionicons name="eye" size={16} color="#ffffff" />
                            <Text className="text-white font-medium ml-2">View Material {index + 1}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Event Programme */}
                  {(event.event_programmes_url || event.programme_url) && (
                    <View>
                      <View className="flex-row items-center mb-2">
                        <View className="w-8 h-8 bg-green-100 rounded-lg items-center justify-center mr-2">
                          <Ionicons name="list" size={16} color="#10b981" />
                        </View>
                        <Text className="font-semibold text-gray-800">Event Programme</Text>
                      </View>
                      <Text className="text-sm text-gray-600 mb-3">Schedule and agenda for this event</Text>
                      {(event.event_programmes_url || event.programme_url).split(',').map((url, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => handleMaterialPress(url.trim())}
                          className="bg-green-600 py-3 px-4 rounded-lg mb-2"
                        >
                          <View className="flex-row items-center justify-center">
                            <Ionicons name="eye" size={16} color="#ffffff" />
                            <Text className="text-white font-medium ml-2">View Programme {index + 1}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Event Details */}
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-gray-600 rounded-full items-center justify-center mr-3">
                    <Ionicons name="information-circle" size={20} color="#ffffff" />
                  </View>
                  <Text className="text-lg font-semibold text-gray-800">Event Details</Text>
                </View>
                
                <View className="space-y-3">
                  {/* Date */}
                  <View className="bg-purple-50 rounded-xl p-4">
                    <View className="flex-row items-center mb-2">
                      <View className="w-8 h-8 bg-purple-500 rounded-lg items-center justify-center mr-3">
                        <Ionicons name="calendar" size={16} color="#ffffff" />
                      </View>
                      <Text className="font-semibold text-gray-800">Date</Text>
                    </View>
                    <Text className="text-gray-600 font-medium">{formatDate(event.start_date)}</Text>
                  </View>

                  {/* Time */}
                  <View className="bg-orange-50 rounded-xl p-4">
                    <View className="flex-row items-center mb-2">
                      <View className="w-8 h-8 bg-orange-500 rounded-lg items-center justify-center mr-3">
                        <Ionicons name="time" size={16} color="#ffffff" />
                      </View>
                      <Text className="font-semibold text-gray-800">Time</Text>
                    </View>
                    <Text className="text-gray-600 font-medium">{formatTime(event.start_time)} - {formatTime(event.end_time)}</Text>
                  </View>

                  {/* Venue */}
                  <View className="bg-cyan-50 rounded-xl p-4">
                    <View className="flex-row items-center mb-2">
                      <View className="w-8 h-8 bg-cyan-500 rounded-lg items-center justify-center mr-3">
                        <Ionicons name="location" size={16} color="#ffffff" />
                      </View>
                      <Text className="font-semibold text-gray-800">Venue</Text>
                    </View>
                    <Text className="text-gray-600 font-medium">{event.venue || 'TBA'}</Text>
                  </View>
                </View>
              </View>

              {/* Guest Speakers */}
              {(loadingSpeakers || speakers.length > 0) && (
                <View className="mb-6">
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center mr-3">
                      <Ionicons name="people" size={20} color="#ffffff" />
                    </View>
                    <Text className="text-lg font-semibold text-gray-800">Guest Speakers</Text>
                  </View>
                  
                  {loadingSpeakers ? (
                    <View className="items-center py-8">
                      <ActivityIndicator size="large" color="#3b82f6" />
                      <Text className="text-gray-600 mt-2">Loading speakers...</Text>
                    </View>
                  ) : (
                    <View className="space-y-4">
                      {speakers.map((eventSpeaker) => {
                        const speaker = eventSpeaker.speaker;
                        const fullName = `${speaker.prefix || ''} ${speaker.first_name} ${speaker.last_name} ${speaker.affix || ''}`.trim();
                        return (
                          <View key={eventSpeaker.id} className="bg-gray-50 rounded-xl p-4">
                            <View className="flex-row items-center">
                              <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mr-4">
                                {speaker.photo_url ? (
                                  <Image
                                    source={{ uri: speaker.photo_url }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="w-full h-full bg-blue-500 items-center justify-center">
                                    <Text className="text-white font-semibold text-lg">
                                      {fullName ? fullName.charAt(0).toUpperCase() : 'S'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View className="flex-1">
                                <Text className="text-gray-800 font-medium">{fullName}</Text>
                                {speaker.designation && (
                                  <Text className="text-gray-500 text-sm">{speaker.designation}</Text>
                                )}
                                {speaker.organization && (
                                  <Text className="text-gray-400 text-sm">{speaker.organization}</Text>
                                )}
                                {eventSpeaker.is_keynote && (
                                  <View className="mt-1">
                                    <Text className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                      Keynote Speaker
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
              
              {/* Sponsors */}
              {(loadingSponsors || sponsors.length > 0) && (
                <View>
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 bg-green-600 rounded-full items-center justify-center mr-3">
                      <Ionicons name="business" size={20} color="#ffffff" />
                    </View>
                    <Text className="text-lg font-semibold text-gray-800">Sponsors</Text>
                  </View>
                  
                  {loadingSponsors ? (
                    <View className="items-center py-8">
                      <ActivityIndicator size="large" color="#10b981" />
                      <Text className="text-gray-600 mt-2">Loading sponsors...</Text>
                    </View>
                  ) : (
                    <View className="space-y-4">
                      {sponsors.map((eventSponsor) => {
                        const sponsor = eventSponsor.sponsor;
                        return (
                          <View key={eventSponsor.id} className="bg-gray-50 rounded-xl p-4">
                            <View className="flex-row items-center">
                              <View className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-200 mr-4 items-center justify-center">
                                {sponsor.logo_url ? (
                                  <Image
                                    source={{ uri: sponsor.logo_url }}
                                    className="w-full h-full"
                                    resizeMode="contain"
                                  />
                                ) : (
                                  <View className="w-full h-full bg-green-500 items-center justify-center">
                                    <Text className="text-white font-semibold text-lg">
                                      {sponsor.name ? sponsor.name.charAt(0).toUpperCase() : 'S'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View className="flex-1">
                                <Text className="text-gray-800 font-medium">{sponsor.name}</Text>
                                {sponsor.contact_person && (
                                  <Text className="text-gray-500 text-sm">{sponsor.contact_person}</Text>
                                )}
                                {sponsor.role && (
                                  <Text className="text-gray-400 text-sm">{sponsor.role}</Text>
                                )}
                                {sponsor.contribution && (
                                  <Text className="text-gray-400 text-sm">{sponsor.contribution}</Text>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

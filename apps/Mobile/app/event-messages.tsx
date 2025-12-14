import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { EventMessageService, EventMessage } from '../lib/eventMessageService';
import { EventService } from '../lib/eventService';
import { useAuth } from '../lib/authContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { NetworkStatusMonitor } from '../lib/offline/networkStatus';

export default function EventMessages() {
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatIsOpen, setChatIsOpen] = useState(true);
  const [loadingChatStatus, setLoadingChatStatus] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (eventId && user?.id) {
      loadChatStatus();
      loadMessages();
      loadEventTitle();

      // Set up real-time subscription
      if (NetworkStatusMonitor.isOnline()) {
        const channel = supabase
          .channel(`event_messages:${eventId}:${user.id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'event_messages',
            filter: `event_id=eq.${eventId}`,
          }, () => {
            loadMessages();
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'event_chat_settings',
            filter: `event_id=eq.${eventId}`,
          }, () => {
            loadChatStatus();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [eventId, user?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadEventTitle = async () => {
    if (!eventId) return;
    try {
      const result = await EventService.getEventById(eventId);
      if (result.event) {
        setEventTitle(result.event.title);
      }
    } catch (error) {
      console.error('Failed to load event title:', error);
    }
  };

  const loadChatStatus = async () => {
    if (!eventId) return;
    try {
      setLoadingChatStatus(true);
      const result = await EventMessageService.getChatSettings(eventId);
      if (!result.error && result.isOpen !== undefined) {
        setChatIsOpen(result.isOpen);
      }
    } catch (error) {
      console.error('Failed to load chat status:', error);
    } finally {
      setLoadingChatStatus(false);
    }
  };

  const loadMessages = async () => {
    if (!eventId || !user?.id) return;

    try {
      setLoading(true);
      const result = await EventMessageService.getEventMessages(eventId, user.id);

      if (result.error) {
        toast.show(result.error, 'error');
      } else {
        setMessages(result.messages || []);
      }
    } catch (error) {
      toast.show('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !eventId || !user?.id || sending) return;

    try {
      setSending(true);
      const result = await EventMessageService.sendMessage(
        eventId,
        user.id,
        newMessage
      );

      if (result.error) {
        toast.show(result.error, 'error');
      } else if (result.message) {
        setNewMessage('');
        setMessages(prev => [...prev, result.message!]);
        if (result.queued) {
          toast.show('Message saved offline. Will be sent when online.', 'info');
        }
      }
    } catch (error) {
      toast.show('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
            backgroundColor: '#fff',
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>
              Contact Organizer
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }} numberOfLines={1}>
              {eventTitle || 'Event'}
            </Text>
            {!chatIsOpen && (
              <View
                style={{
                  marginTop: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: '#fef3c7',
                  borderWidth: 1,
                  borderColor: '#fcd34d',
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '500' }}>
                  ⚠️ Chat is currently closed by the organizer
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: '#f9fafb' }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 20,
          }}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {loading && messages.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
              <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 16 }}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id;
              const senderName = message.sender?.first_name && message.sender?.last_name
                ? `${message.sender.first_name} ${message.sender.last_name}`
                : message.sender?.email || 'User';

              return (
                <View
                  key={message.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      maxWidth: '75%',
                      backgroundColor: isOwnMessage ? '#3b82f6' : '#fff',
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: isOwnMessage ? 0 : 1,
                      borderColor: '#e5e7eb',
                    }}
                  >
                    {!isOwnMessage && (
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: 4,
                        }}
                      >
                        {senderName}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 15,
                        color: isOwnMessage ? '#fff' : '#1f2937',
                        lineHeight: 20,
                      }}
                    >
                      {message.message}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: isOwnMessage ? '#bfdbfe' : '#9ca3af',
                        marginTop: 4,
                      }}
                    >
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            backgroundColor: '#fff',
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          }}
        >
          {!chatIsOpen ? (
            <View
              style={{
                backgroundColor: '#f3f4f6',
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                The chat for this event is currently closed. You cannot send messages at this time.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type your message..."
                placeholderTextColor="#9ca3af"
                multiline
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  fontSize: 15,
                  maxHeight: 100,
                  backgroundColor: '#fff',
                }}
                editable={!sending && chatIsOpen}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending || !chatIsOpen}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !newMessage.trim() || sending || !chatIsOpen ? 0.5 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

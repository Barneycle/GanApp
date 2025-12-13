import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

let MediaLibrary: any = null;
try {
  MediaLibrary = require('expo-media-library');
} catch (e) {
  console.log('expo-media-library not available:', e);
}

// Get web app URL - supports environment variable or platform-specific defaults
const getWebAppUrl = (): string => {
  // Check for environment variable first (for physical devices or custom setup)
  // This allows easy switching between local and Vercel for testing
  if (process.env.EXPO_PUBLIC_WEB_APP_URL) {
    // Remove trailing slash if present to avoid double slashes in URL construction
    return process.env.EXPO_PUBLIC_WEB_APP_URL.replace(/\/$/, '');
  }
  
  if (__DEV__) {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    // iOS simulator can use localhost directly
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5173';
    } else {
      return 'http://localhost:5173';
    }
  }
  
  // Production URL - Vercel deployment
  return 'https://gan-app-nu.vercel.app';
};

const WEB_APP_URL = getWebAppUrl();

export default function Certificate() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const eventId = params.eventId as string;
  
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string>('');
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUrlRef = useRef<string>('');
  const readyMessageReceivedRef = useRef(false);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setSessionToken(session.access_token);
          console.log('✅ Session token obtained');
        } else {
          console.warn('⚠️ No session token available');
        }
      } catch (error) {
        console.error('❌ Error getting session:', error);
      }
    };
    getSession();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!eventId) {
      setError('Event ID is required');
      return;
    }
    // Ensure proper URL construction (handle base URL with or without trailing slash)
    const baseUrl = WEB_APP_URL.replace(/\/$/, '');
    const url = `${baseUrl}/certificate?eventId=${encodeURIComponent(eventId)}&mobile=true${sessionToken ? `&token=${encodeURIComponent(sessionToken)}` : ''}`;
    setWebViewUrl(url);
    console.log('🌐 WebView URL:', url);
  }, [eventId, sessionToken]);

  const handleClose = () => {
    console.log('🔙 Closing certificate screen');
    router.back();
  };

  const handleDownload = async (base64Data: string, filename: string, mimeType: string) => {
    try {
      console.log('📥 Starting download:', filename);
      
      // Remove data URL prefix if present
      const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      // Create file URI
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      // Write file to cache
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('✅ File written to:', fileUri);
      
      // Try to save to media library if available
      if (MediaLibrary && MediaLibrary.requestPermissionsAsync && MediaLibrary.createAssetAsync) {
        try {
          const permissionResult = await MediaLibrary.requestPermissionsAsync(true);
          
          if (permissionResult.granted) {
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            console.log('✅ Saved to media library:', asset.uri);
            Alert.alert('Success', 'Certificate saved to your gallery!');
            return;
          }
        } catch (mediaError) {
          console.warn('⚠️ Media library save failed:', mediaError);
        }
      }
      
      // Fallback: Use sharing API
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: 'Save Certificate',
        });
      } else {
        Alert.alert('Download Complete', `Certificate saved to: ${fileUri}`);
      }
    } catch (err: any) {
      console.error('❌ Download error:', err);
      Alert.alert('Download Failed', err.message || 'Failed to download certificate');
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message from WebView:', data.type);
      if (data.type === 'close') {
        handleClose();
      } else if (data.type === 'loaded' || data.type === 'ready') {
        // Web app has finished loading, hide loading indicator
        if (!readyMessageReceivedRef.current) {
          console.log('✅ Certificate page is ready');
          readyMessageReceivedRef.current = true;
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          setLoading(false);
        }
      } else if (data.type === 'error') {
        // Web app encountered an error
        console.error('❌ Error from certificate page:', data.message);
        readyMessageReceivedRef.current = true;
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setLoading(false);
        setError(data.message || 'An error occurred while loading the certificate');
      } else if (data.type === 'download') {
        // Handle download from WebView
        console.log('📥 Download request received:', data.format, data.filename);
        if (data.data && data.filename && data.mimeType) {
          handleDownload(data.data, data.filename, data.mimeType);
        } else {
          console.error('❌ Invalid download data:', data);
          Alert.alert('Download Error', 'Invalid download data received');
        }
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  };

  const handleLoadStart = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    const currentUrl = nativeEvent?.url || '';
    
    // Only show loading if URL actually changed (prevent reload loops)
    if (currentUrl && currentUrl !== lastUrlRef.current) {
      console.log('🔄 WebView started loading:', currentUrl);
      lastUrlRef.current = currentUrl;
      readyMessageReceivedRef.current = false; // Reset ready flag on new page load
      setLoading(true);
      setError(null);
      
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set a timeout to hide loading after 30 seconds (in case the page doesn't send a ready message)
      loadingTimeoutRef.current = setTimeout(() => {
        if (!readyMessageReceivedRef.current) {
          console.warn('⏱️ Loading timeout - hiding loading indicator');
          setLoading(false);
        }
        loadingTimeoutRef.current = null;
      }, 30000); // 30 second timeout
    } else {
      console.log('🔄 WebView load start (same URL, ignoring)');
    }
  };

  const handleLoadEnd = () => {
    console.log('✅ WebView finished loading (HTML loaded, waiting for React component)');
    // Don't hide loading here - wait for the React component to send a 'ready' message
    // But set a shorter timeout in case the message never comes
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    // Give the React component 10 seconds to load after HTML is ready
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⏱️ Component loading timeout - hiding loading indicator');
      setLoading(false);
      loadingTimeoutRef.current = null;
    }, 10000); // 10 second timeout after HTML loads
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView error:', nativeEvent);
    setLoading(false);
    setError(nativeEvent.description || `Failed to load certificate page. Please check if the web app is running at ${WEB_APP_URL}`);
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView HTTP error:', nativeEvent);
    setLoading(false);
    setError(`HTTP Error ${nativeEvent.statusCode}: ${nativeEvent.description || 'Failed to load page'}`);
  };

  if (!eventId) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-600 text-lg mb-4 font-semibold">Event ID Required</Text>
          <Text className="text-slate-600 mb-6 text-center">Event ID is missing. Please go back and try again.</Text>
          <TouchableOpacity onPress={handleClose} className="px-6 py-3 bg-blue-600 rounded-lg">
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-4" style={{ paddingTop: insets.top + 20 }}>
          <View className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <Text className="text-red-800 font-semibold text-lg mb-2">Error Loading Certificate</Text>
            <Text className="text-red-600 text-sm mb-4">{error}</Text>
            {__DEV__ && (
              <Text className="text-slate-500 text-xs mb-4 font-mono">URL: {webViewUrl || 'Not set'}</Text>
            )}
            <TouchableOpacity
              onPress={() => {
                setError(null);
                setLoading(true);
                webViewRef.current?.reload();
              }}
              className="bg-red-600 px-4 py-3 rounded-lg items-center mb-2"
            >
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} className="px-4 py-3 rounded-lg items-center">
              <Text className="text-slate-600 font-semibold">Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!webViewUrl) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center" style={{ paddingTop: insets.top }}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-slate-600 mt-4">Preparing certificate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Inject minimal CSS for safe areas (matching other screens)
  const injectedJavaScript = `
    (function() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySafeAreas);
      } else {
        applySafeAreas();
      }
      
      function applySafeAreas() {
        // Add minimal safe area CSS
        const styleId = 'rn-safe-area-style';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = \`
            .mobile-certificate-view {
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
            }
          \`;
          document.head.appendChild(style);
        }
        
        // Ensure viewport meta tag has viewport-fit=cover
        let viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          const content = viewport.getAttribute('content') || '';
          if (!content.includes('viewport-fit=cover')) {
            viewport.setAttribute('content', content + ', viewport-fit=cover');
          }
        } else {
          viewport = document.createElement('meta');
          viewport.name = 'viewport';
          viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
          document.head.appendChild(viewport);
        }
      }
    })();
    true; // Required for iOS
  `;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {loading && (
          <View className="absolute inset-0 items-center justify-center bg-white z-10">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-600 mt-4">Loading certificate...</Text>
            {__DEV__ && (
              <Text className="text-slate-400 text-xs mt-2 text-center px-4" numberOfLines={2}>
                {webViewUrl}
              </Text>
            )}
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={handleHttpError}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={(request) => {
            // Prevent WebView from opening download links or blob URLs in browser
            const url = request.url;
            
            // Block all download-related URLs
            const isDownload = url.includes('.pdf') || 
                              url.includes('.png') || 
                              url.includes('download') || 
                              url.startsWith('blob:') ||
                              url.includes('generated-certificates') ||
                              url.includes('supabase.co/storage');
            
            if (isDownload) {
              // Block download links - they should be handled via postMessage
              console.log('🚫 Blocked download link:', url);
              return false;
            }
            
            // Allow navigation to the same origin (our web app)
            try {
              const webAppOrigin = new URL(WEB_APP_URL).origin;
              const requestOrigin = new URL(url).origin;
              
              if (requestOrigin === webAppOrigin || url === webViewUrl || url.startsWith(webViewUrl)) {
                return true;
              }
            } catch (e) {
              // If URL parsing fails, allow it if it's the same as webViewUrl
              if (url === webViewUrl) {
                return true;
              }
            }
            
            // Block external links
            console.log('🚫 Blocked external link:', url);
            return false;
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsBackForwardNavigationGestures={true}
          injectedJavaScript={injectedJavaScript}
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="automatic"
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        />
      </View>
    </SafeAreaView>
  );
}

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CertificateGenerator from '../CertificateGenerator';
import { supabase } from '../../lib/supabaseClient';

export const CertificatePage = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const isMobile = searchParams.get('mobile') === 'true';
  const accessToken = searchParams.get('accessToken');
  const refreshToken = searchParams.get('refreshToken');

  // Handle token-based authentication from mobile app
  useEffect(() => {
    if (accessToken && refreshToken && isMobile) {
      // Set the session using the tokens from mobile app
      const setSessionFromToken = async () => {
        try {
          // Get current session to check if already authenticated
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          // If no session or different token, set new session
          if (!session || session.access_token !== accessToken) {
            // Decode JWT to get user info (basic validation)
            try {
              const payload = JSON.parse(atob(accessToken.split('.')[1]));
              const expiresAt = payload.exp * 1000; // Convert to milliseconds

              // Check if token is expired
              if (Date.now() >= expiresAt) {
                console.warn('Token is expired');
                // Send error message to mobile app
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: 'Your session has expired. Please log in again.'
                  }));
                }
                return;
              }

              // Use setSession with both access_token and refresh_token
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (error) {
                console.error('Could not set session with token:', error.message);
                // Send error message to mobile app
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: `Authentication failed: ${error.message}`
                  }));
                }
              } else {
                console.log('✅ Session set successfully from token');
                // Force a session refresh to ensure AuthContext picks up the user
                await supabase.auth.getSession();
              }
            } catch (decodeError) {
              console.error('Error decoding token:', decodeError);
              // Send error message to mobile app
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: 'Invalid authentication token'
                }));
              }
            }
          } else {
            console.log('✅ Already authenticated with matching token');
          }
        } catch (error) {
          console.error('Error in token authentication:', error);
          // Send error message to mobile app
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: `Authentication error: ${error.message || 'Unknown error'}`
            }));
          }
        }
      };

      setSessionFromToken();
    }
  }, [accessToken, refreshToken, isMobile]);

  // Hide navbar and add safe area support for mobile WebView
  useEffect(() => {
    if (isMobile) {
      // Hide navbar by adding a class to body
      document.body.classList.add('mobile-certificate-view');

      // Add safe area CSS if not already present
      const styleId = 'mobile-certificate-safe-area';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .mobile-certificate-view {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
          }
          .mobile-certificate-view #root {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }
        `;
        document.head.appendChild(style);
      }

      // Ensure viewport meta tag has viewport-fit=cover
      let viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        const content = viewport.getAttribute('content') || '';
        if (!content.includes('viewport-fit=cover')) {
          viewport.setAttribute('content', `${content}, viewport-fit=cover`);
        }
      } else {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
        document.head.appendChild(viewport);
      }

      return () => {
        document.body.classList.remove('mobile-certificate-view');
        const style = document.getElementById(styleId);
        if (style) {
          style.remove();
        }
      };
    }
  }, [isMobile]);

  const handleClose = () => {
    if (isMobile && window.ReactNativeWebView) {
      // Send message to React Native WebView to close
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close' }));
    } else {
      window.history.back();
    }
  };

  if (!eventId) {
    return (
      <div className={`${isMobile ? 'h-screen' : 'min-h-screen'} bg-slate-50 flex items-center justify-center`}>
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Error</h2>
          <p className="text-slate-600 mb-6">Event ID is required to generate a certificate.</p>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? 'h-screen overflow-hidden' : ''}>
      <CertificateGenerator eventId={eventId} onClose={handleClose} isMobile={isMobile} />
    </div>
  );
};


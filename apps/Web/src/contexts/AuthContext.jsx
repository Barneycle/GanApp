import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserService } from '../services/userService';
import { supabase } from '../lib/supabaseClient';
import { logActivity } from '../utils/activityLogger';

// Helper to set user in error tracking
const setErrorTrackingUser = (user) => {
  if (user) {
    import('../services/errorTrackingService').then(({ ErrorTrackingService }) => {
      ErrorTrackingService.setUser({
        id: user.id,
        email: user.email,
        username: user.email,
      });
    }).catch(() => {
      // Error tracking not available - that's okay
    });
  } else {
    import('../services/errorTrackingService').then(({ ErrorTrackingService }) => {
      ErrorTrackingService.setUser(null);
    }).catch(() => {
      // Error tracking not available - that's okay
    });
  }
};

const AuthContext = createContext();

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedUser = useRef(false);
  const isInitializing = useRef(true);
  const banMessageRef = useRef(null);

  const checkBannedStatus = async (authUser) => {
    if (!authUser) return null;

    const metadata = authUser.user_metadata || {};
    const bannedUntilRaw = metadata?.banned_until;
    const isActiveMeta = metadata?.is_active;
    const now = new Date();
    const bannedUntil = bannedUntilRaw ? new Date(bannedUntilRaw) : null;

    if ((bannedUntil && bannedUntil > now) || isActiveMeta === false) {
      await supabase.auth.signOut();
      const message = bannedUntil && bannedUntil > now
        ? `Your account is banned until ${bannedUntil.toLocaleString()}. Please contact support.`
        : 'Your account is currently inactive. Please contact support.';
      banMessageRef.current = message;
      setUser(null);
      setError(message);
      return message;
    }

    banMessageRef.current = null;
    return null;
  };

  // Function to check and clear Supabase storage
  const clearSupabaseStorage = () => {
    // Clear all possible Supabase storage keys
    const supabaseKeys = [
      'sb-hekjabrlgdpbffzidshz-auth-token',
      'sb-hekjabrlgdpbffzidshz-auth-refresh-token',
      'supabase.auth.token',
      'supabase.auth.refreshToken',
      'supabase.auth.expires_at',
      'supabase.auth.expires_in',
      'supabase.auth.refresh_token',
      'supabase.auth.access_token',
      'supabase.auth.user'
    ];
    
    supabaseKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Also clear any keys that start with 'sb-'
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  // Function to clear all auth data
  const clearAuthData = async () => {
    try {
      // Clear Supabase session first
      await supabase.auth.signOut();
      
      // Clear Supabase-specific storage
      clearSupabaseStorage();
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Clear user state
      setUser(null);
      hasFetchedUser.current = false;
      isInitializing.current = true;
      
      // Force a page reload to clear any remaining auth state
      window.location.reload();
    } catch (error) {
      // Error clearing auth data
    }
  };

  // Get initial session
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        // Small delay to ensure any pending sign out operations complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // If there's an error getting session, clear any stale storage
          clearSupabaseStorage();
          setError(error.message);
          setLoading(false);
          isInitializing.current = false;
        } else if (session && session.user) {
          // Verify the session is valid by checking if user exists
          if (!session.user.id || !session.user.email) {
            // Invalid session, clear it
            await supabase.auth.signOut();
            clearSupabaseStorage();
            setLoading(false);
            isInitializing.current = false;
            return;
          }
          
          const bannedMessage = await checkBannedStatus(session.user);
          if (bannedMessage) {
            setLoading(false);
            isInitializing.current = false;
            return;
          }
          // Use Supabase Auth user directly (like before migration)
          const userData = {
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role || 'participant',
            prefix: session.user.user_metadata?.prefix || '',
            first_name: session.user.user_metadata?.first_name || '',
            middle_initial: session.user.user_metadata?.middle_initial || '',
            last_name: session.user.user_metadata?.last_name || '',
            affix: session.user.user_metadata?.affix || '',
            avatar_url: session.user.user_metadata?.avatar_url || '',
            affiliated_organization: session.user.user_metadata?.affiliated_organization || '',
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          };
          setUser(userData);
          setErrorTrackingUser(userData);
          hasFetchedUser.current = true;
          setLoading(false);
          isInitializing.current = false;
        } else {
          // No session found, ensure storage is clear
          clearSupabaseStorage();
          setLoading(false);
          isInitializing.current = false;
        }
      } catch (err) {
        // On error, clear storage and reset
        clearSupabaseStorage();
        setError(err.message || 'Failed to check authentication session');
        setLoading(false);
        isInitializing.current = false;
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      isInitializing.current = false;
    }, 10000); // 10 second timeout

    getInitialSession().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        // Only handle auth state changes if we're not in the initializing phase
        if (!isInitializing.current) {
          if (event === 'SIGNED_IN' && session) {
            try {
              const bannedMessage = await checkBannedStatus(session.user);
              if (bannedMessage) {
                return;
              }
              // Use Supabase Auth user directly (like before migration)
              const userData = {
                id: session.user.id,
                email: session.user.email,
                role: session.user.user_metadata?.role || 'participant',
                prefix: session.user.user_metadata?.prefix || '',
                first_name: session.user.user_metadata?.first_name || '',
                middle_initial: session.user.user_metadata?.middle_initial || '',
                last_name: session.user.user_metadata?.last_name || '',
                affix: session.user.user_metadata?.affix || '',
                avatar_url: session.user.user_metadata?.avatar_url || '',
                affiliated_organization: session.user.user_metadata?.affiliated_organization || '',
                created_at: session.user.created_at,
                updated_at: session.user.updated_at || session.user.created_at
              };
              setUser(userData);
              setErrorTrackingUser(userData);
              setError(null);
              hasFetchedUser.current = true;
            } catch (error) {
              setError('Failed to fetch user data');
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setErrorTrackingUser(null);
            setError(null);
            hasFetchedUser.current = false;
          }
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Get redirect path based on user role only
  const getRedirectPath = (user) => {
    if (!user) return '/';
    
    // Only use the role field for redirection
    if (user.role === 'admin') {
      return '/admin';
    } else if (user.role === 'organizer') {
      return '/organizer';
    } else if (user.role === 'participant') {
      return '/participants';
    }
    
    // If no role is set, default to home
    return '/';
  };

  // Sign in function with email
  const signIn = async (email, password, rememberMe = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await UserService.signIn(email, password, rememberMe);
      if (result.user) {
        setUser(result.user);
        setErrorTrackingUser(result.user);
        setLoading(false);
        
        // Log activity
        logActivity(
          result.user.id,
          'login',
          'user',
          {
            resourceId: result.user.id,
            resourceName: result.user.email || result.user.id,
            details: { user_id: result.user.id, email: result.user.email }
          }
        ).catch(err => console.error('Failed to log login:', err));
        
        const redirectPath = getRedirectPath(result.user);
        return { success: true, user: result.user, redirectPath };
      } else {
        if (result.error) {
          banMessageRef.current = result.error;
          // Format error message based on errorType for better user feedback
          let formattedError = result.error;
          if (result.errorType === 'email') {
            formattedError = 'Email is wrong. No account found with this email address. Please check your email or sign up.';
          } else if (result.errorType === 'password') {
            formattedError = 'Password is wrong. Please try again or use "Forgot password?" to reset.';
          } else if (result.error && result.error.toLowerCase().includes('invalid login credentials')) {
            // For generic "Invalid login credentials", default to password error
            formattedError = 'Password is wrong. Please check your password and try again.';
          }
          setError(formattedError);
        }
        setLoading(false);
        return { success: false, error: result.error, errorType: result.errorType };
      }
    } catch (error) {
      setError('An unexpected error occurred');
      setLoading(false);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Sign up function
  const signUp = async (email, password, userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await UserService.signUp(email, password, userData);
      
      if (result.user) {
        setUser(result.user);
        setErrorTrackingUser(result.user);
        setLoading(false);
        return { success: true, user: result.user, message: result.message };
      } else {
        setError(result.error);
        setLoading(false);
        return { success: false, error: result.error };
      }
    } catch (error) {
      setError('An unexpected error occurred');
      setLoading(false);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Save user info for logging before clearing state
      const currentUser = user;
      
      // Clear user state first
      setUser(null);
      setErrorTrackingUser(null);
      hasFetchedUser.current = false;
      isInitializing.current = true;
      
      // Sign out from Supabase with timeout
      const signOutPromise = UserService.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignOut timeout after 10 seconds')), 10000)
      );
      
      let result;
      try {
        result = await Promise.race([signOutPromise, timeoutPromise]);
      } catch (timeoutError) {
        result = { error: 'SignOut timed out' };
      }
      
      // Always clear storage, even if signOut had an error
      clearSupabaseStorage();
      
      // Double-check session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Force sign out again if session still exists
        await supabase.auth.signOut();
        clearSupabaseStorage();
      }
      
      if (result.error) {
        setError(result.error);
        setLoading(false);
        isInitializing.current = false;
        return { success: false, error: result.error };
      }

      // Log activity (after successful sign out)
      if (currentUser?.id) {
        logActivity(
          currentUser.id,
          'logout',
          'user',
          {
            resourceId: currentUser.id,
            resourceName: currentUser.email || currentUser.id,
            details: { user_id: currentUser.id, email: currentUser.email }
          }
        ).catch(err => console.error('Failed to log logout:', err));
      }

      isInitializing.current = false;
      return { success: true };
    } catch (err) {
      // Even on error, clear storage
      clearSupabaseStorage();
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      setLoading(false);
      isInitializing.current = false;
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
    banMessageRef.current = null;
  };

  // Get current user function
  const getCurrentUser = () => {
    return user;
  };

  // Refresh user data from Supabase
  const refreshUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (session) {
        const bannedMessage = await checkBannedStatus(session.user);
        if (bannedMessage) {
          return;
        }
        
        // Fetch updated user profile
        const userData = await UserService.getCurrentUser();
        if (userData && !userData.error) {
          setUser(userData);
          setErrorTrackingUser(userData);
        } else {
          // Fallback to metadata if getCurrentUser fails
          const userDataFromMetadata = {
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role || 'participant',
            prefix: session.user.user_metadata?.prefix || '',
            first_name: session.user.user_metadata?.first_name || '',
            middle_initial: session.user.user_metadata?.middle_initial || '',
            last_name: session.user.user_metadata?.last_name || '',
            affix: session.user.user_metadata?.affix || '',
            avatar_url: session.user.user_metadata?.avatar_url || '',
            affiliated_organization: session.user.user_metadata?.affiliated_organization || '',
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          };
          setUser(userDataFromMetadata);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh user data');
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
    getCurrentUser,
    getRedirectPath,
    clearAuthData,
    refreshUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth };


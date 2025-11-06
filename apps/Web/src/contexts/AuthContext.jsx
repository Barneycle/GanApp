import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserService } from '../services/userService';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedUser = useRef(false);
  const isInitializing = useRef(true);

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
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setError(error.message);
          setLoading(false);
          isInitializing.current = false;
        } else if (session) {
          // Use Supabase Auth user directly (like before migration)
          const userData = {
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role || 'participant',
            first_name: session.user.user_metadata?.first_name || '',
            last_name: session.user.user_metadata?.last_name || '',
            avatar_url: session.user.user_metadata?.avatar_url || '',
            affiliated_organization: session.user.user_metadata?.affiliated_organization || '',
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          };
          setUser(userData);
          hasFetchedUser.current = true;
          setLoading(false);
          isInitializing.current = false;
        } else {
          setLoading(false);
          isInitializing.current = false;
        }
      } catch (err) {
        setError(err.message);
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
              // Use Supabase Auth user directly (like before migration)
              const userData = {
                id: session.user.id,
                email: session.user.email,
                role: session.user.user_metadata?.role || 'participant',
                first_name: session.user.user_metadata?.first_name || '',
                last_name: session.user.user_metadata?.last_name || '',
                avatar_url: session.user.user_metadata?.avatar_url || '',
                affiliated_organization: session.user.user_metadata?.affiliated_organization || '',
                created_at: session.user.created_at,
                updated_at: session.user.updated_at || session.user.created_at
              };
              setUser(userData);
              setError(null);
              hasFetchedUser.current = true;
            } catch (error) {
              setError('Failed to fetch user data');
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
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
  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await UserService.signIn(email, password);
      
      if (result.user) {
        setUser(result.user);
        setLoading(false);
        const redirectPath = getRedirectPath(result.user);
        return { success: true, user: result.user, redirectPath };
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

  // Sign up function
  const signUp = async (email, password, userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await UserService.signUp(email, password, userData);
      
      if (result.user) {
        setUser(result.user);
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
      
      // Clear user state first
      setUser(null);
      hasFetchedUser.current = false;
      
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
      
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Get current user function
  const getCurrentUser = () => {
    return user;
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
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


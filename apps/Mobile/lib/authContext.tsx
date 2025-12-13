import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { UserService, User } from './userService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: string | null; errorType?: 'email' | 'password' | 'generic' }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: 'admin' | 'organizer' | 'participant') => Promise<{ user: User | null; error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize push notifications
    const initPushNotifications = async () => {
      try {
        const { PushNotificationService } = await import('./pushNotificationService');
        const token = await PushNotificationService.getPushToken();
        if (token && user?.id) {
          await PushNotificationService.registerPushToken(user.id, token);
        }
      } catch (err) {
        console.error('Failed to initialize push notifications:', err);
      }
    };

    // Check if user is already signed in
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setUser(null);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      setUser(null);
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error loading user profile:', error);
        setUser(null);
      } else if (authUser) {
        // Create user profile from Supabase Auth user data
        // Only use metadata values if they exist and are not empty
        const affiliatedOrg = authUser.user_metadata?.affiliated_organization;
        const hasAffiliatedOrg = affiliatedOrg && typeof affiliatedOrg === 'string' && affiliatedOrg.trim() !== '';
        
        const userProfile: User = {
          id: authUser.id,
          email: authUser.email || '',
          prefix: authUser.user_metadata?.prefix && authUser.user_metadata.prefix.trim() !== '' 
            ? authUser.user_metadata.prefix 
            : '',
          first_name: authUser.user_metadata?.first_name && authUser.user_metadata.first_name.trim() !== '' 
            ? authUser.user_metadata.first_name 
            : '',
          middle_initial: authUser.user_metadata?.middle_initial && authUser.user_metadata.middle_initial.trim() !== '' 
            ? authUser.user_metadata.middle_initial 
            : '',
          last_name: authUser.user_metadata?.last_name && authUser.user_metadata.last_name.trim() !== '' 
            ? authUser.user_metadata.last_name 
            : '',
          affix: authUser.user_metadata?.affix && authUser.user_metadata.affix.trim() !== '' 
            ? authUser.user_metadata.affix 
            : '',
          affiliated_organization: hasAffiliatedOrg ? affiliatedOrg.trim() : '',
          avatar_url: authUser.user_metadata?.avatar_url && authUser.user_metadata.avatar_url.trim() !== ''
            ? authUser.user_metadata.avatar_url
            : '',
          role: authUser.user_metadata?.role || 'participant',
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: authUser.updated_at || new Date().toISOString(),
        };
        
        setUser(userProfile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Unexpected error loading user profile:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await UserService.signIn(email, password);

      if (result.error) {
        // Format error message based on errorType for better user feedback
        // But don't format generic "Invalid login credentials" - let login.tsx check email first
        let formattedError = result.error;
        if (result.errorType === 'email') {
          formattedError = 'Email is wrong. No account found with this email address. Please check your email or sign up.';
        } else if (result.errorType === 'password') {
          formattedError = 'Password is wrong. Please try again or use "Forgot password?" to reset.';
        }
        // For generic errors, pass through the original error so login.tsx can check email
        return { user: null, error: formattedError, errorType: result.errorType };
      }

      if (result.user) {
        setUser(result.user);
        return { user: result.user, error: null };
      }

      return { user: null, error: 'Failed to sign in' };
    } catch (error) {
      console.error('Unexpected error in signIn:', error);
      return { user: null, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: 'admin' | 'organizer' | 'participant' = 'participant') => {
    try {
      setIsLoading(true);
      
      // Prepare user data for registration (matching Web version)
      const userData = {
        first_name: firstName,
        last_name: lastName,
        role: role,
      };

      const result = await UserService.signUp(email, password, userData);

      if (result.error) {
        return { user: null, error: result.error };
      }

      if (result.user) {
        setUser(result.user);
        return { user: result.user, error: null };
      }

      return { user: null, error: 'Failed to create user' };
    } catch (error) {
      console.error('Unexpected error in signUp:', error);
      return { user: null, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      setUser(null);
      return { error: null };
    } catch (error) {
      console.error('Unexpected error in signOut:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      // Force a session refresh to get latest metadata
      // First, refresh the session to ensure we have the latest data
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        // Wait a moment for metadata to sync
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get fresh user data
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error refreshing user:', error);
          setIsLoading(false);
          return;
        }
        
        if (authUser) {
          await loadUserProfile(authUser.id);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

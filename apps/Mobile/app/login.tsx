import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useAuth } from '../lib/authContext';

// Simple in-memory storage fallback
const storage = {
  _data: {} as Record<string, string>,
  async getItem(key: string): Promise<string | null> {
    try {
      const value = this._data[key];
      return value || null;
    } catch (error) {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    this._data[key] = value;
  },
  async removeItem(key: string): Promise<void> {
    delete this._data[key];
  },
};

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginDashboard() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const { signIn, user } = useAuth();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Store input Y positions for scrolling
  const inputYPositions = useRef<{ [key: string]: number }>({});
  const buttonYPosition = useRef<number>(0);

  // Handle keyboard show/hide and scroll to focused input
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Find which input is focused and scroll to it
        let focusedField: string | null = null;
        if (emailRef.current?.isFocused()) {
          focusedField = 'email';
        } else if (passwordRef.current?.isFocused()) {
          focusedField = 'password';
        }

        if (focusedField && inputYPositions.current[focusedField] !== undefined) {
          const keyboardHeight = e.endCoordinates.height;
          const inputY = inputYPositions.current[focusedField];
          
          // For password field, scroll enough to show the button as well
          if (focusedField === 'password') {
            // Scroll to show both the input and the button below it
            const screenHeight = Dimensions.get('window').height;
            const availableHeight = screenHeight - keyboardHeight;
            
            // If button position is known, scroll to show it with some padding
            if (buttonYPosition.current > 0) {
              const buttonBottom = buttonYPosition.current + 60; // Button height + padding
              const scrollY = Math.max(0, buttonBottom - availableHeight + 20);
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  y: scrollY,
                  animated: true,
                });
              }, 150);
            } else {
              // Fallback: scroll more for password field to show button
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, inputY - 250),
                  animated: true,
                });
              }, 150);
            }
          } else {
            // For email field, scroll to position input above keyboard with padding
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, inputY - 120),
                animated: true,
              });
            }, 100);
          }
        }
      }
    );

    return () => {
      keyboardWillShowListener.remove();
    };
  }, []);

  // Helper to store input Y position when layout changes
  const handleInputLayout = (field: string) => (event: any) => {
    const { y } = event.nativeEvent.layout;
    // Get the absolute Y position in window
    event.target.measureInWindow((x: number, yPos: number, width: number, height: number) => {
      inputYPositions.current[field] = yPos;
    });
  };

  // Load saved email on mount
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await storage.getItem('remembered_email');
        const shouldRemember = await storage.getItem('remember_me');
        if (savedEmail && shouldRemember === 'true') {
          // Trim saved email when loading
          const trimmedEmail = savedEmail.trim();
          setFormData(prev => ({ ...prev, email: trimmedEmail }));
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Error loading saved email:', error);
      }
    };
    loadSavedEmail();
  }, []);

  // Automatically redirect to tabs when user signs in
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputBlur = (field: keyof LoginFormData) => {
    // Trim values when field loses focus
    setFormData(prev => ({ ...prev, [field]: prev[field].trim() }));
  };

  const handleLogin = async () => {
    // Trim email and password before validation and submission
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signIn(trimmedEmail, trimmedPassword);
      
      if (result.error) {
        Alert.alert('Error', result.error);
      } else if (result.user) {
        // Save email if remember me is checked (non-blocking)
        try {
          if (rememberMe) {
            await storage.setItem('remembered_email', trimmedEmail);
            await storage.setItem('remember_me', 'true');
          } else {
            // Clear saved email if remember me is unchecked
            await storage.removeItem('remembered_email');
            await storage.removeItem('remember_me');
          }
        } catch (storageError) {
          console.error('Error saving remember me preference:', storageError);
          // Don't show error to user - sign-in was successful
        }
      }
      // Navigation will be handled automatically by useEffect when user state updates
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Password reset link has been sent to your email',
      [{ text: 'OK' }]
    );
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(
      'Social Login',
      `Continue with ${provider}`,
      [{ text: 'OK' }]
    );
  };

  const handleRememberMeToggle = async () => {
    const newValue = !rememberMe;
    setRememberMe(newValue);
    
    // Clear saved email if unchecking remember me
    if (!newValue) {
      try {
        await storage.removeItem('remembered_email');
        await storage.removeItem('remember_me');
      } catch (error) {
        console.error('Error clearing remembered email:', error);
      }
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-blue-900">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ 
              flexGrow: 1,
              paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 20) + 300
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            keyboardDismissMode="interactive"
            className="px-6 py-8"
          >
            {/* Centered Content Container */}
            <View className="flex-1 justify-center">
              {/* Header */}
              <View className="items-center mb-12">
                <Text className="text-6xl font-black text-white mb-6 tracking-tight">GanApp</Text>
                <Text className="text-2xl font-bold text-white mb-3 text-center">Welcome Back!</Text>
                <Text className="text-lg text-blue-100 text-center px-4">Sign in to your account</Text>
              </View>

              {/* Login Form Container */}
              <View className="rounded-3xl p-8 shadow-2xl mx-2 border border-slate-100" style={{ backgroundColor: '#FAFAFA' }}>
                {/* Email Input */}
                <View 
                  className="mb-6"
                  onLayout={handleInputLayout('email')}
                >
                  <Text className="text-lg font-bold text-slate-900 mb-3">Email Address</Text>
                  <View className="flex-row items-center border-2 border-slate-200 rounded-2xl px-5 bg-slate-50 h-14">
                    <Ionicons name="mail-outline" size={22} color="#6b7280" style={{ marginRight: 12 }} />
                    <TextInput
                      ref={emailRef}
                      className="flex-1 h-full text-lg text-slate-900"
                      placeholder="Enter your email address"
                      placeholderTextColor="#9ca3af"
                      value={formData.email}
                      onChangeText={(text) => handleInputChange('email', text)}
                      onBlur={() => handleInputBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View 
                  className="mb-6"
                  onLayout={handleInputLayout('password')}
                >
                  <Text className="text-lg font-bold text-slate-900 mb-3">Password</Text>
                  <View className="flex-row items-center border-2 border-slate-200 rounded-2xl px-5 bg-slate-50 h-14">
                    <Ionicons name="lock-closed-outline" size={22} color="#6b7280" style={{ marginRight: 12 }} />
                    <TextInput
                      ref={passwordRef}
                      className="flex-1 h-full text-lg text-slate-900"
                      placeholder="Enter your password"
                      placeholderTextColor="#9ca3af"
                      value={formData.password}
                      onChangeText={(text) => handleInputChange('password', text)}
                      onBlur={() => handleInputBlur('password')}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={() => {
                        passwordRef.current?.blur();
                        Keyboard.dismiss();
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="p-2"
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Remember Me and Forgot Password Row */}
                <View className="flex-row items-center justify-between mb-8">
                  {/* Remember Me Checkbox */}
                  <TouchableOpacity
                    className="flex-row items-center"
                    onPress={handleRememberMeToggle}
                  >
                    <View className={`w-6 h-6 border-2 rounded-lg mr-3 items-center justify-center ${rememberMe ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                      {rememberMe && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text className="text-base text-slate-700 font-medium">Remember Me</Text>
                  </TouchableOpacity>

                  {/* Forgot Password */}
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text className="text-white text-base font-semibold underline">Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <View
                  onLayout={(e) => {
                    e.target.measureInWindow((x: number, y: number, width: number, height: number) => {
                      buttonYPosition.current = y;
                    });
                  }}
                >
                  <TouchableOpacity
                    className={`bg-blue-700 rounded-2xl py-5 items-center mb-6 shadow-lg ${isLoading ? 'bg-blue-400' : ''}`}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    <Text className="text-white text-lg font-bold">
                      {isLoading ? 'Logging In...' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View className="flex-row items-center mb-6">
                  <View className="flex-1 h-px bg-slate-200" />
                  <Text className="px-4 text-slate-500 text-base font-medium">or</Text>
                  <View className="flex-1 h-px bg-slate-200" />
                </View>

                {/* Create New Account Button */}
                <TouchableOpacity
                  className="border-2 border-slate-200 rounded-2xl py-5 items-center"
                  onPress={() => router.push('/registration')}
                >
                  <Text className="text-blue-900 text-lg font-bold">Create New Account</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Bottom Spacing */}
            <View className="h-6" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

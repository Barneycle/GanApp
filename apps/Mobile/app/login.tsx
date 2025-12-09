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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useAuth } from '../lib/authContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserService } from '../lib/userService';
import { useToast } from '../components/Toast';

// Storage keys for remember me functionality
const REMEMBER_ME_KEY = 'remember_me';
const REMEMBERED_EMAIL_KEY = 'remembered_email';

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const { signIn, user } = useAuth();
  const toast = useToast();
  
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

  // Load saved email on mount (email pre-fill)
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
        const shouldRemember = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        
        if (savedEmail && shouldRemember === 'true') {
          // Trim saved email when loading
          const trimmedEmail = savedEmail.trim();
          if (trimmedEmail) {
            setFormData(prev => ({ ...prev, email: trimmedEmail }));
            setRememberMe(true);
          }
        }
      } catch (error: any) {
        // Silently fail - don't break the login flow
        // Only log if it's not a ReferenceError (which might be a module loading issue)
        if (error?.name !== 'ReferenceError') {
          console.error('Error loading saved email:', error);
        }
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
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signIn(trimmedEmail, trimmedPassword);
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.user) {
        toast.success('Successfully signed in!');
        // Save email if remember me is checked (non-blocking)
        try {
          if (rememberMe) {
            await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
            await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
          } else {
            // Clear saved email if remember me is unchecked
            await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
            await AsyncStorage.removeItem(REMEMBER_ME_KEY);
          }
        } catch (storageError: any) {
          // Don't show error to user - sign-in was successful
          if (storageError?.name !== 'ReferenceError') {
            console.error('Error saving remember me preference:', storageError);
          }
        }
      }
      // Navigation will be handled automatically by useEffect when user state updates
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Pre-fill email if available
    const emailToUse = formData.email.trim() || forgotPasswordEmail.trim();
    setForgotPasswordEmail(emailToUse);
    setShowForgotPassword(true);
    setResetSent(false);
  };

  const handleSendResetEmail = async () => {
    const trimmedEmail = forgotPasswordEmail.trim();
    
    if (!trimmedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingReset(true);

    try {
      const result = await UserService.resetPassword(trimmedEmail);
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        setResetSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setResetSent(false);
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`Social login with ${provider} is coming soon!`);
  };

  const handleRememberMeToggle = async () => {
    const newValue = !rememberMe;
    setRememberMe(newValue);
    
    try {
      // Clear saved email if unchecking remember me
      if (!newValue) {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
      } else {
        // If checking remember me and email is filled, save it immediately
        const trimmedEmail = formData.email.trim();
        if (trimmedEmail) {
          await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
          await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
        }
      }
    } catch (error: any) {
      // Silently fail - don't break the UI
      if (error?.name !== 'ReferenceError') {
        console.error('Error toggling remember me:', error);
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
            scrollEnabled={false}
            contentContainerStyle={{ 
          flexGrow: 1,
          paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 20)
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
                <Text 
                  className="text-6xl font-black text-white mb-6 tracking-tight"
                  style={{ fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif' }}
                >GanApp</Text>
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
                  <Text className="text-blue-700 text-base font-semibold underline">Forgot Password?</Text>
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

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotPassword}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseForgotPassword}
        >
          <SafeAreaView className="flex-1 bg-blue-900">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingTop: insets.top + 20,
                  paddingBottom: Math.max(insets.bottom, 20),
                  paddingHorizontal: 24,
                }}
                keyboardShouldPersistTaps="handled"
              >
                <View className="flex-1 justify-center">
                  {/* Header */}
                  <View className="mb-8">
                    <TouchableOpacity
                      onPress={handleCloseForgotPassword}
                      className="mb-6 self-start"
                    >
                      <Ionicons name="close" size={28} color="#ffffff" />
                    </TouchableOpacity>
                    <Text className="text-4xl font-bold text-white mb-3">
                      Forgot Password?
                    </Text>
                    <Text className="text-lg text-blue-100">
                      {resetSent
                        ? 'Check your email for the password reset link.'
                        : 'Enter your email address and we\'ll send you a link to reset your password.'}
                    </Text>
                  </View>

                  {!resetSent ? (
                    <>
                      {/* Email Input */}
                      <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-3">
                          Email Address
                        </Text>
                        <View className="flex-row items-center border-2 border-blue-700 rounded-2xl px-5 bg-white h-14">
                          <Ionicons name="mail-outline" size={22} color="#1e40af" style={{ marginRight: 12 }} />
                          <TextInput
                            className="flex-1 h-full text-lg text-slate-900"
                            placeholder="Enter your email address"
                            placeholderTextColor="#9ca3af"
                            value={forgotPasswordEmail}
                            onChangeText={setForgotPasswordEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            returnKeyType="send"
                            onSubmitEditing={handleSendResetEmail}
                            editable={!isSendingReset}
                          />
                        </View>
                      </View>

                      {/* Send Reset Email Button */}
                      <TouchableOpacity
                        className={`bg-blue-700 rounded-2xl py-5 items-center mb-4 shadow-lg ${isSendingReset ? 'bg-blue-400' : ''}`}
                        onPress={handleSendResetEmail}
                        disabled={isSendingReset}
                      >
                        {isSendingReset ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text className="text-white text-lg font-bold">
                            Send Reset Link
                          </Text>
                        )}
                      </TouchableOpacity>

                      {/* Cancel Button */}
                      <TouchableOpacity
                        className="border-2 border-blue-600 rounded-2xl py-5 items-center"
                        onPress={handleCloseForgotPassword}
                        disabled={isSendingReset}
                      >
                        <Text className="text-blue-200 text-lg font-bold">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {/* Success State */}
                      <View className="items-center mb-8">
                        <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-4">
                          <Ionicons name="checkmark" size={40} color="#ffffff" />
                        </View>
                        <Text className="text-xl font-bold text-white mb-2 text-center">
                          Email Sent!
                        </Text>
                        <Text className="text-base text-blue-100 text-center">
                          We've sent a password reset link to{'\n'}
                          <Text className="font-semibold">{forgotPasswordEmail}</Text>
                        </Text>
                      </View>

                      {/* Instructions */}
                      <View className="bg-blue-800 rounded-2xl p-6 mb-6">
                        <Text className="text-white text-base mb-2 font-semibold">
                          Next Steps:
                        </Text>
                        <Text className="text-blue-100 text-base leading-6">
                          1. Check your email inbox{'\n'}
                          2. Click the reset link in the email{'\n'}
                          3. Create a new password{'\n'}
                          4. Sign in with your new password
                        </Text>
                      </View>

                      {/* Resend Email Button */}
                      <TouchableOpacity
                        className="bg-blue-700 rounded-2xl py-5 items-center mb-4 shadow-lg"
                        onPress={handleSendResetEmail}
                        disabled={isSendingReset}
                      >
                        {isSendingReset ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text className="text-white text-lg font-bold">
                            Resend Email
                          </Text>
                        )}
                      </TouchableOpacity>

                      {/* Back to Login Button */}
                      <TouchableOpacity
                        className="border-2 border-blue-600 rounded-2xl py-5 items-center"
                        onPress={handleCloseForgotPassword}
                      >
                        <Text className="text-blue-200 text-lg font-bold">
                          Back to Login
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
    </SafeAreaView>
    </>
  );
}

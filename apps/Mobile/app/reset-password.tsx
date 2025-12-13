import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { showSuccess } from '../lib/sweetAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Check for reset token from deep link or URL params
  useEffect(() => {
    const checkResetToken = async () => {
      try {
        // Check if we have token in URL params (from deep link)
        const url = await Linking.getInitialURL();
        
        // Extract token from URL if present
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        
        if (url) {
          const parsed = Linking.parse(url);
          accessToken = parsed.queryParams?.access_token as string || null;
          refreshToken = parsed.queryParams?.refresh_token as string || null;
        }
        
        // Also check params from expo-router
        if (!accessToken && params?.access_token) {
          accessToken = params.access_token as string;
        }
        if (!refreshToken && params?.refresh_token) {
          refreshToken = params.refresh_token as string;
        }

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError('Invalid or expired reset link. Please request a new one.');
            setIsValidToken(false);
          } else {
            setIsValidToken(true);
          }
        } else {
          // Check if user is already authenticated (they might have clicked the link)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidToken(true);
          } else {
            setError('No reset token found. Please request a new password reset link.');
            setIsValidToken(false);
          }
        }
      } catch (err: any) {
        console.error('Error validating reset token:', err);
        setError('An error occurred while validating the reset link.');
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    checkResetToken();

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', async (event) => {
      const parsed = Linking.parse(event.url);
      const accessToken = parsed.queryParams?.access_token as string;
      const refreshToken = parsed.queryParams?.refresh_token as string;

      if (accessToken && refreshToken) {
        setIsValidating(true);
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError('Invalid or expired reset link. Please request a new one.');
          setIsValidToken(false);
        } else {
          setIsValidToken(true);
        }
        setIsValidating(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [params]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleResetPassword = async () => {
    setError(null);

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password');
        setIsLoading(false);
        return;
      }

      // Success - show alert and redirect to login
      showSuccess(
        'Password Reset Successful!',
        'Your password has been updated successfully. You can now sign in with your new password.',
        () => {
          // Sign out to clear the session
          supabase.auth.signOut();
          router.replace('/login');
        }
      );
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading while validating token
  if (isValidating) {
    return (
      <>
        <StatusBar style="light" />
        <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-white text-lg mt-4">Validating reset link...</Text>
        </SafeAreaView>
      </>
    );
  }

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <>
        <StatusBar style="light" />
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
                <View className="items-center mb-8">
                  <View className="w-20 h-20 bg-red-500 rounded-full items-center justify-center mb-4">
                    <Ionicons name="close" size={40} color="#ffffff" />
                  </View>
                  <Text className="text-2xl font-bold text-white mb-3 text-center">
                    Invalid Reset Link
                  </Text>
                  <Text className="text-base text-blue-100 text-center mb-6">
                    {error || 'This password reset link is invalid or has expired.'}
                  </Text>
                </View>

                <TouchableOpacity
                  className="bg-blue-700 rounded-2xl py-5 items-center mb-4 shadow-lg"
                  onPress={() => router.replace('/login')}
                >
                  <Text className="text-white text-lg font-bold">
                    Back to Login
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="border-2 border-blue-600 rounded-2xl py-5 items-center"
                  onPress={() => {
                    router.replace('/login');
                    // The user can request a new reset link from the login screen
                  }}
                >
                  <Text className="text-blue-200 text-lg font-bold">
                    Request New Reset Link
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView className="flex-1 bg-blue-900">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 20) + 300,
              paddingHorizontal: 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-center">
              {/* Header */}
              <View className="items-center mb-8">
                <View className="w-20 h-20 bg-blue-700 rounded-full items-center justify-center mb-4">
                  <Ionicons name="lock-closed" size={40} color="#ffffff" />
                </View>
                <Text className="text-4xl font-bold text-white mb-3 text-center">
                  Reset Password
                </Text>
                <Text className="text-lg text-blue-100 text-center">
                  Enter your new password below
                </Text>
              </View>

              {/* Form Container */}
              <View className="bg-white rounded-3xl p-8 shadow-2xl">
                {/* Error Message */}
                {error && (
                  <View className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <Text className="text-red-700 text-base">{error}</Text>
                  </View>
                )}

                {/* New Password Input */}
                <View className="mb-6">
                  <Text className="text-base font-semibold text-slate-900 mb-3">
                    New Password
                  </Text>
                  <View className="flex-row items-center border-2 border-slate-200 rounded-2xl px-5 bg-slate-50 h-14">
                    <Ionicons name="lock-closed-outline" size={22} color="#6b7280" style={{ marginRight: 12 }} />
                    <TextInput
                      ref={newPasswordRef}
                      className="flex-1 h-full text-lg text-slate-900"
                      placeholder="Enter new password"
                      placeholderTextColor="#9ca3af"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setError(null);
                      }}
                      secureTextEntry={!showNewPassword}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      className="p-2"
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View className="mb-6">
                  <Text className="text-base font-semibold text-slate-900 mb-3">
                    Confirm Password
                  </Text>
                  <View className="flex-row items-center border-2 border-slate-200 rounded-2xl px-5 bg-slate-50 h-14">
                    <Ionicons name="lock-closed-outline" size={22} color="#6b7280" style={{ marginRight: 12 }} />
                    <TextInput
                      ref={confirmPasswordRef}
                      className="flex-1 h-full text-lg text-slate-900"
                      placeholder="Confirm new password"
                      placeholderTextColor="#9ca3af"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setError(null);
                      }}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={() => {
                        confirmPasswordRef.current?.blur();
                        Keyboard.dismiss();
                        if (newPassword && confirmPassword) {
                          handleResetPassword();
                        }
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-2"
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Requirements */}
                <View className="mb-6 bg-blue-50 rounded-xl p-4">
                  <Text className="text-sm font-semibold text-slate-700 mb-2">
                    Password Requirements:
                  </Text>
                  <Text className="text-sm text-slate-600 leading-5">
                    • At least 8 characters{'\n'}
                    • One uppercase letter{'\n'}
                    • One lowercase letter{'\n'}
                    • One number
                  </Text>
                </View>

                {/* Reset Password Button */}
                <TouchableOpacity
                  className={`bg-blue-700 rounded-2xl py-5 items-center mb-4 shadow-lg ${isLoading ? 'bg-blue-400' : ''}`}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white text-lg font-bold">
                      Reset Password
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  className="border-2 border-slate-200 rounded-2xl py-5 items-center"
                  onPress={() => router.replace('/login')}
                  disabled={isLoading}
                >
                  <Text className="text-slate-700 text-lg font-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}


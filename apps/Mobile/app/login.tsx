import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
      <KeyboardAwareScrollView
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: Math.max(insets.bottom, 20)
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
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
              <View className="bg-white rounded-3xl p-8 shadow-2xl mx-2 border border-slate-100">
              {/* Email Input */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-slate-900 mb-3">Email Address</Text>
                <View className="flex-row items-center border-2 border-slate-200 rounded-2xl px-5 bg-slate-50 h-14">
                  <Ionicons name="mail-outline" size={22} color="#6b7280" style={{ marginRight: 12 }} />
                  <TextInput
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
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-slate-900 mb-3">Password</Text>
                <View className="flex-row items-center border-2 border-slate-200 rounded-2xl px-5 bg-slate-50 h-14">
                  <Ionicons name="lock-closed-outline" size={22} color="#6b7280" style={{ marginRight: 12 }} />
                  <TextInput
                    className="flex-1 h-full text-lg text-slate-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    onBlur={() => handleInputBlur('password')}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    blurOnSubmit={true}
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
              <TouchableOpacity
                className={`bg-blue-700 rounded-2xl py-5 items-center mb-6 shadow-lg ${isLoading ? 'bg-blue-400' : ''}`}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text className="text-white text-lg font-bold">
                  {isLoading ? 'Logging In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

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
      </KeyboardAwareScrollView>
    </SafeAreaView>
    </>
  );
}

import React, { useState, useRef, useEffect } from 'react';
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

interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'psu-student' | 'psu-employee' | 'outside' | '';
}

export default function RegistrationScreen() {
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    userType: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [localError, setLocalError] = useState('');
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { signUp } = useAuth();
  
  // Refs for form inputs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
        } else if (confirmPasswordRef.current?.isFocused()) {
          focusedField = 'confirmPassword';
        }

        if (focusedField && inputYPositions.current[focusedField] !== undefined) {
          const keyboardHeight = e.endCoordinates.height;
          const inputY = inputYPositions.current[focusedField];
          
          // For password fields, scroll enough to show the button as well
          if (focusedField === 'password' || focusedField === 'confirmPassword') {
            // Scroll to show both the input and the button below it
            // Calculate scroll position to show button above keyboard
            const screenHeight = Dimensions.get('window').height;
            const availableHeight = screenHeight - keyboardHeight;
            
            // If button position is known, scroll to show it with some padding
            if (buttonYPosition.current > 0) {
              // Scroll so button is visible above keyboard with padding
              const buttonBottom = buttonYPosition.current + 60; // Button height + padding
              const scrollY = Math.max(0, buttonBottom - availableHeight + 20);
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  y: scrollY,
                  animated: true,
                });
              }, 150);
            } else {
              // Fallback: scroll more for password fields to show button
              // Estimate button position (about 250px below confirm password)
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, inputY - 250),
                  animated: true,
                });
              }, 150);
            }
          } else {
            // For other fields, scroll to position input above keyboard with padding
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

  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputBlur = (field: keyof RegistrationFormData) => {
    // Trim values when field loses focus (except userType which is not a string input)
    if (field !== 'userType') {
      setFormData(prev => ({ ...prev, [field]: String(prev[field]).trim() }));
    }
  };

  const handleUserTypeSelect = (userType: 'psu-student' | 'psu-employee' | 'outside') => {
    setFormData(prev => ({ ...prev, userType }));
  };

  const validateForm = () => {
    // Trim values for validation
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirmPassword = formData.confirmPassword.trim();
    
    if (!trimmedEmail || !trimmedPassword || !formData.userType) {
      return 'All required fields must be filled';
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      return 'Passwords do not match';
    }

    if (trimmedPassword.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    // Password complexity validation
    const hasLowercase = /[a-z]/.test(trimmedPassword);
    const hasUppercase = /[A-Z]/.test(trimmedPassword);
    const hasNumber = /[0-9]/.test(trimmedPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"|\\<>\?,./`~]/.test(trimmedPassword);

    if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
      return 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (!@#$%^&*()_+-=[]{};\':"\\|/<>,.?`~)';
    }

    if (!acceptedTerms) {
      return 'You must agree to the terms and conditions';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address';
    }

    // PSU email validation for students and employees only
    if ((formData.userType === 'psu-student' || formData.userType === 'psu-employee') && 
        !trimmedEmail.endsWith('@parsu.edu.ph') && 
        !trimmedEmail.endsWith('.pbox@parsu.edu.ph')) {
      return 'PSU students and employees must use @parsu.edu.ph or .pbox@parsu.edu.ph email addresses';
    }

    return null;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Basic email format validation
    if (!emailRegex.test(email)) {
      return false;
    }
    
    // PSU-specific email validation for students and employees
    if (formData.userType === 'psu-student' || formData.userType === 'psu-employee') {
      const psuEmailRegex = /^[^\s@]+@(parsu\.edu\.ph|.*\.pbox\.parsu\.edu\.ph)$/;
      return psuEmailRegex.test(email);
    }
    
    // For outside users, any valid email format is acceptable
    return true;
  };

  const handleRegistration = async () => {
    console.log('handleRegistration called');
    // Clear any previous errors
    setLocalError('');
    
    // Trim all string values
    const trimmedData = {
      email: formData.email.trim(),
      password: formData.password.trim(),
      confirmPassword: formData.confirmPassword.trim(),
      userType: formData.userType
    };
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      console.log('Validation error:', validationError);
      setLocalError(validationError);
      return;
    }

    console.log('Form validation passed, starting signUp...');
    setIsLoading(true);

    try {
      // Prepare user data for registration with trimmed values
      const userData = {
        user_type: trimmedData.userType,
        role: 'participant' // Default role for new users
      };

      console.log('Calling signUp with:', { email: trimmedData.email });
      const result = await signUp(trimmedData.email, trimmedData.password, '', '', 'participant');
      
      console.log('SignUp result:', result);
      
      if (result.error) {
        console.log('SignUp error:', result.error);
        setLocalError(result.error);
        return;
      }

      if (result.user) {
        // Registration successful - wait a moment for auth state to fully update
        // Then redirect to profile setup (Facebook's approach: new users always go to setup-profile)
        setTimeout(() => {
          router.replace('/setup-profile');
        }, 200);
        return;
      }

      console.log('No user returned from signUp');
      setLocalError('Registration failed. Please try again.');
    } catch (error) {
      console.error('Registration error:', error);
      setLocalError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="light" />
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
              paddingTop: 0,
              paddingBottom: Math.max(insets.bottom, 20) + 300,
              paddingHorizontal: !formData.userType ? 16 : 16,
              paddingVertical: !formData.userType ? 0 : 24,
              justifyContent: !formData.userType ? 'center' : 'flex-start',
              alignItems: !formData.userType ? 'center' : 'stretch',
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            keyboardDismissMode="interactive"
          >

            {!formData.userType ? (
              // User Type Selection Screen
              <View style={{ width: '100%', maxWidth: 400, alignItems: 'center' }}>
                <View className="bg-white rounded-2xl p-5 shadow-lg" style={{ width: '100%' }}>
                  <Text className="text-2xl font-semibold text-black mb-4 text-center">Are you from Partido State University?</Text>
                  <View>
                    <TouchableOpacity
                      className="w-full p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-400 mb-4"
                      onPress={() => handleUserTypeSelect('psu-student')}
                    >
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                          <Ionicons name="school-outline" size={24} color="#1e3a8a" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-lg font-medium text-black">PSU Student</Text>
                          <Text className="text-base text-gray-600">I'm currently enrolled as a student at Partido State University</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="w-full p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-400 mb-4"
                      onPress={() => handleUserTypeSelect('psu-employee')}
                    >
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                          <Ionicons name="briefcase-outline" size={24} color="#059669" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-lg font-medium text-black">PSU Employee</Text>
                          <Text className="text-base text-gray-600">I work at Partido State University as faculty or staff</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="w-full p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-400 mb-6"
                      onPress={() => handleUserTypeSelect('outside')}
                    >
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                          <Ionicons name="people-outline" size={24} color="#7c3aed" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-lg font-medium text-black">Outside PSU</Text>
                          <Text className="text-base text-gray-600">I'm not affiliated with Partido State University</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    <View className="flex-row items-center mb-6">
                      <View className="flex-1 h-px bg-gray-300" />
                      <Text className="px-3 text-gray-600 text-base">or</Text>
                      <View className="flex-1 h-px bg-gray-300" />
                    </View>
                    
                    <TouchableOpacity
                      onPress={() => router.push('/login')}
                      className="w-full py-3 px-4 bg-blue-800 text-white rounded-lg"
                    >
                      <Text className="text-white text-base font-bold text-center">Already have an account? Log in</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              // Registration Form Screen
              <View className="flex-1 justify-center">
                {/* User Type Display */}
                <View className="bg-white rounded-2xl p-4 shadow-lg mx-2 mb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                        formData.userType === 'psu-student' ? 'bg-blue-100' : 
                        formData.userType === 'psu-employee' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        <Ionicons 
                          name={
                            formData.userType === 'psu-student' ? 'school-outline' : 
                            formData.userType === 'psu-employee' ? 'briefcase-outline' : 'people-outline'
                          } 
                          size={20} 
                          color={
                            formData.userType === 'psu-student' ? '#1e3a8a' : 
                            formData.userType === 'psu-employee' ? '#059669' : '#7c3aed'
                          } 
                        />
                      </View>
                      <View>
                        <Text className="text-base font-medium text-gray-600">Selected User Type</Text>
                        <Text className="text-lg font-semibold text-black">
                          {formData.userType === 'psu-student' ? 'PSU Student' : 
                           formData.userType === 'psu-employee' ? 'PSU Employee' : 'Outside PSU'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setFormData(prev => ({ ...prev, userType: '' }))}
                      className="p-2"
                    >
                      <Ionicons name="close-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Registration Form */}
                <View className="bg-white rounded-2xl p-5 shadow-lg mx-2">
                  {/* Error Messages */}
                  {localError && (
                    <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <Text className="text-red-700 text-base">{localError}</Text>
                    </View>
                  )}

                  {/* Email Input */}
                  <View 
                    className="mb-3"
                    onLayout={handleInputLayout('email')}
                  >
                    <Text className="text-base font-semibold text-black mb-2">Email Address *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="mail-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={emailRef}
                        className="flex-1 h-12 text-base text-black"
                        placeholder={
                          formData.userType === 'psu-student' || formData.userType === 'psu-employee'
                            ? 'Enter your PSU email (@parsu.edu.ph)'
                            : 'Enter your email address'
                        }
                        placeholderTextColor="#666"
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
                    {(formData.userType === 'psu-student' || formData.userType === 'psu-employee') && (
                      <Text className="text-sm text-gray-500 mt-1 ml-1">
                        Must end in @parsu.edu.ph or .pbox@parsu.edu.ph
                      </Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View 
                    className="mb-3"
                    onLayout={handleInputLayout('password')}
                  >
                    <Text className="text-base font-semibold text-black mb-2">Password *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="lock-closed-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={passwordRef}
                        className="flex-1 h-12 text-base text-black"
                        placeholder="Create a password"
                        placeholderTextColor="#666"
                        value={formData.password}
                        onChangeText={(text) => handleInputChange('password', text)}
                        onBlur={() => handleInputBlur('password')}
                        secureTextEntry={!showPassword}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="p-1"
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#1e3a8a"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password Input */}
                  <View 
                    className="mb-4"
                    onLayout={handleInputLayout('confirmPassword')}
                  >
                    <Text className="text-base font-semibold text-black mb-2">Confirm Password *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="lock-closed-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={confirmPasswordRef}
                        className="flex-1 h-12 text-base text-black"
                        placeholder="Confirm your password"
                        placeholderTextColor="#666"
                        value={formData.confirmPassword}
                        onChangeText={(text) => handleInputChange('confirmPassword', text)}
                        onBlur={() => handleInputBlur('confirmPassword')}
                        secureTextEntry={!showConfirmPassword}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        onSubmitEditing={() => {
                          confirmPasswordRef.current?.blur();
                          Keyboard.dismiss();
                          // Submit form if all fields are filled and terms accepted
                          if (formData.email.trim() && formData.password.trim() && formData.confirmPassword.trim() && acceptedTerms) {
                            handleRegistration();
                          }
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-1"
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#1e3a8a"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Terms and Privacy Policy Checkbox */}
                  <View className="mb-4">
                    <TouchableOpacity
                      className="flex-row items-center"
                      onPress={() => setAcceptedTerms(!acceptedTerms)}
                    >
                      <View className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${acceptedTerms ? 'bg-blue-800 border-blue-800' : 'border-gray-400'}`}>
                        {acceptedTerms && (
                          <Ionicons name="checkmark" size={18} color="white" />
                        )}
                      </View>
                      <Text className="text-base text-black flex-1 leading-6">
                        I agree to the{' '}
                        <Text 
                          className="text-blue-800 underline font-semibold"
                          onPress={() => router.push('/terms?type=terms')}
                        >
                          Terms of Use
                        </Text>
                        {' '}and{' '}
                        <Text 
                          className="text-blue-800 underline font-semibold"
                          onPress={() => router.push('/terms?type=privacy')}
                        >
                          Privacy Policy
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Required Fields Legend */}
                  <View className="mb-4">
                    <Text className="text-base text-gray-600">
                      <Text className="text-red-500 text-lg font-bold">*</Text> Required fields
                    </Text>
                </View>

                  {/* Register Button */}
                  <View
                    onLayout={(e) => {
                      e.target.measureInWindow((x: number, y: number, width: number, height: number) => {
                        buttonYPosition.current = y;
                      });
                    }}
                  >
                    <TouchableOpacity
                      className={`bg-blue-800 rounded-xl py-3 items-center ${isLoading ? 'bg-gray-400' : ''}`}
                      onPress={handleRegistration}
                      disabled={isLoading}
                    >
                      <Text className="text-white text-base font-bold">
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            
            {/* Bottom Spacing */}
            <View className="h-6" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
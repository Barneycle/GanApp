import React, { useState, useRef } from 'react';
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
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'psu-student' | 'psu-employee' | 'outside' | '';
}

export default function RegistrationScreen() {
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState('');
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { signUp } = useAuth();
  
  // Refs for form inputs
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirmPassword = formData.confirmPassword.trim();
    
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPassword || !formData.userType) {
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
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
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
        first_name: trimmedData.firstName,
        last_name: trimmedData.lastName,
        user_type: trimmedData.userType,
        role: 'participant' // Default role for new users
      };

      console.log('Calling signUp with:', { email: trimmedData.email, firstName: trimmedData.firstName, lastName: trimmedData.lastName });
      const result = await signUp(trimmedData.email, trimmedData.password, trimmedData.firstName, trimmedData.lastName, 'participant');
      
      console.log('SignUp result:', result);
      
      if (result.error) {
        console.log('SignUp error:', result.error);
        setLocalError(result.error);
        return;
      }

      if (result.user) {
        console.log('Registration successful, showing success screen');
        // Registration successful - show success message and redirect to login
        setSuccess(true);
        // Redirect to login after 3 seconds to show success message
        setTimeout(() => {
          router.push('/login');
        }, 3000);
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
        {success ? (
          // Success Screen
          <View className="flex-1 justify-center items-center px-4">
            <View className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
              <View className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Ionicons name="checkmark" size={32} color="#059669" />
              </View>
              <Text className="text-2xl font-bold text-slate-800 mb-2 text-center">Registration Successful!</Text>
              <Text className="text-slate-600 mb-6 text-center">
                Your account has been created successfully. You can now sign in using your email address.
                {formData.userType === 'outside' && ' Outside users can use any valid email address.'}
              </Text>
              <View className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></View>
              <TouchableOpacity
                onPress={() => router.push('/login')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Go to Login Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ 
              flexGrow: 1,
              paddingTop: 0,
              paddingBottom: Math.max(insets.bottom, 20)
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            className="px-4 py-6"
          >

            {!formData.userType ? (
              // User Type Selection Screen
              <View className="flex-1 justify-center">
                <View className="bg-white rounded-2xl p-5 shadow-lg mx-2">
                  <Text className="text-lg font-semibold text-black mb-4 text-center">Are you from Partido State University?</Text>
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
                          <Text className="text-base font-medium text-black">PSU Student</Text>
                          <Text className="text-sm text-gray-600">I'm currently enrolled as a student at Partido State University</Text>
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
                          <Text className="text-base font-medium text-black">PSU Employee</Text>
                          <Text className="text-sm text-gray-600">I work at Partido State University as faculty or staff</Text>
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
                          <Text className="text-base font-medium text-black">Outside PSU</Text>
                          <Text className="text-sm text-gray-600">I'm not affiliated with Partido State University</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    <View className="flex-row items-center mb-6">
                      <View className="flex-1 h-px bg-gray-300" />
                      <Text className="px-3 text-gray-600 text-sm">or</Text>
                      <View className="flex-1 h-px bg-gray-300" />
                    </View>
                    
                    <TouchableOpacity
                      onPress={() => router.push('/login')}
                      className="w-full py-3 px-4 bg-blue-800 text-white rounded-lg"
                    >
                      <Text className="text-white text-sm font-bold text-center">Already have an account? Log in</Text>
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
                        <Text className="text-sm font-medium text-gray-600">Selected User Type</Text>
                        <Text className="text-base font-semibold text-black">
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
                      <Text className="text-red-700 text-sm">{localError}</Text>
                    </View>
                  )}

                  {/* First Name Input */}
                  <View className="mb-3">
                    <Text className="text-sm font-semibold text-black mb-2">First Name *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="person-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={firstNameRef}
                        className="flex-1 h-11 text-sm text-black"
                        placeholder="Enter your first name"
                        placeholderTextColor="#666"
                        value={formData.firstName}
                        onChangeText={(text) => handleInputChange('firstName', text)}
                        onBlur={() => handleInputBlur('firstName')}
                        autoCapitalize="words"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 200, animated: true });
                          }, 100);
                        }}
                      />
                    </View>
                  </View>

                  {/* Last Name Input */}
                  <View className="mb-3">
                    <Text className="text-sm font-semibold text-black mb-2">Last Name *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="person-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={lastNameRef}
                        className="flex-1 h-11 text-sm text-black"
                        placeholder="Enter your last name"
                        placeholderTextColor="#666"
                        value={formData.lastName}
                        onChangeText={(text) => handleInputChange('lastName', text)}
                        onBlur={() => handleInputBlur('lastName')}
                        autoCapitalize="words"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => emailRef.current?.focus()}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 250, animated: true });
                          }, 100);
                        }}
                      />
                    </View>
                  </View>

                  {/* Email Input */}
                  <View className="mb-3">
                    <Text className="text-sm font-semibold text-black mb-2">Email Address *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="mail-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={emailRef}
                        className="flex-1 h-11 text-sm text-black"
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
                        onSubmitEditing={() => {
                          emailRef.current?.blur();
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 400, animated: true });
                            setTimeout(() => {
                              if (passwordRef.current) {
                                passwordRef.current.focus();
                              }
                            }, 50);
                          }, 50);
                        }}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Enter' || nativeEvent.key === 'enter') {
                            emailRef.current?.blur();
                            setTimeout(() => {
                              scrollViewRef.current?.scrollTo({ y: 400, animated: true });
                              setTimeout(() => {
                                if (passwordRef.current) {
                                  passwordRef.current.focus();
                                }
                              }, 50);
                            }, 50);
                          }
                        }}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                          }, 100);
                        }}
                      />
                    </View>
                    {(formData.userType === 'psu-student' || formData.userType === 'psu-employee') && (
                      <Text className="text-xs text-gray-500 mt-1 ml-1">
                        Must end in @parsu.edu.ph or .pbox@parsu.edu.ph
                      </Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View className="mb-3">
                    <Text className="text-sm font-semibold text-black mb-2">Password *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="lock-closed-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={passwordRef}
                        className="flex-1 h-11 text-sm text-black"
                        placeholder="Create a password"
                        placeholderTextColor="#666"
                        value={formData.password}
                        onChangeText={(text) => handleInputChange('password', text)}
                        onBlur={() => handleInputBlur('password')}
                        secureTextEntry={!showPassword}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 450, animated: true });
                            confirmPasswordRef.current?.focus();
                          }, 100);
                        }}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 400, animated: true });
                          }, 100);
                        }}
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
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-black mb-2">Confirm Password *</Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl px-3 bg-gray-50">
                      <Ionicons name="lock-closed-outline" size={18} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={confirmPasswordRef}
                        className="flex-1 h-11 text-sm text-black"
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
                        }}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ y: 450, animated: true });
                          }, 100);
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
                      <Text className="text-base text-black flex-1 leading-5">
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

                  {/* Register Button */}
                  <TouchableOpacity
                    className={`bg-blue-800 rounded-xl py-3 items-center ${isLoading ? 'bg-gray-400' : ''}`}
                    onPress={handleRegistration}
                    disabled={isLoading}
                  >
                    <Text className="text-white text-sm font-bold">
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Bottom Spacing */}
            <View className="h-6" />
          </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </>
  );
}
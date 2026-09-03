import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SystemSettingsService } from '../../services/systemSettingsService';
import TermsModal from '../TermsModal';
import { SmartSpinner } from '../loading/SmartSpinner';
import { fieldForError, inlineError, toErrorCopy } from '../../utils/errorCopy';
import { FIELD_LIMITS, isPasswordValid, isValidEmail } from '../../utils/formFields';
import { CharCount, FieldError, FieldLabel, PasswordChecklist, controlClass } from '../form/Field';
import { statusError } from '../Toast';
import { Briefcase, GraduationCap, Users, X } from 'lucide-react';

// Common email domains for autocomplete
const COMMON_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'mail.com', 'protonmail.com'];

export const Registration = () => {
  const navigate = useNavigate();
  const { signUp, loading, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    userType: '',
    agreeToTerms: false
  });

  const [success, _setSuccess] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [modalContentType, setModalContentType] = useState('terms');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', confirmPassword: '', terms: '' });

  // Email validation state
  const [emailValidation, setEmailValidation] = useState({ isValid: null, message: '' });
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const emailInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  // Real-time email validation
  useEffect(() => {
    const email = formData.email.trim();
    if (!email) {
      setEmailValidation({ isValid: null, message: '' });
      setEmailSuggestions([]);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    // Check PSU email requirement for students and employees
    if (isValid && (formData.userType === 'psu-student' || formData.userType === 'psu-employee')) {
      const isPSUEmail = email.endsWith('@parsu.edu.ph') || email.endsWith('.pbox@parsu.edu.ph');
      if (isPSUEmail) {
        setEmailValidation({ isValid: true, message: 'Valid PSU email address' });
      } else {
        setEmailValidation({ isValid: false, message: 'PSU students and employees must use @parsu.edu.ph or .pbox@parsu.edu.ph email addresses' });
      }
      setEmailSuggestions([]);
      return;
    }

    if (isValid) {
      setEmailValidation({ isValid: true, message: 'Valid email address' });
      setEmailSuggestions([]);
    } else {
      // Check if user is typing and suggest domains (only for outside users)
      if (formData.userType === 'outside') {
        const atIndex = email.indexOf('@');
        if (atIndex > 0 && !email.includes('@', atIndex + 1)) {
          const localPart = email.substring(0, atIndex);
          const domainPart = email.substring(atIndex + 1);

          if (domainPart.length > 0) {
            const suggestions = COMMON_EMAIL_DOMAINS
              .filter(domain => domain.startsWith(domainPart.toLowerCase()))
              .map(domain => `${localPart}@${domain}`)
              .slice(0, 3);
            setEmailSuggestions(suggestions);
            setShowEmailSuggestions(suggestions.length > 0);
          } else {
            setEmailSuggestions([]);
            setShowEmailSuggestions(false);
          }
        } else {
          setEmailSuggestions([]);
          setShowEmailSuggestions(false);
        }
      } else {
        setEmailSuggestions([]);
        setShowEmailSuggestions(false);
      }

      if (email.length > 0) {
        setEmailValidation({
          isValid: false,
          message: email.includes('@') ? 'Please enter a valid email address' : 'Email must include @ symbol'
        });
      } else {
        setEmailValidation({ isValid: null, message: '' });
      }
    }

  }, [formData.email, formData.userType]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
        emailInputRef.current && !emailInputRef.current.contains(event.target)) {
        setShowEmailSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear local error when user starts typing
    if (fieldErrors.email || fieldErrors.password || fieldErrors.confirmPassword || fieldErrors.terms) {
      setFieldErrors({ email: '', password: '', confirmPassword: '', terms: '' });
    }
  };

  const handleEmailSuggestionClick = (suggestion) => {
    setFormData(prev => ({ ...prev, email: suggestion }));
    setShowEmailSuggestions(false);
    emailInputRef.current?.focus();
  };

  const handleUserTypeSelect = (userType) => {
    setFormData(prev => ({ ...prev, userType }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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

    if (!isPasswordValid(trimmedPassword)) {
      return 'Password does not meet the requirements yet';
    }

    if (!formData.agreeToTerms) {
      return 'You must agree to the terms and conditions';
    }

    // Email validation
    if (!isValidEmail(trimmedEmail)) {
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

  const canSubmit = !validateForm() && !loading;
  const emailError = fieldErrors.email || (emailValidation.isValid === false ? emailValidation.message : '');
  const confirmMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear any previous errors
    clearError();
    setFieldErrors({ email: '', password: '', confirmPassword: '', terms: '' });

    // Trim all string values
    const trimmedData = {
      ...formData,
      email: formData.email.trim(),
      password: formData.password.trim(),
      confirmPassword: formData.confirmPassword.trim()
    };

    // Check if email exists before submitting
    if (emailValidation.isValid === false && emailValidation.message.includes('already registered')) {
      setFieldErrors({ email: 'This email address is already registered. Log in, or use a different email.', password: '', confirmPassword: '', terms: '' });
      return;
    }

    // Validate form with trimmed data
    const validationError = validateForm();
    if (validationError) {
      if (/passwords do not match/i.test(validationError)) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match yet.' }));
      } else if (/password/i.test(validationError)) {
        setFieldErrors((prev) => ({ ...prev, password: validationError }));
      } else if (/email/i.test(validationError) || /parsu/i.test(validationError)) {
        setFieldErrors((prev) => ({ ...prev, email: validationError }));
      } else if (/terms/i.test(validationError)) {
        setFieldErrors((prev) => ({ ...prev, terms: validationError }));
      }
      return;
    }

    try {
      // Prepare user data for registration with trimmed values
      const userData = {
        user_type: trimmedData.userType,
        role: 'participant' // Default role for new users
      };

      const result = await signUp(trimmedData.email, trimmedData.password, userData);

      if (result.error) {
        const copy = toErrorCopy(result.error, 'signup');
        if (fieldForError(copy) === 'email') {
          setFieldErrors((prev) => ({ ...prev, email: inlineError(copy) }));
          return;
        }
        await statusError(copy, 'signup');
        return;
      }

      if (result.user) {
        // Registration successful - redirect to profile setup
        navigate('/setup-profile');
        return;
      }

      await statusError(toErrorCopy('Registration failed. Please try again.', 'signup'), 'signup');
    } catch (error) {
      const copy = toErrorCopy(error, 'signup');
      if (fieldForError(copy) === 'email') {
        setFieldErrors((prev) => ({ ...prev, email: inlineError(copy) }));
        return;
      }
      await statusError(copy, 'signup');
    }
  };

  const openTermsModal = (type) => {
    setModalContentType(type);
    setIsTermsModalOpen(true);
  };

  const closeTermsModal = () => {
    setIsTermsModalOpen(false);
  };

  if (success) {
    return (
      <section className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl border border-slate-200 bg-white p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
            <p className="text-slate-600 mb-6">
              Your account has been created successfully. You can now sign in using your email address.
              {formData.userType === 'outside' && ' Outside users can use any valid email address.'}
            </p>
            <SmartSpinner active label="Redirecting you to sign in" messages={['Still redirecting', 'Almost there']} />
            <button
              onClick={() => navigate('/login')}
              className="min-h-11 rounded-md bg-blue-900 px-6 py-3 font-medium text-white transition hover:bg-blue-800"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {!formData.userType ? (
          // User Type Selection Screen
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8">
            <h3 className="mb-4 text-center text-lg font-semibold text-slate-800 sm:mb-6 sm:text-xl">Are you from Partido State University?</h3>

            <div className="space-y-4">
              {/* PSU Student */}
              <button
                onClick={() => handleUserTypeSelect('psu-student')}
                className="w-full p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-400 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <GraduationCap className="w-6 h-6 text-blue-800" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-slate-800">PSU Student</h4>
                    <p className="text-sm text-slate-600">I'm currently enrolled as a student at Partido State University</p>
                  </div>
                </div>
              </button>

              {/* PSU Employee */}
              <button
                onClick={() => handleUserTypeSelect('psu-employee')}
                className="w-full p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-400 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <Briefcase className="h-6 w-6 text-green-800" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-slate-800">PSU Employee</h4>
                    <p className="text-sm text-slate-600">I work at Partido State University as faculty or staff</p>
                  </div>
                </div>
              </button>

              {/* Outside PSU */}
              <button
                onClick={() => handleUserTypeSelect('outside')}
                className="w-full p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-400 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-purple-800" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-slate-800">Outside PSU</h4>
                    <p className="text-sm text-slate-600">I'm not affiliated with Partido State University</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-4 text-sm text-slate-500">or</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <a
                href="/login"
                className="inline-block w-full py-3 px-4 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
              >
                Already have an account? Log in
              </a>
            </div>
          </div>
        ) : (
          // Registration Form Screen
          <>
            {/* User Type Display */}
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:mb-6 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${formData.userType === 'psu-student' ? 'bg-blue-100' :
                    formData.userType === 'psu-employee' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                    {formData.userType === 'psu-student' ? (
                      <GraduationCap className="h-5 w-5 text-slate-800" />
                    ) : formData.userType === 'psu-employee' ? (
                      <Briefcase className="h-5 w-5 text-slate-800" />
                    ) : (
                      <Users className="h-5 w-5 text-slate-800" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Selected User Type</p>
                    <p className="text-base font-semibold text-slate-800">
                      {formData.userType === 'psu-student' ? 'PSU Student' :
                        formData.userType === 'psu-employee' ? 'PSU Employee' : 'Outside PSU'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, userType: '' }))}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Registration Form */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <FieldLabel htmlFor="email" required>Email Address</FieldLabel>
                  <div className="relative" ref={suggestionsRef}>
                    <input
                      ref={emailInputRef}
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={() => {
                        if (emailSuggestions.length > 0) {
                          setShowEmailSuggestions(true);
                        }
                      }}
                      maxLength={FIELD_LIMITS.email}
                      required
                      disabled={loading}
                      autoComplete="email"
                      aria-describedby="email-validation email-help"
                      aria-invalid={Boolean(emailError)}
                      aria-required="true"
                      className={controlClass(Boolean(emailError), 'pr-12')}
                      placeholder={
                        formData.userType === 'psu-student' || formData.userType === 'psu-employee'
                          ? 'Enter your PSU email (@parsu.edu.ph)'
                          : 'Enter your email address'
                      }
                    />

                    {/* Email Validation Indicator */}
                    {emailValidation.isValid !== null && formData.email && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {emailValidation.isValid ? (
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Email Suggestions Dropdown */}
                    {showEmailSuggestions && emailSuggestions.length > 0 && formData.userType === 'outside' && (
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-40 overflow-y-auto">
                        {emailSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleEmailSuggestionClick(suggestion)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                            aria-label={`Use email ${suggestion}`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Email Validation Message */}
                  {emailError ? (
                    <FieldError id="email-validation" error={emailError} />
                  ) : emailValidation.isValid && emailValidation.message ? (
                    <p id="email-validation" className="mt-1 text-xs text-green-600" role="status" aria-live="polite">
                      {emailValidation.message}
                    </p>
                  ) : null}

                  {/* Helper text */}
                  {(formData.userType === 'psu-student' || formData.userType === 'psu-employee') && !emailValidation.message && (
                    <p className="text-xs text-slate-500 mt-1">
                      Must end in @parsu.edu.ph or .pbox@parsu.edu.ph
                    </p>
                  )}
                  {formData.userType === 'outside' && !emailValidation.message && (
                    <p className="text-xs text-slate-500 mt-1">
                      Any valid email address is accepted
                    </p>
                  )}

                  <p id="email-help" className="mt-1 text-xs text-slate-500 sr-only">
                    Enter your email address. We'll suggest common email domains as you type.
                  </p>
                  <CharCount value={formData.email} max={FIELD_LIMITS.email} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FieldLabel htmlFor="password" required>Password</FieldLabel>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        maxLength={FIELD_LIMITS.password}
                        disabled={loading}
                        autoComplete="new-password"
                        aria-describedby="password-help"
                        aria-required="true"
                        className={controlClass(Boolean(fieldErrors.password), 'pr-12')}
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        disabled={loading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <PasswordChecklist password={formData.password} confirm={formData.confirmPassword} />
                    <CharCount value={formData.password} max={FIELD_LIMITS.password} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="confirmPassword" required>Confirm Password</FieldLabel>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                        className={controlClass(confirmMismatch || Boolean(fieldErrors.confirmPassword), 'pr-12')}
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {confirmMismatch || fieldErrors.confirmPassword ? (
                      <FieldError error={fieldErrors.confirmPassword || 'Passwords do not match yet.'} />
                    ) : null}
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 disabled:opacity-50"
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-slate-600">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => openTermsModal('terms')}
                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors underline"
                    >
                      Terms and Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => openTermsModal('privacy')}
                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors underline"
                    >
                      Privacy Policy
                    </button>
                  </label>
                </div>
                {fieldErrors.terms ? <FieldError error={fieldErrors.terms} /> : null}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="min-h-11 w-full rounded-md bg-blue-900 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <span className="flex items-center justify-center min-h-[1.5rem]">
                    <SmartSpinner
                      active={loading}
                      variant="inline"
                      light
                      label="Creating account"
                      messages={['Still creating your account', 'Almost there']}
                    >
                      Create Account
                    </SmartSpinner>
                  </span>
                </button>
              </form>

              {/* Sign In Link */}
              <div className="mt-8 text-center">
                <p className="text-slate-600">
                  Already have an account?{' '}
                  <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          </>
        )
        }
      </div >

      {/* Terms Modal */}
      < TermsModal
        isOpen={isTermsModalOpen}
        onClose={closeTermsModal}
        contentType={modalContentType}
      />
    </section >
  );
};
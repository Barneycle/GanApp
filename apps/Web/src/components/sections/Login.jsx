import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/userService';
import TermsModal from '../TermsModal';
import { SmartSpinner } from '../loading/SmartSpinner';
import { LOGIN_ERRORS, fieldForError, inlineError, isBlockingError, toErrorCopy } from '../../utils/errorCopy';
import { FIELD_LIMITS, isValidEmail } from '../../utils/formFields';
import { CharCount, FieldError, FieldLabel, controlClass } from '../form/Field';
import { useToast, statusError } from '../Toast';

export const Login = () => {
  const navigate = useNavigate();
  const { signIn, loading, error, clearError, isAuthenticated, getRedirectPath, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // New state for enhanced features
  const [successMessage, setSuccessMessage] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [modalContentType, setModalContentType] = useState('terms');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const toast = useToast();

  // Load saved email from localStorage if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    if (savedEmail && savedRememberMe) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        rememberMe: true
      }));
    }
  }, []);

  // Check for account lockout
  useEffect(() => {
    try {
      const lockoutEnd = localStorage.getItem('accountLockoutEnd');
      if (lockoutEnd) {
        const endTime = new Date(lockoutEnd);
        if (endTime > new Date()) {
          setIsLocked(true);
          setLockoutTime(endTime);
          const interval = setInterval(() => {
            if (new Date() >= endTime) {
              setIsLocked(false);
              setLockoutTime(null);
              localStorage.removeItem('accountLockoutEnd');
              clearInterval(interval);
            }
          }, 1000);
          return () => clearInterval(interval);
        } else {
          localStorage.removeItem('accountLockoutEnd');
        }
      }
    } catch (err) {
      console.error('Error checking account lockout:', err);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && getRedirectPath) {
      try {
        // Get redirect path based on user role
        const redirectPath = getRedirectPath(user);
        if (redirectPath) {
          navigate(redirectPath);
        }
      } catch (err) {
        console.error('Error getting redirect path:', err);
        // Don't block rendering if redirect fails
      }
    }
  }, [isAuthenticated, user, navigate, getRedirectPath]);

  // Clear error when component unmounts or user navigates away
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Prevent body and html scrolling when login page is mounted
  useEffect(() => {
    try {
      const root = document.getElementById('root');
      const preventScroll = (e) => {
        // Allow scrolling within modal elements
        const target = e.target;
        const modalContent = target.closest('[data-modal-content]');
        if (modalContent) {
          // Allow scrolling within modal - don't prevent the event
          return;
        }
        
        // Prevent scroll on the page itself
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Add no-scroll class to html and body
      document.documentElement.classList.add('no-scroll');
      document.body.classList.add('no-scroll');
      
      // Also set inline styles as backup
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('height', '100%', 'important');
      document.documentElement.style.setProperty('max-height', '100vh', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('height', '100%', 'important');
      document.body.style.setProperty('max-height', '100vh', 'important');
      document.body.style.setProperty('position', 'fixed', 'important');
      document.body.style.setProperty('width', '100%', 'important');
      if (root) {
        root.style.setProperty('height', '100%', 'important');
        root.style.setProperty('overflow', 'hidden', 'important');
        root.style.setProperty('max-height', '100vh', 'important');
      }
      
      // Prevent scroll events
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('scroll', preventScroll, { passive: false });
      
      return () => {
        // Remove no-scroll class
        document.documentElement.classList.remove('no-scroll');
        document.body.classList.remove('no-scroll');
        
        // Remove inline styles
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('height');
        document.documentElement.style.removeProperty('max-height');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('height');
        document.body.style.removeProperty('max-height');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('width');
        if (root) {
          root.style.removeProperty('height');
          root.style.removeProperty('overflow');
          root.style.removeProperty('max-height');
        }
        
        // Remove event listeners
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
        document.removeEventListener('scroll', preventScroll);
      };
    } catch (err) {
      console.error('Error setting up scroll prevention:', err);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear success message when user starts typing
    if (successMessage) {
      setSuccessMessage('');
    }
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
    if (fieldErrors.email || fieldErrors.password) {
      setFieldErrors({ email: '', password: '' });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const emailToUse = formData.email.trim() || forgotPasswordEmail.trim();
    setForgotPasswordEmail(emailToUse);
    setShowForgotPassword(true);
    setResetSent(false);
    setResetError('');
  };

  const handleSendResetEmail = async () => {
    const trimmedEmail = forgotPasswordEmail.trim();

    if (!trimmedEmail) {
      setResetError('Enter the email for this account.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setResetError("That email address isn't valid.");
      return;
    }

    setIsSendingReset(true);
    setResetError('');

    try {
      const result = await UserService.resetPassword(trimmedEmail);

      if (result.error) {
        const copy = toErrorCopy(result.error, 'sendReset');
        if (fieldForError(copy) === 'email') {
          setResetError(inlineError(copy));
        } else {
          toast.error(copy);
        }
      } else if (result.success) {
        setResetSent(true);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(toErrorCopy(error, 'sendReset'));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setResetSent(false);
    setResetError('');
  };

  const emailLooksValid = isValidEmail(formData.email);
  const canSubmit = emailLooksValid && formData.password.length > 0 && !loading && !isSubmitting && !isLocked;
  const forgotEmailValid = isValidEmail(forgotPasswordEmail);
  const emailFieldError = fieldErrors.email || (formData.email.length > 0 && !emailLooksValid ? "That email address isn't valid." : '');
  const forgotEmailError = resetError || (forgotPasswordEmail.length > 0 && !forgotEmailValid ? "That email address isn't valid." : '');

  const presentLoginError = async (raw) => {
    const copy = toErrorCopy(raw, 'login');
    const field = fieldForError(copy);
    if (field) {
      setFieldErrors({
        email: field === 'email' ? inlineError(copy) : '',
        password: field === 'password' ? inlineError(copy) : '',
      });
      return;
    }
    if (isBlockingError(copy)) {
      const confirmed = await statusError(copy, 'login');
      if (confirmed) {
        const kind = copy.what.toLowerCase();
        if (kind.includes('blocked') || kind.includes('inactive')) {
          navigate('/support');
        }
      }
      return;
    }
    toast.error(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocked) {
      setSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    clearError();
    setFieldErrors({ email: '', password: '' });
    setSuccessMessage('');

    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setIsSubmitting(false);
      setFieldErrors({
        email: trimmedEmail ? '' : 'Enter the email for this account.',
        password: trimmedPassword ? '' : 'Enter your password.',
      });
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setIsSubmitting(false);
      setFieldErrors({ email: inlineError(LOGIN_ERRORS.emailInvalid), password: '' });
      return;
    }

    try {
      const { RateLimitService } = await import('../../services/rateLimitService');
      const rateLimitResult = await RateLimitService.checkRateLimit(
        trimmedEmail || 'anonymous',
        '/login',
        RateLimitService.limits.login.maxRequests,
        RateLimitService.limits.login.windowSeconds
      );

      if (!rateLimitResult.allowed) {
        setIsSubmitting(false);
        await presentLoginError(`Too many login attempts. Please try again after ${new Date(rateLimitResult.resetAt).toLocaleTimeString()}.`);
        return;
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed, allowing login:', rateLimitError);
    }

    try {
      const result = await signIn(trimmedEmail, trimmedPassword, formData.rememberMe);

      setIsSubmitting(false);

      if (!result) {
        await presentLoginError('Login failed. Please try again.');
        return;
      }

      if (result && result.success && result.user) {
        if (formData.rememberMe) {
          localStorage.setItem('rememberedEmail', trimmedEmail);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberMe');
        }

        setLoginAttempts(0);
        localStorage.removeItem('loginAttempts');
        setSuccessMessage('Login successful! Redirecting...');

        setTimeout(() => {
          if (result.redirectPath) {
            navigate(result.redirectPath);
          }
        }, 500);
      } else {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());

        if (newAttempts >= 5) {
          const lockoutEnd = new Date(Date.now() + 15 * 60 * 1000);
          setIsLocked(true);
          setLockoutTime(lockoutEnd);
          localStorage.setItem('accountLockoutEnd', lockoutEnd.toISOString());
        }

        if (result && result.error) {
          const errorMsg = String(result.error).toLowerCase();

          if (errorMsg.includes('invalid login credentials') ||
            errorMsg.includes('invalid credentials') ||
            (errorMsg.includes('invalid') && errorMsg.includes('credential'))) {
            try {
              const emailCheck = await UserService.checkEmailExists(trimmedEmail);

              if (emailCheck.error) {
                console.warn('Email check failed, defaulting to password error:', emailCheck.error);
                await presentLoginError(LOGIN_ERRORS.wrongPassword);
              } else if (emailCheck.exists === false) {
                await presentLoginError(LOGIN_ERRORS.emailNotFound);
              } else {
                await presentLoginError(LOGIN_ERRORS.wrongPassword);
              }
            } catch (emailCheckError) {
              console.error('Exception checking email existence:', emailCheckError);
              await presentLoginError(LOGIN_ERRORS.wrongPassword);
            }
          } else {
            await presentLoginError(result.errorType === 'password'
              ? LOGIN_ERRORS.wrongPassword
              : result.errorType === 'email'
                ? LOGIN_ERRORS.emailNotFound
                : result.error);
          }

          clearError();
        } else {
          await presentLoginError(LOGIN_ERRORS.wrongPassword);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setIsSubmitting(false);
      await presentLoginError(err);
    }
  };

  // Handle Enter key in form
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && !isLocked) {
      const form = e.target.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };

  // Get remaining lockout time
  const getRemainingLockoutTime = () => {
    if (!lockoutTime) return 0;
    const remaining = Math.ceil((lockoutTime - new Date()) / 1000 / 60);
    return remaining > 0 ? remaining : 0;
  };

  const openTermsModal = (type) => {
    setModalContentType(type);
    setIsTermsModalOpen(true);
  };

  const closeTermsModal = () => {
    setIsTermsModalOpen(false);
  };

  // Safety check - ensure we have required functions
  if (!signIn || typeof signIn !== 'function') {
    return (
      <section className="fixed inset-0 bg-white flex items-center justify-center z-[9999]">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Loading Login Page...</h1>
          <p className="text-slate-600">Please wait while we initialize.</p>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="fixed inset-0 flex items-center justify-center overflow-hidden p-4" 
      style={{ 
        height: '100vh', 
        width: '100vw', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden',
        maxHeight: '100vh'
      }}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      role="main"
      aria-label="Login page"
    >
      <div className="w-full max-w-md" style={{ maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="mb-2 text-2xl font-bold text-slate-800 sm:text-3xl">Welcome Back</h1>
          <p className="text-sm text-slate-600 sm:text-base">Sign in to your GanApp account</p>
        </div>

        {/* Login Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center" role="alert" aria-live="polite">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Account Lockout Warning */}
          {isLocked && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm" role="alert" aria-live="assertive">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold mb-1">Account Temporarily Locked</p>
                  <p>Too many failed login attempts. Please try again in {getRemainingLockoutTime()} minute{getRemainingLockoutTime() !== 1 ? 's' : ''}.</p>
                </div>
              </div>
            </div>
          )}

          {/* Security Warning for Multiple Failed Attempts */}
          {loginAttempts >= 3 && loginAttempts < 5 && !isLocked && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm" role="alert" aria-live="polite">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold mb-1">Security Warning</p>
                  <p>You have {5 - loginAttempts} attempt{5 - loginAttempts !== 1 ? 's' : ''} remaining before your account is temporarily locked.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6" noValidate>
            <div>
              <FieldLabel htmlFor="email" required>Email</FieldLabel>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                maxLength={FIELD_LIMITS.email}
                disabled={loading || isLocked}
                autoComplete="email"
                aria-required="true"
                aria-invalid={Boolean(emailFieldError)}
                aria-describedby={emailFieldError ? 'email-error' : undefined}
                className={controlClass(Boolean(emailFieldError))}
                placeholder="Enter your email"
              />
              <div className="flex items-start justify-between gap-3">
                <FieldError id="email-error" error={emailFieldError} />
                <CharCount value={formData.email} max={FIELD_LIMITS.email} />
              </div>
            </div>

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
                  disabled={loading || isLocked}
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={controlClass(Boolean(fieldErrors.password), 'pr-12')}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading || isLocked}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <FieldError id="password-error" error={fieldErrors.password} />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={loading || isLocked}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  aria-label="Remember me on this device"
                />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Forgot password? Click to reset"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="min-h-11 w-full rounded-md bg-blue-900 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Sign in to your account"
            >
              {isLocked ? (
                `Account Locked (${getRemainingLockoutTime()} min)`
              ) : (
                <span className="flex items-center justify-center min-h-[1.5rem]">
                  <SmartSpinner
                    active={loading || isSubmitting}
                    variant="inline"
                    light
                    label="Signing in"
                    messages={['Checking your account', 'Still signing you in', 'Almost there']}
                  >
                    Sign In
                  </SmartSpinner>
                </span>
              )}
            </button>
          </form>

          {/* Terms and Privacy Links */}
          <div className="mt-6 text-left">
            <p className="text-xs text-slate-500">
              By signing in, you agree to our{' '}
              <button
                type="button"
                onClick={() => openTermsModal('terms')}
                className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Terms and Conditions"
              >
                Terms and Conditions
              </button>
              {' '}and{' '}
              <button
                type="button"
                onClick={() => openTermsModal('privacy')}
                className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Privacy Policy"
              >
                Privacy Policy
              </button>
            </p>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Don't have an account?{' '}
              <a href="/registration" className="text-blue-600 hover:text-blue-800 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" aria-label="Sign up for a new account">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 id="forgot-password-title" className="text-2xl font-bold text-slate-800">
                    Forgot Password?
                  </h2>
                  <button
                    onClick={handleCloseForgotPassword}
                    className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label="Close forgot password dialog"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-slate-600">
                  {resetSent
                    ? 'Check your email for the password reset link.'
                    : 'Enter your email address and we\'ll send you a link to reset your password.'}
                </p>
              </div>

              {!resetSent ? (
                <>
                  <div className="mb-6">
                    <FieldLabel htmlFor="forgot-email" required>Email Address</FieldLabel>
                    <input
                      type="email"
                      id="forgot-email"
                      value={forgotPasswordEmail}
                      onChange={(e) => {
                        setForgotPasswordEmail(e.target.value);
                        if (resetError) setResetError('');
                      }}
                      disabled={isSendingReset}
                      maxLength={FIELD_LIMITS.email}
                      autoComplete="email"
                      aria-invalid={Boolean(forgotEmailError)}
                      aria-describedby={forgotEmailError ? 'forgot-email-error' : undefined}
                      className={controlClass(Boolean(forgotEmailError))}
                      placeholder="Enter your email address"
                      aria-required="true"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <FieldError id="forgot-email-error" error={forgotEmailError} />
                      <CharCount value={forgotPasswordEmail} max={FIELD_LIMITS.email} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleSendResetEmail}
                      disabled={isSendingReset || !forgotEmailValid}
                      className="min-h-11 w-full rounded-md bg-blue-900 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      aria-label="Send password reset email"
                    >
                      {isSendingReset ? (
                        <span className="flex items-center justify-center min-h-[1.5rem]">
                          <SmartSpinner
                            active
                            variant="inline"
                            light
                            label="Sending"
                            messages={['Still sending', 'This is taking a bit longer', 'Almost there']}
                          >
                            Send Reset Link
                          </SmartSpinner>
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                    <button
                      onClick={handleCloseForgotPassword}
                      disabled={isSendingReset}
                      className="w-full border-2 border-slate-300 text-slate-700 py-3 px-6 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500"
                      aria-label="Cancel password reset"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4" aria-hidden="true">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      Email Sent!
                    </h3>
                    <p className="text-slate-600">
                      We've sent a password reset link to<br />
                      <span className="font-semibold">{forgotPasswordEmail}</span>
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                    <h4 className="text-blue-900 text-base mb-2 font-semibold">
                      Next Steps:
                    </h4>
                    <ol className="text-blue-800 text-sm leading-6 space-y-1 list-decimal list-inside">
                      <li>Check your email inbox</li>
                      <li>Click the reset link in the email</li>
                      <li>Create a new password</li>
                      <li>Sign in with your new password</li>
                    </ol>
                  </div>

                  {/* Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleSendResetEmail}
                      disabled={isSendingReset}
                      className="min-h-11 w-full rounded-md bg-blue-900 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      aria-label="Resend password reset email"
                    >
                      {isSendingReset ? 'Sending...' : 'Resend Email'}
                    </button>
                    <button
                      onClick={handleCloseForgotPassword}
                      className="w-full border-2 border-slate-300 text-slate-700 py-3 px-6 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                      aria-label="Close and return to login"
                    >
                      Back to Login
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={closeTermsModal}
        contentType={modalContentType}
      />
    </section>
  );
};

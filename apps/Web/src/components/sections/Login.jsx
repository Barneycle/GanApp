import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/userService';

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Get redirect path based on user role
      const redirectPath = getRedirectPath(user);
      if (redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [isAuthenticated, user, navigate, getRedirectPath]);

  // Clear error when component unmounts or user navigates away
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Prevent body and html scrolling when login page is mounted
  useEffect(() => {
    const root = document.getElementById('root');
    const preventScroll = (e) => {
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
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      setResetError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setResetError('Please enter a valid email address');
      return;
    }

    setIsSendingReset(true);
    setResetError('');

    try {
      const result = await UserService.resetPassword(trimmedEmail);
      
      if (result.error) {
        setResetError(result.error);
      } else if (result.success) {
        setResetSent(true);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setResetError('An unexpected error occurred. Please try again.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Trim email and password before submitting
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    
    try {
      const result = await signIn(trimmedEmail, trimmedPassword);
      
      if (result && result.success && result.user) {
        
        // Navigate to role-specific page
        if (result.redirectPath) {
          navigate(result.redirectPath);
        } else {
        }
      } else {
      }
    } catch (err) {
    }
  };

  return (
    <section 
      className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" 
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
    >
      <div className="w-full max-w-md" style={{ maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to your GanApp account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Don't have an account?{' '}
              <a href="/registration" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Forgot Password?
                  </h2>
                  <button
                    onClick={handleCloseForgotPassword}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  {/* Error Message */}
                  {resetError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {resetError}
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="mb-6">
                    <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="forgot-email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      disabled={isSendingReset}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter your email address"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleSendResetEmail}
                      disabled={isSendingReset}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSendingReset ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button
                      onClick={handleCloseForgotPassword}
                      disabled={isSendingReset}
                      className="w-full border-2 border-slate-300 text-slate-700 py-3 px-6 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
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
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSendingReset ? 'Sending...' : 'Resend Email'}
                    </button>
                    <button
                      onClick={handleCloseForgotPassword}
                      className="w-full border-2 border-slate-300 text-slate-700 py-3 px-6 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200"
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
    </section>
  );
};
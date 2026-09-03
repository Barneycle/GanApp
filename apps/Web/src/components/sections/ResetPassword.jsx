import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { UserService } from '../../services/userService';
import { SmartSpinner } from '../loading/SmartSpinner';
import { ErrorState } from '../ErrorState';
import { errorCopy } from '../../utils/errorCopy';
import { FIELD_LIMITS, isPasswordValid } from '../../utils/formFields';
import { CharCount, FieldError, FieldLabel, PasswordChecklist, controlClass } from '../form/Field';
import { statusError } from '../Toast';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkResetToken = async () => {
      try {
        setIsValidating(true);
        setError('');

        // Check URL hash for access_token and refresh_token (Supabase format)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          // Set the session with the tokens
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
          // Check if user is already authenticated (might have valid session)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session && !sessionError) {
            setIsValidToken(true);
          } else {
            setError('Invalid or expired reset link. Please request a new one.');
            setIsValidToken(false);
          }
        }
      } catch (err) {
        console.error('Error validating reset token:', err);
        setError('An error occurred while validating the reset link.');
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    checkResetToken();
  }, [location]);

  const canSubmit = isPasswordValid(newPassword) && newPassword === confirmPassword && !isLoading;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!canSubmit) {
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        await statusError(updateError, 'passwordReset');
        setIsLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      
      // Sign out to clear the session
      await supabase.auth.signOut();
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      await statusError(err, 'passwordReset');
      setIsLoading(false);
    }
  };

  // Show loading while validating token
  if (isValidating) {
    return (
      <section className="fixed inset-0 flex items-center justify-center overflow-hidden p-4">
        <SmartSpinner
          active
          label="Validating reset link"
          messages={['Still checking your link', 'Almost there']}
        />
      </section>
    );
  }

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <ErrorState
        error={errorCopy({
          what: 'This reset link is not valid.',
          why: error && typeof error === 'string'
            ? error
            : 'The link is missing, already used, or has expired.',
          action: 'Go back to login and request a new reset email.',
        })}
        onRetry={() => navigate('/login')}
        retryLabel="Go to Login"
      />
    );
  }

  // Show success message
  if (success) {
    return (
      <section className="fixed inset-0 flex items-center justify-center overflow-hidden p-4">
        <div className="w-full max-w-md">
          <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 text-center sm:p-6 lg:p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Password Reset Successful!</h2>
            <p className="text-slate-600 mb-6">
              Your password has been updated successfully. You can now sign in with your new password.
            </p>
            <p className="text-sm text-slate-500 mb-6">Redirecting to login page...</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Show reset password form
  return (
    <section className="fixed inset-0 flex items-center justify-center overflow-hidden p-4">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="mb-2 text-2xl font-bold text-slate-800 sm:text-3xl">Reset Your Password</h1>
            <p className="text-slate-600">Enter your new password below</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <FieldLabel htmlFor="newPassword" required>New Password</FieldLabel>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  maxLength={FIELD_LIMITS.password}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className={controlClass(false, 'pr-12')}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
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
              <PasswordChecklist password={newPassword} confirm={confirmPassword} />
              <CharCount value={newPassword} max={FIELD_LIMITS.password} />
            </div>

            <div>
              <FieldLabel htmlFor="confirmPassword" required>Confirm Password</FieldLabel>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className={controlClass(confirmPassword.length > 0 && newPassword !== confirmPassword, 'pr-12')}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? (
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
              {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
                <FieldError error="Passwords do not match yet." />
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="min-h-11 w-full rounded-md bg-blue-900 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <span className="flex items-center justify-center min-h-[1.5rem]">
                <SmartSpinner
                  active={isLoading}
                  variant="inline"
                  light
                  label="Resetting password"
                  messages={['Still resetting', 'Almost there']}
                >
                  Reset Password
                </SmartSpinner>
              </span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};


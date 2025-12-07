import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsService } from '../../services/settingsService';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { Settings as SettingsIcon, Bell, Save } from 'lucide-react';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    event_reminders: true,
    survey_notifications: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const isVisible = usePageVisibility();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Only load once on mount, prevent reloading when switching tabs/windows
    if (!hasLoadedRef.current && user?.id) {
      hasLoadedRef.current = true;
      loadPreferences();
    }
  }, [isAuthenticated, user?.id, authLoading, navigate]);

  const loadPreferences = async () => {
    if (!user?.id || !isVisible) return;

    try {
      setLoading(true);
      setError(null);

      const result = await SettingsService.getNotificationPreferences(user.id);
      
      if (result.error) {
        setError(result.error);
      } else if (result.preferences) {
        if (isVisible) {
          setPreferences({
            email_notifications: result.preferences.email_notifications ?? true,
            push_notifications: result.preferences.push_notifications ?? true,
            event_reminders: result.preferences.event_reminders ?? true,
            survey_notifications: result.preferences.survey_notifications ?? true,
          });
        }
      }
    } catch (err) {
      if (isVisible) {
        setError('Failed to load preferences');
      }
    } finally {
      if (isVisible) {
        setLoading(false);
      }
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setSuccess('');
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess('');

      const result = await SettingsService.updateNotificationPreferences(user.id, preferences);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || !deleteReason.trim()) {
      setError('Please provide a reason for deleting your account');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result = await SettingsService.deleteAccount(user.id, deleteReason);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Sign out and redirect
        await signOut();
        navigate('/');
      }
    } catch (err) {
      setError('Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading settings...</p>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3" />
            Settings
          </h1>
          <p className="text-slate-600">Manage your account settings and preferences</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center" role="alert">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start" role="alert">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Notification Preferences */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <div className="flex items-center mb-6">
            <Bell className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-slate-800">Notification Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="email_notifications" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Email Notifications
                </label>
                <p className="text-xs text-slate-500 mt-1">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="email_notifications"
                  checked={preferences.email_notifications}
                  onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="push_notifications" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Push Notifications
                </label>
                <p className="text-xs text-slate-500 mt-1">Receive push notifications in your browser</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="push_notifications"
                  checked={preferences.push_notifications}
                  onChange={(e) => handlePreferenceChange('push_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="event_reminders" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Event Reminders
                </label>
                <p className="text-xs text-slate-500 mt-1">Get reminded about upcoming events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="event_reminders"
                  checked={preferences.event_reminders}
                  onChange={(e) => handlePreferenceChange('event_reminders', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="survey_notifications" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Survey Notifications
                </label>
                <p className="text-xs text-slate-500 mt-1">Get notified when new surveys are available</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="survey_notifications"
                  checked={preferences.survey_notifications}
                  onChange={(e) => handlePreferenceChange('survey_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-6">
          <p className="text-sm text-slate-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="deleteReason" className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for deletion (required)
                </label>
                <textarea
                  id="deleteReason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Please tell us why you're deleting your account..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteReason('');
                  }}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={saving || !deleteReason.trim()}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Deleting...' : 'Confirm Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};


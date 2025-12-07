import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/userService';
import { Camera, X } from 'lucide-react';

export const EditProfile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    affiliated_organization: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        affiliated_organization: user.affiliated_organization || ''
      });
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      if (error) setError(null);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (passwordError) setPasswordError(null);
    if (passwordSuccess) setPasswordSuccess(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password');
      setChangingPassword(false);
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError('Please enter a new password');
      setChangingPassword(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setChangingPassword(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setChangingPassword(false);
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      setChangingPassword(false);
      return;
    }

    try {
      const result = await UserService.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.error) {
        setPasswordError(result.error);
      } else {
        setPasswordSuccess(true);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        // Hide password change section after success
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!user?.id) {
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }

      let avatarUrl = user.avatar_url || '';

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const uploadResult = await UserService.uploadAvatar(user.id, avatarFile);
        if (uploadResult.error) {
          setError(uploadResult.error);
          setLoading(false);
          return;
        }
        avatarUrl = uploadResult.url || '';
      }

      // Prepare update data
      const updateData = {
        affiliated_organization: formData.affiliated_organization.trim()
      };

      // Add avatar URL if changed or removed
      if (avatarFile) {
        // New avatar uploaded
        updateData.avatar_url = avatarUrl;
      } else if (!avatarPreview && user.avatar_url) {
        // Avatar was removed
        updateData.avatar_url = '';
      }

      const result = await UserService.updateProfile(user.id, updateData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Update the user context by reloading the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Profile Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              Profile updated successfully! Refreshing...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Avatar Upload Section - Centered at Top */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {avatarPreview && avatarPreview !== '' ? (
                <div className="relative">
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-48 h-48 rounded-full object-cover border-[6px] border-blue-600 shadow-2xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-3 -right-3 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-xl"
                    disabled={loading}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-[6px] border-blue-600 shadow-2xl">
                  <span className="text-white text-6xl font-bold">
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-2 right-2 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-xl"
              >
                <Camera className="w-7 h-7" />
                <input
                  id="avatar-upload"
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
            <p className="mt-4 text-sm text-slate-600 text-center">
              Click the camera icon to upload a profile picture
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Affiliated Organization Field */}
            <div>
              <label htmlFor="affiliated_organization" className="block text-sm font-medium text-slate-700 mb-2">
                Affiliated Organization *
              </label>
              <input
                type="text"
                id="affiliated_organization"
                name="affiliated_organization"
                value={formData.affiliated_organization}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your affiliated organization"
              />
            </div>

            {/* User Role Display (Read-only) */}
            {user?.role && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <div className="px-4 py-3 border border-slate-300 rounded-xl bg-slate-50">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'organizer' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Role cannot be changed. Contact support if you need to update your role.
                </p>
              </div>
            )}

            {/* Change Password Section */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>
                  <p className="text-sm text-slate-600">Update your password to keep your account secure</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(!showPasswordChange);
                    setPasswordError(null);
                    setPasswordSuccess(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  disabled={loading || changingPassword}
                >
                  {showPasswordChange ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordChange && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Password Success Message */}
                  {passwordSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                      Password changed successfully!
                    </div>
                  )}

                  {/* Password Error Message */}
                  {passwordError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {passwordError}
                    </div>
                  )}

                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-2">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={changingPassword}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter your current password"
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                      New Password *
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={changingPassword}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter your new password (min. 6 characters)"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={changingPassword}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Confirm your new password"
                    />
                  </div>

                  {/* Change Password Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {changingPassword ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="flex-1 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-300 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};


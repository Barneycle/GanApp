import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/userService';
import { OrganizationService } from '../../services/organizationService';
import { Camera, X } from 'lucide-react';

export const EditProfile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);
  const orgDropdownRef = useRef(null);
  const orgInputRef = useRef(null);
  const [formData, setFormData] = useState({
    affiliated_organization: ''
  });
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [showCustomOrgInput, setShowCustomOrgInput] = useState(false);
  const [customOrgName, setCustomOrgName] = useState('');
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
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

  // Helper function to check if user profile is complete
  const isProfileComplete = (user) => {
    if (!user) return false;
    const firstName = user.first_name;
    const lastName = user.last_name;
    const affiliatedOrg = user.affiliated_organization;
    
    const hasFirstName = firstName !== undefined && firstName !== null && String(firstName).trim() !== '';
    const hasLastName = lastName !== undefined && lastName !== null && String(lastName).trim() !== '';
    const hasAffiliatedOrg = affiliatedOrg !== undefined && affiliatedOrg !== null && String(affiliatedOrg).trim() !== '';
    
    return hasFirstName && hasLastName && hasAffiliatedOrg;
  };

  // Redirect if not authenticated or profile incomplete
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Note: EditProfile allows access even if profile is incomplete (for completing it)
    // But we can still check and show a message if needed
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

  // Load organizations on mount
  useEffect(() => {
    const loadOrganizations = async () => {
      setLoadingOrganizations(true);
      const result = await OrganizationService.getOrganizationsGrouped();
      if (result.error) {
        console.error('Error loading organizations:', result.error);
        setError('Failed to load organizations. Please refresh the page.');
      } else {
        setOrganizations(result.groups || []);
      }
      setLoadingOrganizations(false);
    };
    loadOrganizations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        orgDropdownRef.current &&
        !orgDropdownRef.current.contains(event.target) &&
        orgInputRef.current &&
        !orgInputRef.current.contains(event.target)
      ) {
        setShowOrgDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize organization display when org list loads
  useEffect(() => {
    if (user && organizations.length > 0) {
      const orgExists = organizations.some(group =>
        group.organizations.some(org => org.name === user.affiliated_organization)
      );

      if (user.affiliated_organization && !orgExists) {
        setShowCustomOrgInput(true);
        setCustomOrgName(user.affiliated_organization);
      } else if (user.affiliated_organization) {
        setOrgSearchQuery(user.affiliated_organization);
        setFormData(prev => ({
          ...prev,
          affiliated_organization: user.affiliated_organization || ''
        }));
      }
    }
  }, [user, organizations]);

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

  const handleOrgSearchChange = (e) => {
    const value = e.target.value;
    setOrgSearchQuery(value);
    setShowOrgDropdown(true);
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleSelectOrganization = (orgName) => {
    if (orgName === '__OTHER__') {
      setShowCustomOrgInput(true);
      setOrgSearchQuery('');
      setFormData(prev => ({
        ...prev,
        affiliated_organization: ''
      }));
      setShowOrgDropdown(false);
    } else {
      setOrgSearchQuery(orgName);
      setFormData(prev => ({
        ...prev,
        affiliated_organization: orgName
      }));
      setShowCustomOrgInput(false);
      setCustomOrgName('');
      setShowOrgDropdown(false);
    }
  };

  const handleCustomOrgChange = (e) => {
    const value = e.target.value;
    setCustomOrgName(value);
    setFormData(prev => ({
      ...prev,
      affiliated_organization: value
    }));
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  // Filter organizations based on search query
  const getFilteredOrganizations = () => {
    if (!orgSearchQuery.trim()) {
      return organizations;
    }

    const query = orgSearchQuery.toLowerCase();
    return organizations
      .map(group => ({
        ...group,
        organizations: group.organizations.filter(org =>
          org.name.toLowerCase().includes(query) ||
          group.category.toLowerCase().includes(query)
        )
      }))
      .filter(group => group.organizations.length > 0);
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

      // Handle custom organization
      let orgName = showCustomOrgInput
        ? customOrgName.trim()
        : (formData.affiliated_organization.trim() || orgSearchQuery.trim());

      if (showCustomOrgInput && orgName) {
        const orgResult = await OrganizationService.createCustomOrganization(orgName, user.id);
        if (orgResult.error) {
          setError(orgResult.error);
          setLoading(false);
          return;
        }
        orgName = orgResult.organization?.name || orgName;
      }

      // Prepare update data
      const updateData = {
        affiliated_organization: orgName
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
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {/* Profile Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 lg:p-8">
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
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="relative">
              {avatarPreview && avatarPreview !== '' ? (
                <div className="relative">
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full object-cover border-4 sm:border-[5px] lg:border-[6px] border-blue-600 shadow-2xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-10 h-10 sm:w-12 sm:h-12 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-xl"
                    disabled={loading}
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 sm:border-[5px] lg:border-[6px] border-blue-600 shadow-2xl">
                  <span className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold">
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-2 right-2 w-14 h-14 bg-blue-900 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-800 transition-colors shadow-xl"
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
            {/* Affiliated Organization Searchable Dropdown */}
            <div>
              <label htmlFor="affiliated_organization" className="block text-sm font-medium text-slate-700 mb-2">
                Affiliated Organization *
              </label>
              {loadingOrganizations ? (
                <div className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-600">
                  Loading organizations...
                </div>
              ) : (
                <>
                  {!showCustomOrgInput ? (
                    <div className="relative" ref={orgDropdownRef}>
                      <div className="relative">
                        <input
                          ref={orgInputRef}
                          type="text"
                          id="affiliated_organization"
                          name="affiliated_organization"
                          value={showOrgDropdown ? orgSearchQuery : (formData.affiliated_organization || '')}
                          onChange={handleOrgSearchChange}
                          onFocus={() => {
                            setShowOrgDropdown(true);
                            // If there's a selected org, show it in search query for editing
                            if (formData.affiliated_organization && !orgSearchQuery) {
                              setOrgSearchQuery(formData.affiliated_organization);
                            }
                          }}
                          required
                          disabled={loading}
                          className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Type to search organizations..."
                          autoComplete="off"
                        />
                        <svg
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 transition-transform ${showOrgDropdown ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Dropdown List */}
                      {showOrgDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-lg max-h-96 overflow-y-auto">
                          {getFilteredOrganizations().length > 0 ? (
                            <>
                              {getFilteredOrganizations().map((group) => (
                                <div key={group.category}>
                                  <div className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-sm sticky top-0">
                                    {group.category}
                                  </div>
                                  {group.organizations.map((org) => (
                                    <button
                                      key={org.id}
                                      type="button"
                                      onClick={() => handleSelectOrganization(org.name)}
                                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-900 transition-colors"
                                    >
                                      {org.name}
                                    </button>
                                  ))}
                                </div>
                              ))}
                              <div className="border-t border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleSelectOrganization('__OTHER__')}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 font-medium transition-colors"
                                >
                                  Other (specify below)
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="px-4 py-3 text-slate-600 text-sm">
                              No organizations found.{' '}
                              <button
                                type="button"
                                className="text-blue-600 underline font-medium"
                                onClick={() => handleSelectOrganization('__OTHER__')}
                              >
                                Add custom organization
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={customOrgName}
                        onChange={handleCustomOrgChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Enter your organization name"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomOrgInput(false);
                          setCustomOrgName('');
                          setOrgSearchQuery('');
                          setFormData(prev => ({ ...prev, affiliated_organization: '' }));
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                        disabled={loading}
                      >
                        Select from list instead
                      </button>
                    </div>
                  )}
                </>
              )}
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


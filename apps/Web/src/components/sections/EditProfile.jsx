import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/userService';
import { OrganizationService } from '../../services/organizationService';
import { Camera, X } from 'lucide-react';
import { PageSkeleton } from '../loading/Skeleton';
import { SmartSpinner } from '../loading/SmartSpinner';
import { FIELD_LIMITS, isPasswordValid } from '../../utils/formFields';
import { CharCount, FieldError, FieldLabel, PasswordChecklist, controlClass } from '../form/Field';
import { statusError, useToast } from '../Toast';
import { fieldForError, inlineError, toErrorCopy } from '../../utils/errorCopy';

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
  const [avatarError, setAvatarError] = useState('');
  const [passwordFieldError, setPasswordFieldError] = useState({ current: '', confirm: '' });
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const toast = useToast();
  const [changingPassword, setChangingPassword] = useState(false);

  // Helper function to check if user profile is complete
  const _isProfileComplete = (user) => {
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
        toast.error('Organizations didn’t load. Refresh the page, then try again.');
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

  const _handleInputChange = (e) => {
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
        setAvatarError('Choose an image file (JPG, PNG, or similar).');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setAvatarError('That image is over 5MB. Choose a smaller file.');
        return;
      }

      setAvatarError('');

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
    if (passwordFieldError.current || passwordFieldError.confirm) {
      setPasswordFieldError({ current: '', confirm: '' });
    }
    if (passwordSuccess) setPasswordSuccess(false);
  };

  const canChangePassword = Boolean(
    passwordData.currentPassword
    && isPasswordValid(passwordData.newPassword)
    && passwordData.newPassword === passwordData.confirmPassword
    && passwordData.currentPassword !== passwordData.newPassword
    && !changingPassword
  );

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordFieldError({ current: '', confirm: '' });
    setPasswordSuccess(false);

    if (!canChangePassword) {
      setChangingPassword(false);
      return;
    }

    try {
      const result = await UserService.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.error) {
        const copy = toErrorCopy(result.error, 'passwordChange');
        if (fieldForError(copy) === 'password' || /current password|doesn't match|incorrect/i.test(String(result.error))) {
          setPasswordFieldError({ current: inlineError(copy), confirm: '' });
        } else {
          toast.error(copy);
        }
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
      toast.error(toErrorCopy(err, 'passwordChange'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAvatarError('');
    setError(null);
    setSuccess(false);

    try {
      if (!user?.id) {
        setLoading(false);
        const confirmed = await statusError('Your session expired.', 'profile', { confirmText: 'Sign in' });
        if (confirmed) navigate('/login');
        return;
      }

      let avatarUrl = user.avatar_url || '';

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const uploadResult = await UserService.uploadAvatar(user.id, avatarFile);
        if (uploadResult.error) {
          setAvatarError(inlineError(toErrorCopy(uploadResult.error, 'profile')));
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
          toast.error(toErrorCopy(orgResult.error, 'profile'));
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
        toast.error(toErrorCopy(result.error, 'profile'));
      } else {
        setSuccess(true);
        // Update the user context by reloading the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      toast.error(toErrorCopy(err, 'profile'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <PageSkeleton variant="form" />;
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
            <FieldError error={avatarError} />
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
                    setPasswordFieldError({ current: '', confirm: '' });
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

                  <div>
                    <FieldLabel htmlFor="currentPassword" required>Current Password</FieldLabel>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={changingPassword}
                      aria-invalid={Boolean(passwordFieldError.current)}
                      className={controlClass(Boolean(passwordFieldError.current))}
                      placeholder="Enter your current password"
                    />
                    <FieldError error={passwordFieldError.current} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="newPassword" required>New Password</FieldLabel>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      maxLength={FIELD_LIMITS.password}
                      disabled={changingPassword}
                      className={controlClass(false)}
                      placeholder="Enter your new password"
                    />
                    <PasswordChecklist password={passwordData.newPassword} confirm={passwordData.confirmPassword} />
                    <CharCount value={passwordData.newPassword} max={FIELD_LIMITS.password} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="confirmPassword" required>Confirm New Password</FieldLabel>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      maxLength={FIELD_LIMITS.password}
                      disabled={changingPassword}
                      className={controlClass(passwordData.confirmPassword.length > 0 && passwordData.newPassword !== passwordData.confirmPassword)}
                      placeholder="Confirm your new password"
                    />
                    {passwordData.confirmPassword.length > 0 && passwordData.newPassword !== passwordData.confirmPassword ? (
                      <FieldError error="Passwords do not match yet." />
                    ) : null}
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={!canChangePassword}
                      className="w-full rounded-xl bg-blue-900 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
                {loading ? (
                  <SmartSpinner active variant="inline" light label="Saving" messages={['Still saving', 'Almost there']}>
                    Save Changes
                  </SmartSpinner>
                ) : (
                  'Save Changes'
                )}
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


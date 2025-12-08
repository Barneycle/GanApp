import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/userService';
import { Camera, X, Info } from 'lucide-react';

export const SetupProfile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    prefix: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    affix: '',
    affiliated_organization: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitializedForm = useRef(false);

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

  // Redirect if not authenticated or if profile is already complete
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // If profile is already complete, redirect to appropriate page
    if (isProfileComplete(user)) {
      // Redirect based on role
      if (user?.role === 'admin') {
        navigate('/admin');
      } else if (user?.role === 'organizer') {
        navigate('/organizer');
      } else if (user?.role === 'participant') {
        navigate('/participants');
      } else {
        navigate('/');
      }
      return;
    }
  }, [user, isAuthenticated, authLoading, navigate]);

  // Load existing user data if available (only once on initial load)
  useEffect(() => {
    if (user && !hasInitializedForm.current) {
      setFormData({
        prefix: user.prefix || '',
        first_name: user.first_name || '',
        middle_initial: user.middle_initial || '',
        last_name: user.last_name || '',
        affix: user.affix || '',
        affiliated_organization: user.affiliated_organization || ''
      });
      setAvatarPreview(user.avatar_url || null);
      hasInitializedForm.current = true;
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
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const trimmedFirstName = formData.first_name.trim();
    const trimmedLastName = formData.last_name.trim();
    const trimmedOrg = formData.affiliated_organization.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      return 'First name and last name are required';
    }

    if (!trimmedOrg) {
      return 'Affiliated organization is required';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      if (!user?.id) {
        setError('User not found. Please log in again.');
        navigate('/login');
        return;
      }

      let avatarUrl = '';

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
        prefix: formData.prefix.trim() || '',
        first_name: formData.first_name.trim(),
        middle_initial: formData.middle_initial.trim() || '',
        last_name: formData.last_name.trim(),
        affix: formData.affix.trim() || '',
        affiliated_organization: formData.affiliated_organization.trim()
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const result = await UserService.updateProfile(user.id, updateData);

      if (result.error) {
        setError(result.error);
      } else {
        // Refresh user data from the server
        await refreshUser();
        
        // Redirect based on role
        if (user?.role === 'admin') {
          navigate('/admin');
        } else if (user?.role === 'organizer') {
          navigate('/organizer');
        } else if (user?.role === 'participant') {
          navigate('/participants');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error('Setup profile error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again.');
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

  // Don't render if not authenticated or profile is complete (will redirect)
  if (!isAuthenticated || isProfileComplete(user)) {
    return null;
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Set Up Your Profile
          </h1>
          <p className="text-lg text-slate-600">
            Complete your profile to get started
          </p>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-amber-800 text-sm">
                Make sure to use your real name as you can't change it later.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-600 shadow-lg">
                    <span className="text-white text-4xl font-bold">
                      {formData.first_name?.[0] || formData.last_name?.[0] || user?.email?.[0] || 'U'}
                    </span>
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-blue-900 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-800 transition-colors shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
              <p className="text-sm text-slate-600 mt-3 text-center">
                Tap the camera icon to select a photo (optional)
              </p>
            </div>

            {/* Name Fields - Stacked */}
            <div className="space-y-6 mb-6">
              {/* Prefix Dropdown */}
              <div>
                <label htmlFor="prefix" className="block text-base font-semibold text-slate-800 mb-2">
                  Prefix <span className="text-slate-500 font-normal text-sm">(optional)</span>
                </label>
                <select
                  id="prefix"
                  name="prefix"
                  value={formData.prefix}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Select...</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Miss">Miss</option>
                  <option value="Engr.">Engr.</option>
                  <option value="Atty.">Atty.</option>
                  <option value="Rev.">Rev.</option>
                  <option value="Hon.">Hon.</option>
                </select>
              </div>

              {/* First Name Input */}
              <div>
                <label htmlFor="first_name" className="block text-base font-semibold text-slate-800 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Enter your first name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Middle Initial Input */}
              <div>
                <label htmlFor="middle_initial" className="block text-base font-semibold text-slate-800 mb-2">
                  Middle Initial <span className="text-slate-500 font-normal text-sm">(optional)</span>
                </label>
                <input
                  type="text"
                  id="middle_initial"
                  name="middle_initial"
                  value={formData.middle_initial}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase();
                    // Only add period if user is typing (value has a letter at the end, not a period)
                    // This allows the period to be deleted but will reappear when typing
                    if (value && value.length > 0) {
                      const lastChar = value[value.length - 1];
                      // If last character is a letter (not period, not space), add period
                      if (/[A-Za-z]/.test(lastChar)) {
                        value = value + '.';
                      }
                    }
                    handleInputChange({ target: { name: 'middle_initial', value } });
                  }}
                  maxLength="2"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="A"
                  disabled={loading}
                />
              </div>

              {/* Last Name Input */}
              <div>
                <label htmlFor="last_name" className="block text-base font-semibold text-slate-800 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Enter your last name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Affix Dropdown */}
              <div>
                <label htmlFor="affix" className="block text-base font-semibold text-slate-800 mb-2">
                  Affix <span className="text-slate-500 font-normal text-sm">(optional)</span>
                </label>
                <select
                  id="affix"
                  name="affix"
                  value={formData.affix}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Select...</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="V">V</option>
                </select>
              </div>
            </div>

            {/* Affiliated Organization Input */}
            <div className="mb-6">
              <label htmlFor="affiliated_organization" className="block text-base font-semibold text-slate-800 mb-2">
                Affiliated Organization <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="affiliated_organization"
                name="affiliated_organization"
                value={formData.affiliated_organization}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Enter your organization"
                required
                disabled={loading}
              />
            </div>

            {/* Required Fields Legend */}
            <div className="mb-6">
              <p className="text-sm text-slate-600">
                <span className="text-red-500 font-bold">*</span> Required fields
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-800 text-white py-3 rounded-xl font-semibold text-base hover:bg-blue-900 transition-colors shadow-lg hover:shadow-xl ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Completing Setup...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};


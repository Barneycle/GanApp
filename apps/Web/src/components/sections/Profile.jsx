import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Edit, Mail, Building2, Calendar, Shield } from 'lucide-react';

// Helper function to check if user profile is complete
const isProfileComplete = (user) => {
  if (!user) return false;
  const hasFirstName = user.first_name?.trim() !== '';
  const hasLastName = user.last_name?.trim() !== '';
  const hasAffiliatedOrg = user.affiliated_organization?.trim() !== '';
  return hasFirstName && hasLastName && hasAffiliatedOrg;
};

export const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Redirect if not authenticated or profile incomplete
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Redirect to setup-profile if profile is incomplete
    if (!isProfileComplete(user)) {
      navigate('/setup-profile');
      return;
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  // Get user's full name with prefix and affix
  const getFullName = () => {
    if (!user) return '';
    const parts = [];
    if (user.prefix) parts.push(user.prefix);
    if (user.first_name) parts.push(user.first_name);
    if (user.middle_initial) parts.push(user.middle_initial);
    if (user.last_name) parts.push(user.last_name);
    if (user.affix) parts.push(user.affix);
    return parts.join(' ') || 'User';
  };

  // Get display name (first name + last name, with prefix/affix if available)
  const getDisplayName = () => {
    if (!user) return '';
    const parts = [];
    if (user.first_name) parts.push(user.first_name);
    if (user.last_name) parts.push(user.last_name);
    return parts.join(' ') || user.email || 'User';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    if (firstName) return firstName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  // Format role for display
  const formatRole = (role) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (authLoading || !isAuthenticated || !isProfileComplete(user)) {
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
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Header with Avatar and Name */}
          <div className="flex flex-col items-center mb-8">
            {/* Avatar */}
            {user?.avatar_url ? (
              <div className="relative mb-4">
                <img
                  src={user.avatar_url}
                  alt={getFullName()}
                  className="w-40 h-40 rounded-full object-cover border-4 border-blue-600 shadow-lg"
                />
              </div>
            ) : (
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-600 shadow-lg mb-4">
                <span className="text-white text-5xl font-bold">
                  {getUserInitials()}
                </span>
              </div>
            )}

            {/* Name */}
            <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">
              {getDisplayName()}
            </h1>
            {/* Full name with prefix/affix if different */}
            {getFullName() !== getDisplayName() && (
              <p className="text-lg text-slate-600 mb-2 text-center">
                {getFullName()}
              </p>
            )}

            {/* Role */}
            {user?.role && (
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-5 h-5 text-slate-500" />
                <span className="text-lg text-slate-600 capitalize">
                  {formatRole(user.role)}
                </span>
              </div>
            )}

            {/* Edit Profile Button */}
            <button
              onClick={() => navigate('/edit-profile')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <Edit className="w-5 h-5" />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Profile Information */}
          <div className="border-t border-slate-200 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              {user?.email && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">Email</p>
                    <p className="text-base text-slate-800">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Affiliated Organization */}
              {user?.affiliated_organization && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">Affiliated Organization</p>
                    <p className="text-base text-slate-800">{user.affiliated_organization}</p>
                  </div>
                </div>
              )}

              {/* Member Since */}
              {user?.created_at && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">Member Since</p>
                    <p className="text-base text-slate-800">{formatDate(user.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


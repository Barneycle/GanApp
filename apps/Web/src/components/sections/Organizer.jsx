import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrganizerEventsDashboard } from '../organizer/OrganizerEventsDashboard';
import { useAuth } from '../../contexts/AuthContext';

const isProfileComplete = (user) => {
  if (!user) return false;
  return [user.first_name, user.last_name, user.affiliated_organization].every(
    (value) => value !== undefined && value !== null && String(value).trim() !== ''
  );
};

export const Organizer = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'organizer' && user?.role !== 'admin') {
      navigate('/');
      return;
    }
    if (user?.role === 'organizer' && !isProfileComplete(user)) {
      navigate('/setup-profile');
    }
  }, [user, isAuthenticated, authLoading, navigate]);

  if (authLoading || !isAuthenticated || (user?.role !== 'organizer' && user?.role !== 'admin')) {
    return null;
  }

  if (user?.role === 'organizer' && !isProfileComplete(user)) {
    return null;
  }

  return <OrganizerEventsDashboard user={user} />;
};

export const ManageEvents = Organizer;

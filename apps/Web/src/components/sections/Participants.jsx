import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventShowcase } from '../EventShowcase';
import { EventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';

const isProfileComplete = (user) => {
  if (!user) return false;
  return [user.first_name, user.last_name, user.affiliated_organization].every(
    (value) => value !== undefined && value !== null && String(value).trim() !== ''
  );
};

export const Participants = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'participant') {
      navigate('/');
      return;
    }
    if (!isProfileComplete(user)) {
      navigate('/setup-profile');
      return;
    }
    loadEvents();
    loadFeaturedEvent();
  }, [user, isAuthenticated, authLoading, navigate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Loading timeout after 10 seconds')), 10000)
      );
      const result = await Promise.race([EventService.getPublishedEvents(), timeoutPromise]);
      if (result.error) {
        setError(result.error);
      } else {
        const now = new Date();
        const upcomingEvents = (result.events || []).filter((event) => {
          if (!event.end_date) return true;
          return new Date(event.end_date) >= now;
        });
        upcomingEvents.sort(
          (a, b) => new Date(a.start_date || a.created_at) - new Date(b.start_date || b.created_at)
        );
        setEvents(upcomingEvents);
      }
    } catch {
      setError('Failed to load events from database');
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedEvent = async () => {
    try {
      const result = await EventService.getFeaturedEvent();
      if (result.event) setFeaturedEvent(result.event);
    } catch {
      // optional
    }
  };

  if (!authLoading && (!isAuthenticated || user?.role !== 'participant' || !isProfileComplete(user))) {
    return null;
  }

  return (
    <EventShowcase
      events={events}
      featuredEvent={featuredEvent}
      loading={authLoading || loading}
      error={error}
      onRetry={loadEvents}
    />
  );
};

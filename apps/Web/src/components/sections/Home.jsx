import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventShowcase } from '../EventShowcase';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';

export const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin', { replace: true });
    if (user?.role === 'organizer') navigate('/organizer', { replace: true });
    if (user?.role === 'participant') navigate('/participants', { replace: true });
  }, [user, navigate]);

  const loadEvents = useCallback(async () => {
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
  }, []);

  const loadFeaturedEvent = useCallback(async () => {
    try {
      const result = await EventService.getFeaturedEvent();
      if (result.event) setFeaturedEvent(result.event);
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadFeaturedEvent();
  }, [loadEvents, loadFeaturedEvent]);

  if (user?.role === 'admin' || user?.role === 'organizer' || user?.role === 'participant') {
    return null;
  }

  return (
    <EventShowcase
      events={events}
      featuredEvent={featuredEvent}
      loading={loading}
      error={error}
      onRetry={loadEvents}
    />
  );
};

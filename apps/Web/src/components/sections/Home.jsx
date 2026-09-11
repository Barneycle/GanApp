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

  const loadShowcase = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await EventService.getShowcaseEvents(6);
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
        setFeaturedEvent(result.featured || null);
      }
    } catch {
      setError('Failed to load events from database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShowcase();
  }, [loadShowcase]);

  if (user?.role === 'admin' || user?.role === 'organizer' || user?.role === 'participant') {
    return null;
  }

  return (
    <EventShowcase
      events={events}
      featuredEvent={featuredEvent}
      loading={loading}
      error={error}
      onRetry={loadShowcase}
      upcomingLimit={3}
      seeAllLabel="See all events"
    />
  );
};

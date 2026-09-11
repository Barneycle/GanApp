import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventShowcase } from '../EventShowcase';
import { EventService } from '../../services/eventService';
import { AlbumService } from '../../services/albumService';
import { usePageVisibility } from '../../hooks/usePageVisibility';
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
  const [events, setEvents] = useState([]);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isVisible = usePageVisibility();
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'organizer') {
      navigate('/');
      return;
    }
    if (!isProfileComplete(user)) {
      navigate('/setup-profile');
      return;
    }
    if (!hasLoadedRef.current && !loadingRef.current) {
      hasLoadedRef.current = true;
      loadEvents();
      loadFeaturedEvent();
      loadAlbums();
    }
  }, [user, isAuthenticated, authLoading, navigate]);

  const loadEvents = async () => {
    if (!isVisible || loadingRef.current) return;
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Loading timeout after 10 seconds')), 10000)
      );
      const result = await Promise.race([EventService.getPublishedEvents(), timeoutPromise]);
      if (!isVisible) return;
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
      if (isVisible) setError('Failed to load events from database');
    } finally {
      loadingRef.current = false;
      if (isVisible) setLoading(false);
    }
  };

  const loadFeaturedEvent = async () => {
    if (!isVisible) return;
    try {
      const result = await EventService.getFeaturedEvent();
      if (isVisible) setFeaturedEvent(result.event || null);
    } catch {
      // optional
    }
  };

  const loadAlbums = async () => {
    try {
      const result = await AlbumService.getAlbumHighlights(3);
      if (isVisible) setAlbums(result.events || []);
    } catch {
      if (isVisible) setAlbums([]);
    }
  };

  if (!authLoading && (!isAuthenticated || user?.role !== 'organizer' || !isProfileComplete(user))) {
    return null;
  }

  return (
    <EventShowcase
      events={events}
      featuredEvent={featuredEvent}
      loading={authLoading || loading}
      error={error}
      onRetry={loadEvents}
      emptyActionLabel="Create one"
      onEmptyAction={() => navigate('/create-event')}
      upcomingLimit={3}
      seeAllLabel="See all events"
      showAlbums
      albums={albums}
    />
  );
};

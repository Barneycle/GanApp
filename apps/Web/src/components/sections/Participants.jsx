import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventShowcase } from '../EventShowcase';
import { EventService } from '../../services/eventService';
import { AlbumService } from '../../services/albumService';
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
  const [albums, setAlbums] = useState([]);
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
    loadShowcase();
  }, [user, isAuthenticated, authLoading, navigate]);

  const loadShowcase = async () => {
    try {
      setLoading(true);
      setError(null);
      const [showcase, albumResult] = await Promise.all([
        EventService.getShowcaseEvents(12),
        AlbumService.getAlbumHighlights(3),
      ]);
      if (showcase.error) {
        setError(showcase.error);
      } else {
        setEvents(showcase.events || []);
        setFeaturedEvent(showcase.featured || null);
      }
      setAlbums(albumResult.events || []);
    } catch {
      setError('Failed to load events from database');
    } finally {
      setLoading(false);
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
      onRetry={loadShowcase}
      upcomingLimit={5}
      seeAllLabel="See all events"
      showAlbums
      albums={albums}
    />
  );
};

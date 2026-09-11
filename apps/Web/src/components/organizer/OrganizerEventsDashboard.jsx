import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Calendar,
  ClipboardList,
  MapPin,
  Pencil,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { EventService } from '../../services/eventService';
import { PageSkeleton } from '../loading/Skeleton';
import { ErrorState } from '../ErrorState';

const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=900&fit=crop';

const formatDate = (dateString) => {
  if (!dateString) return 'Date TBD';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isPastEvent = (event) => {
  if (!event?.end_date) return false;
  const end = new Date(`${event.end_date}T${event.end_time || '23:59:59'}`);
  return end < new Date();
};

const statusMeta = (event) => {
  if (event.status === 'draft') return { label: 'Draft', className: 'bg-amber-50 text-amber-800' };
  if (event.status === 'cancelled') return { label: 'Cancelled', className: 'bg-red-50 text-red-700' };
  if (isPastEvent(event)) return { label: 'Ended', className: 'bg-slate-100 text-slate-600' };
  if (event.status === 'published') return { label: 'Published', className: 'bg-emerald-50 text-emerald-800' };
  return { label: event.status || 'Event', className: 'bg-slate-100 text-slate-600' };
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'past', label: 'Past' },
];

export function OrganizerEventsDashboard({ user }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await EventService.getEventsByCreator(user.id);
      if (result.error) {
        setError(result.error);
        setEvents([]);
        return;
      }
      setEvents(result.events || []);
    } catch {
      setError('Failed to load your events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadEvents();
  }, [user?.id]);

  const visibleEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (filter === 'published' && (event.status !== 'published' || isPastEvent(event))) return false;
      if (filter === 'draft' && event.status !== 'draft') return false;
      if (filter === 'past' && !isPastEvent(event) && event.status !== 'cancelled') return false;
      if (!needle) return true;
      return [event.title, event.venue, event.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [events, filter, query]);

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadEvents} />;
  }

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Organizer</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              My events
            </h1>
            <p className="mt-1 text-[15px] text-slate-600">
              Only events you created. Open a card to edit, view the roster, or manage certificates and evaluations.
            </p>
          </div>
          <Link
            to="/create-event"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            New event
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`h-9 rounded-full px-3 text-sm font-medium ${
                  filter === item.id
                    ? 'bg-blue-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your events"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none"
            />
          </label>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              {events.length === 0 ? 'You have not created any events yet' : 'No events match this filter'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {events.length === 0
                ? 'Create an event to manage registrations, certificates, and evaluations from here.'
                : 'Try another filter or search term.'}
            </p>
            {events.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate('/create-event')}
                className="mt-5 inline-flex h-11 items-center rounded-md bg-blue-900 px-4 text-sm font-medium text-white hover:bg-blue-800"
              >
                Create event
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleEvents.map((event) => {
              const status = statusMeta(event);
              const actions = [
                { to: `/edit-event/${event.id}`, label: 'Edit', icon: Pencil },
                { to: `/events/${event.id}/participants`, label: 'Participants', icon: Users },
                { to: `/event-statistics/${event.id}`, label: 'Statistics', icon: BarChart3 },
                { to: `/standalone-certificate-generator?eventId=${event.id}`, label: 'Certificates', icon: Award },
                { to: '/survey-management', label: 'Survey Management', icon: ClipboardList },
              ];

              return (
                <article
                  key={event.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="relative h-40 bg-slate-100">
                    <img
                      src={event.banner_url || FALLBACK}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(imgEvent) => {
                        if (imgEvent.currentTarget.src !== FALLBACK) imgEvent.currentTarget.src = FALLBACK;
                      }}
                    />
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                      {event.title || 'Untitled event'}
                    </h2>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        {formatDate(event.start_date)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        {event.venue || 'Venue TBD'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" />
                        {event.current_participants ?? 0}
                        {event.max_participants ? ` / ${event.max_participants}` : ''} registered
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <Link
                            key={action.label}
                            to={action.to}
                            className="inline-flex h-9 flex-1 min-w-[46%] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:border-blue-200 hover:bg-slate-50 hover:text-blue-900"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {action.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

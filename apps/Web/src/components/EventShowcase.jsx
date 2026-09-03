import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EventModal from './sections/EventModal';
import { PageSkeleton } from './loading/Skeleton';
import { ErrorState } from './ErrorState';

const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=900&fit=crop';
const ease = [0.16, 1, 0.3, 1];

const parseGuestSpeakers = (speakers) => {
  if (!speakers) return [];
  if (Array.isArray(speakers) && speakers[0] && typeof speakers[0] === 'object') return speakers;
  if (Array.isArray(speakers) && typeof speakers[0] === 'string') return speakers.map((name) => ({ name }));
  if (typeof speakers === 'string') {
    try {
      const parsed = JSON.parse(speakers);
      if (Array.isArray(parsed)) return parsed.map((item) => (typeof item === 'string' ? { name: item } : item));
    } catch {
      return speakers.split(',').map((name) => ({ name: name.trim() }));
    }
  }
  return [];
};

const withSpeakers = (event) =>
  event ? { ...event, guest_speakers: parseGuestSpeakers(event.guest_speakers) } : null;

const monthShort = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
};

const dayNum = (dateString) => {
  if (!dateString) return '';
  return String(new Date(dateString).getDate());
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const handleImgError = (e) => {
  if (e.target.src !== FALLBACK) e.target.src = FALLBACK;
};

export const EventShowcase = ({
  events = [],
  featuredEvent = null,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No events yet',
  emptyActionLabel,
  onEmptyAction,
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const displayFeaturedEvent = withSpeakers(featuredEvent) || withSpeakers(events[0]);
  const restEvents = events.filter((event) => event.id !== displayFeaturedEvent?.id);

  const openEvent = (event) => {
    setSelectedEvent(withSpeakers(event));
    setIsModalOpen(true);
  };

  if (loading) {
    return <PageSkeleton variant="showcase" />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        context="loadEvents"
        onRetry={onRetry}
        variant="embedded"
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-8 lg:px-8">
      {displayFeaturedEvent ? (
        <motion.button
          type="button"
          onClick={() => openEvent(displayFeaturedEvent)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 text-left"
        >
          <div className="relative h-[58vh] max-h-[560px] w-full overflow-hidden bg-slate-200">
            <img
              src={displayFeaturedEvent.banner_url || FALLBACK}
              alt=""
              onError={handleImgError}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute left-5 top-5 sm:left-8 sm:top-8">
              <div className="flex w-14 flex-col items-center rounded-xl border border-white/20 bg-white/90 py-2 text-slate-900 backdrop-blur-md">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-blue-600">
                  {monthShort(displayFeaturedEvent.start_date) || '—'}
                </span>
                <span className="text-[22px] font-semibold leading-none tabular-nums">
                  {dayNum(displayFeaturedEvent.start_date) || '–'}
                </span>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">Now featuring</p>
              <h1 className="max-w-3xl text-[32px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[44px]">
                {displayFeaturedEvent.title}
              </h1>
              <p className="mt-3 text-[14px] text-white/80">
                {[
                  formatDate(displayFeaturedEvent.start_date),
                  formatTime(displayFeaturedEvent.start_time),
                  displayFeaturedEvent.venue,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </p>
            </div>
          </div>
        </motion.button>
      ) : (
        <div className="flex h-[50vh] max-h-[420px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
          <p className="text-[28px] font-semibold tracking-tight text-slate-900">{emptyTitle}</p>
          {emptyActionLabel && onEmptyAction && (
            <button
              type="button"
              onClick={onEmptyAction}
              className="mt-3 text-[15px] text-blue-600 hover:text-blue-800"
            >
              {emptyActionLabel}
            </button>
          )}
        </div>
      )}

      <div className="mt-12 flex items-end justify-between border-t border-slate-200 pt-8">
        <h2 className="text-[13px] font-medium text-slate-400">Upcoming</h2>
        {restEvents.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="text-[13px] text-slate-400 transition-colors hover:text-blue-700"
          >
            All events
          </button>
        )}
      </div>

      {restEvents.length > 0 ? (
        <div className="organizer-hide-scroll mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2">
          {restEvents.map((event, index) => (
            <motion.button
              key={event.id || index}
              type="button"
              onClick={() => openEvent(event)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * index, duration: 0.45, ease }}
              className="w-[240px] shrink-0 snap-start text-left sm:w-[260px]"
            >
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <img
                  src={event.banner_url || FALLBACK}
                  alt=""
                  onError={handleImgError}
                  className="h-40 w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03]"
                />
              </div>
              <p className="mt-3 line-clamp-2 text-[15px] font-medium leading-snug tracking-tight text-slate-900">
                {event.title}
              </p>
              <p className="mt-1 text-[13px] text-slate-400">
                {[formatDate(event.start_date), formatTime(event.start_time)].filter(Boolean).join(' · ')}
              </p>
            </motion.button>
          ))}
        </div>
      ) : displayFeaturedEvent ? (
        <p className="mt-4 text-[14px] text-slate-400">Nothing else on the calendar.</p>
      ) : null}

      {(selectedEvent || displayFeaturedEvent) && (
        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          event={selectedEvent || displayFeaturedEvent}
        />
      )}
    </div>
  );
};

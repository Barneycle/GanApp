import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, Images, MapPin } from 'lucide-react';
import EventModal from './sections/EventModal';
import { PageSkeleton } from './loading/Skeleton';
import { ErrorState } from './ErrorState';
import { reveal } from './motion/tokens';
import { eventHasEnded } from '../services/eventService';

const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=900&fit=crop';

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

const DateBadge = ({ date }) => (
  <div className="flex w-14 flex-col items-center rounded-xl bg-blue-900 py-2 text-white">
    <span className="text-[10px] font-semibold tracking-[0.16em] text-blue-200">
      {monthShort(date) || '—'}
    </span>
    <span className="text-[22px] font-semibold leading-none tabular-nums">
      {dayNum(date) || '–'}
    </span>
  </div>
);

const MetaRow = ({ icon: Icon, children }) => {
  if (!children) return null;
  return (
    <p className="flex items-start gap-2 text-[13px] leading-snug text-slate-500">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-800" aria-hidden />
      <span className="line-clamp-1">{children}</span>
    </p>
  );
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
  upcomingLimit = 5,
  seeAllLabel = 'See all events',
  showAlbums = false,
  albums = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const stillOpen = events.filter((event) => !eventHasEnded(event));
  const liveFeatured = featuredEvent && !eventHasEnded(featuredEvent)
    ? featuredEvent
    : stillOpen.find((event) => event.is_featured) || stillOpen[0] || null;
  const displayFeaturedEvent = withSpeakers(liveFeatured);
  const upcoming = stillOpen
    .filter((event) => event.id !== displayFeaturedEvent?.id)
    .slice(0, upcomingLimit);

  const hasAnyEvents = Boolean(displayFeaturedEvent || upcoming.length);

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
    <div className="mx-auto max-w-[1100px] px-5 pb-24 pt-10 lg:px-8">
      <motion.div className="mb-8 flex items-end justify-between gap-4" {...reveal(0)}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-800">This week</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[32px]">
            What&apos;s happening
          </h1>
        </div>
        <Link
          to="/events"
          className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-medium text-blue-900 hover:text-blue-700"
        >
          {seeAllLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </motion.div>

      {!hasAnyEvents && albums.length === 0 ? (
        <motion.div
          {...reveal(1)}
          className="flex h-[38vh] max-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white"
        >
          <p className="text-[28px] font-semibold tracking-tight text-slate-900">{emptyTitle}</p>
          <p className="mt-2 max-w-md text-center text-[15px] text-slate-500">
            New events will show up here as soon as they are published.
          </p>
          {emptyActionLabel && onEmptyAction ? (
            <button
              type="button"
              onClick={onEmptyAction}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-900 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-blue-800"
            >
              {emptyActionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <Link
              to="/events"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-900 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-blue-800"
            >
              Browse events
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </motion.div>
      ) : null}

      {displayFeaturedEvent ? (
        <motion.button
          type="button"
          onClick={() => openEvent(displayFeaturedEvent)}
          {...reveal(1)}
          className="group w-full overflow-hidden rounded-2xl bg-white text-left ring-1 ring-slate-900/10 transition duration-300 hover:-translate-y-0.5"
        >
          <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden bg-slate-800">
            <img
              src={displayFeaturedEvent.banner_url || FALLBACK}
              alt=""
              onError={handleImgError}
              fetchPriority="high"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute left-5 top-5 sm:left-6 sm:top-6">
              <DateBadge date={displayFeaturedEvent.start_date} />
            </div>
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-800">
              {displayFeaturedEvent.is_featured ? 'Featured' : 'Now featuring'}
            </p>
            <h2 className="mt-2 max-w-3xl text-[28px] font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-[36px]">
              {displayFeaturedEvent.title}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-slate-500">
              {formatDate(displayFeaturedEvent.start_date) ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-800" aria-hidden />
                  {formatDate(displayFeaturedEvent.start_date)}
                </span>
              ) : null}
              {formatTime(displayFeaturedEvent.start_time) ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-800" aria-hidden />
                  {formatTime(displayFeaturedEvent.start_time)}
                </span>
              ) : null}
              {displayFeaturedEvent.venue ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-blue-800" aria-hidden />
                  {displayFeaturedEvent.venue}
                </span>
              ) : null}
            </div>
            <span className="mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-blue-900">
              View event
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </span>
          </div>
        </motion.button>
      ) : null}

      {upcoming.length > 0 ? (
        <motion.section className={displayFeaturedEvent ? 'mt-12' : 'mt-2'} {...reveal(2)}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-800">Coming up</p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-slate-900">Upcoming events</h2>
            </div>
            {upcoming.length > 2 ? (
              <p className="text-[13px] text-slate-400">Swipe to browse</p>
            ) : null}
          </div>

          <div className="relative">
            <div className="organizer-hide-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 touch-pan-x">
              {upcoming.map((event, index) => (
                <button
                  key={event.id || index}
                  type="button"
                  onClick={() => openEvent(event)}
                  className="group w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left ring-1 ring-slate-900/10 transition duration-300 hover:-translate-y-0.5 sm:w-[280px]"
                >
                  <div className="relative h-40 overflow-hidden bg-slate-100">
                    <img
                      src={event.banner_url || FALLBACK}
                      alt=""
                      onError={handleImgError}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                      draggable={false}
                    />
                    <div className="absolute left-3 top-3">
                      <DateBadge date={event.start_date} />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-800">Upcoming</p>
                    <h3 className="mt-1 line-clamp-2 min-h-[44px] text-[16px] font-semibold leading-snug tracking-tight text-slate-900">
                      {event.title}
                    </h3>
                    <div className="mt-3 space-y-1.5">
                      <MetaRow icon={Calendar}>{formatDate(event.start_date)}</MetaRow>
                      <MetaRow icon={MapPin}>{event.venue}</MetaRow>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {upcoming.length > 2 ? (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f8fafc] to-transparent" />
            ) : null}
          </div>
        </motion.section>
      ) : null}

      {showAlbums ? (
        <div className="mt-16">
          <motion.div className="flex items-end justify-between gap-4" {...reveal(0)}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-800">Gallery</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-slate-900">Event albums</h2>
            </div>
            <Link
              to="/albums"
              className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-medium text-blue-900 hover:text-blue-700"
            >
              See all albums
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </motion.div>

          {albums.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album, index) => {
                const photos = album.photos || [];
                const cover = photos[0]?.photo_url || FALLBACK;
                const extras = photos.slice(1, 3);
                const count = album.photo_count || photos.length || 0;
                return (
                  <motion.div key={album.id || index} {...reveal(index + 1)}>
                    <Link
                      to={`/albums/${album.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/10 transition duration-300 hover:-translate-y-0.5"
                    >
                      <div className={`relative grid h-48 overflow-hidden bg-slate-100 ${extras.length ? 'grid-cols-3 gap-0.5' : ''}`}>
                        <img
                          src={cover}
                          alt=""
                          onError={handleImgError}
                          loading="lazy"
                          decoding="async"
                          className={`${extras.length ? 'col-span-2 h-full w-full' : 'h-full w-full'} object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]`}
                        />
                        {extras.length ? (
                          <div className="grid grid-rows-2 gap-0.5">
                            {extras.map((photo) => (
                              <img
                                key={photo.id}
                                src={photo.photo_url}
                                alt=""
                                onError={handleImgError}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            ))}
                            {extras.length === 1 ? <div className="bg-slate-200" /> : null}
                          </div>
                        ) : null}
                        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-blue-900/90 px-2.5 py-1 text-[11px] font-medium text-white">
                          <Images className="h-3 w-3" aria-hidden />
                          {count} {count === 1 ? 'photo' : 'photos'}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-slate-900">
                          {album.title}
                        </h3>
                        <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-900">
                          Open album
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div {...reveal(1)}>
              <Link
                to="/albums"
                className="mt-5 flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center hover:border-blue-200"
              >
                <Images className="mb-3 h-8 w-8 text-blue-800" aria-hidden />
                <p className="text-[15px] font-medium text-slate-800">No albums yet</p>
                <p className="mt-1 text-[13px] text-slate-400">Event photos will appear here when they are uploaded.</p>
              </Link>
            </motion.div>
          )}
        </div>
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

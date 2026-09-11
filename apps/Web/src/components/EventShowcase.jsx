import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Clock, Images, MapPin } from 'lucide-react';
import EventModal from './sections/EventModal';
import { PageSkeleton } from './loading/Skeleton';
import { ErrorState } from './ErrorState';
import { cardEnter } from './motion/tokens';
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

const DateBadge = ({ date, tone = 'light' }) => (
  <div
    className={
      tone === 'dark'
        ? 'flex w-14 flex-col items-center rounded-xl bg-blue-900 py-2 text-white shadow-lg'
        : 'flex w-14 flex-col items-center rounded-xl border border-white/30 bg-white/95 py-2 text-slate-900 shadow-lg backdrop-blur-md'
    }
  >
    <span className={`text-[10px] font-semibold tracking-[0.16em] ${tone === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
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
  const scrollerRef = useRef(null);

  const stillOpen = events.filter((event) => !eventHasEnded(event));
  const recent = events.filter((event) => eventHasEnded(event));
  const liveFeatured = featuredEvent && !eventHasEnded(featuredEvent)
    ? featuredEvent
    : stillOpen.find((event) => event.is_featured) || stillOpen[0] || null;
  const displayFeaturedEvent = withSpeakers(liveFeatured);
  const upcomingForCarousel = stillOpen.filter((event) => event.id !== displayFeaturedEvent?.id);
  const carouselEvents = [...upcomingForCarousel, ...recent].slice(0, upcomingLimit);
  const calendarHeading = upcomingForCarousel.length > 0 ? 'Upcoming events' : 'Recent events';

  const scrollCarousel = (direction) => {
    scrollerRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' });
  };

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
          {...cardEnter(0)}
          className="group relative block w-full overflow-hidden rounded-3xl text-left shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10"
        >
          <div className="relative h-[56vh] max-h-[560px] w-full overflow-hidden bg-slate-800">
            <img
              src={displayFeaturedEvent.banner_url || FALLBACK}
              alt=""
              onError={handleImgError}
              fetchPriority="high"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-slate-900/35 to-slate-900/10" />
            <div className="absolute left-5 top-5 flex items-center gap-3 sm:left-8 sm:top-8">
              <DateBadge date={displayFeaturedEvent.start_date} />
              {displayFeaturedEvent.is_featured ? (
                <span className="rounded-full bg-blue-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                  Featured
                </span>
              ) : (
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/90 backdrop-blur-md">
                  Now featuring
                </span>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <h1 className="max-w-3xl text-[32px] font-semibold leading-[1.08] tracking-tight text-white sm:text-[44px]">
                {displayFeaturedEvent.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {formatDate(displayFeaturedEvent.start_date) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[13px] text-white backdrop-blur-md">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    {formatDate(displayFeaturedEvent.start_date)}
                  </span>
                ) : null}
                {formatTime(displayFeaturedEvent.start_time) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[13px] text-white backdrop-blur-md">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatTime(displayFeaturedEvent.start_time)}
                  </span>
                ) : null}
                {displayFeaturedEvent.venue ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[13px] text-white backdrop-blur-md">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {displayFeaturedEvent.venue}
                  </span>
                ) : null}
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-white">
                View event
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </span>
            </div>
          </div>
        </motion.button>
      ) : carouselEvents.length === 0 && albums.length === 0 ? (
        <div className="flex h-[42vh] max-h-[380px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50">
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
        </div>
      ) : null}

      {carouselEvents.length > 0 ? (
        <>
          <div className={`${displayFeaturedEvent ? 'mt-14' : 'mt-2'} flex items-end justify-between gap-4`}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-800">Calendar</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-slate-900">{calendarHeading}</h2>
            </div>
            <div className="flex items-center gap-2">
              {carouselEvents.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollCarousel(-1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-900"
                    aria-label="Previous events"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCarousel(1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-900"
                    aria-label="Next events"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
              <Link
                to="/events"
                className="ml-1 inline-flex shrink-0 items-center gap-1.5 text-[14px] font-medium text-blue-900 transition-colors hover:text-blue-700"
              >
                {seeAllLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="organizer-hide-scroll mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
          >
              {carouselEvents.map((event, index) => (
                <motion.button
                  key={event.id || index}
                  type="button"
                  onClick={() => openEvent(event)}
                  {...cardEnter(index + 1)}
                  className="group flex w-[272px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_40px_-24px_rgba(30,58,138,0.45)]"
                >
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                      src={event.banner_url || FALLBACK}
                      alt=""
                      onError={handleImgError}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent" />
                    <div className="absolute left-3 top-3">
                      <DateBadge date={event.start_date} tone="dark" />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-slate-900">
                      {event.title}
                    </h3>
                    <div className="mt-3 space-y-1.5">
                      <MetaRow icon={Calendar}>{formatDate(event.start_date)}</MetaRow>
                      <MetaRow icon={Clock}>
                        {[formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(' – ')}
                      </MetaRow>
                      <MetaRow icon={MapPin}>{event.venue}</MetaRow>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-900">
                      View details
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </span>
                  </div>
                </motion.button>
              ))}
          </div>
        </>
      ) : null}

      {showAlbums ? (
        <>
          <div className="mt-14 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-800">Gallery</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-slate-900">Event albums</h2>
              <p className="mt-1 text-[14px] text-slate-500">Photos from recent events</p>
            </div>
            <Link
              to="/albums"
              className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-medium text-blue-900 transition-colors hover:text-blue-700"
            >
              See all albums
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {albums.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album, index) => {
                const photos = album.photos || [];
                const cover = photos[0]?.photo_url || FALLBACK;
                const extras = photos.slice(1, 3);
                const count = album.photo_count || photos.length || 0;
                return (
                  <Link
                    key={album.id || index}
                    to={`/albums/${album.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_40px_-24px_rgba(30,58,138,0.45)]"
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
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-blue-900/90 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
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
                );
              })}
            </div>
          ) : (
            <Link
              to="/albums"
              className="mt-6 flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50 px-6 py-10 text-center hover:border-blue-200"
            >
              <Images className="mb-3 h-8 w-8 text-blue-800" aria-hidden />
              <p className="text-[15px] font-medium text-slate-800">No albums yet</p>
              <p className="mt-1 text-[13px] text-slate-400">Event photos will appear here when they are uploaded.</p>
            </Link>
          )}
        </>
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

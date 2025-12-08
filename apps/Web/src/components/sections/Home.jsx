import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import EventModal from './EventModal';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';

export const Home = () => {
  const [events, setEvents] = useState([]);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const [slideOffset, setSlideOffset] = useState(0);
  const [currentSlideOffset, setCurrentSlideOffset] = useState(0);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);
  const { user, isAuthenticated, signOut, clearAuthData } = useAuth();
  const hasLoadedRef = useRef(false);

  const shouldCollapseRationale = (rationale) => {
    if (!rationale) return false;
    const textContent = rationale.replace(/<[^>]*>/g, '');
    const hasMultipleParagraphs = (rationale.match(/<p>/g) || []).length > 1;
    return textContent.length > 300 || hasMultipleParagraphs;
  };


  // Helper function to parse guest speakers data
  const parseGuestSpeakers = (speakers) => {
    if (!speakers) return [];
    
    // If it's already an array of objects, return as is
    if (Array.isArray(speakers) && speakers.length > 0 && typeof speakers[0] === 'object') {
      return speakers;
    }
    
    // If it's an array of strings, convert to objects
    if (Array.isArray(speakers) && speakers.length > 0 && typeof speakers[0] === 'string') {
      return speakers.map(name => ({ name }));
    }
    
    // If it's a string, try to parse it
    if (typeof speakers === 'string') {
      try {
        const parsed = JSON.parse(speakers);
        if (Array.isArray(parsed)) {
          return parsed.map(item => typeof item === 'string' ? { name: item } : item);
        }
      } catch (e) {
        // If JSON parsing fails, treat as comma-separated string
        return speakers.split(',').map(name => ({ name: name.trim() }));
      }
    }
    
    return [];
  };

  // Use real events from database for carousel, no placeholders
  const carouselEvents = events.map(event => ({
    ...event,
    guest_speakers: parseGuestSpeakers(event.guest_speakers)
  }));

  const decodeHtml = (value) => {
    if (!value) return '';
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  // Start at the beginning (index 0)
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isCardFolded, setIsCardFolded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Swipe functionality state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    // Only load once on mount, prevent reloading when switching tabs/windows
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadEvents();
      loadFeaturedEvent();
    }
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout after 10 seconds')), 10000)
      );
      
      // Fetch published events for the home page
      const eventsPromise = EventService.getPublishedEvents();
      
      const result = await Promise.race([eventsPromise, timeoutPromise]);
      
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      setError('Failed to load events from database');
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedEvent = async () => {
    try {
      const result = await EventService.getFeaturedEvent();
      if (result.event) {
        setFeaturedEvent(result.event);
      }
    } catch (err) {
    }
  };

  // Use the featured event, or fallback to first event (no placeholder)
  const displayFeaturedEvent = featuredEvent ? {
    ...featuredEvent,
    guest_speakers: parseGuestSpeakers(featuredEvent.guest_speakers)
  } : events[0] ? {
    ...events[0],
    guest_speakers: parseGuestSpeakers(events[0].guest_speakers)
  } : null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to handle image loading with fallback
  const handleImageError = (e, fallbackSrc) => {
    e.target.src = fallbackSrc;
  };

  // Navigation functions for carousel - truly infinite
  const scrollLeft = () => {
    setCurrentEventIndex((prev) => {
      const newIndex = prev - 1;
      // If we go below 0, jump to the end of the first set
      if (newIndex < 0) {
        return carouselEvents.length - 1;
      }
      return newIndex;
    });
  };

  const scrollRight = () => {
    setCurrentEventIndex((prev) => {
      const newIndex = prev + 1;
      // If we go beyond the first set, reset to 0
      if (newIndex >= carouselEvents.length) {
        return 0;
      }
      return newIndex;
    });
  };

  // Swipe functionality
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const onTouchMove = (e) => {
    if (!touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;
    setDragOffset(diff);
    setTouchEnd(currentTouch);
  };

  const onTouchEnd = () => {
    if (!touchStart) return;
    
    const distance = touchStart - (touchEnd || touchStart);
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      scrollRight();
    }
    if (isRightSwipe) {
      scrollLeft();
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  const onMouseDown = (e) => {
    setTouchEnd(null);
    setTouchStart(e.clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const onMouseMove = (e) => {
    if (!touchStart || !isDragging) return;
    
    const diff = touchStart - e.clientX;
    setDragOffset(diff);
    setTouchEnd(e.clientX);
  };

  const onMouseUp = () => {
    if (!touchStart) return;
    
    const distance = touchStart - (touchEnd || touchStart);
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      scrollRight();
    }
    if (isRightSwipe) {
      scrollLeft();
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading events...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Events</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={loadEvents}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

    return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" key={`loading-${loading}`}>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-800 mb-4">
            Welcome to GanApp
          </h1>
          <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto">
            Manage your events and surveys with ease
          </p>
        </div>
        
        {/* Single Event Card - Only show when there's a featured event */}
        {displayFeaturedEvent && (
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden mb-12">
            
            {/* Banner Image */}
            <div className="w-full overflow-hidden h-48 sm:h-64 md:h-80 lg:h-96">
              <img
                src={displayFeaturedEvent.banner_url}
                alt={displayFeaturedEvent.title}
                className="w-full h-full object-cover"
                onError={(e) => handleImageError(e, displayFeaturedEvent.banner_url)}
              />
            </div>
            
            {/* Event Content */}
            <div className="p-8">
              {/* Event Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                  {displayFeaturedEvent.title}
                </h2>
              </div>

              {/* Event Rationale */}
              {displayFeaturedEvent.rationale && (
                <div className="mb-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-slate-800">Event Rationale</h4>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div 
                      className="text-slate-600 rich-text-content"
                      dangerouslySetInnerHTML={{ __html: decodeHtml(displayFeaturedEvent.rationale) }}
                      style={{
                        wordWrap: 'break-word',
                        maxHeight: isRationaleExpanded ? 'none' : '150px',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease'
                      }}
                    />
                    {shouldCollapseRationale(displayFeaturedEvent.rationale) && (
                      <button
                        onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
                        className="mt-3 w-full flex items-center justify-center text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors"
                      >
                        <span>{isRationaleExpanded ? 'Read Less' : 'Read More'}</span>
                        <svg 
                          className={`w-4 h-4 ml-2 transition-transform ${isRationaleExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <style>{`
                    .rich-text-content h1, .rich-text-content h2, .rich-text-content h3, 
                    .rich-text-content h4, .rich-text-content h5, .rich-text-content h6 {
                      font-weight: 700;
                      margin-top: 1em;
                      margin-bottom: 0.5em;
                    }
                    .rich-text-content h1 { font-size: 2em; }
                    .rich-text-content h2 { font-size: 1.5em; }
                    .rich-text-content h3 { font-size: 1.25em; }
                    .rich-text-content h4 { font-size: 1.1em; }
                    .rich-text-content h5 { font-size: 1em; }
                    .rich-text-content h6 { font-size: 0.9em; }
                    .rich-text-content p {
                      margin: 0.5em 0;
                    }
                    .rich-text-content ul, .rich-text-content ol {
                      padding-left: 1.5em;
                      margin: 0.5em 0;
                    }
                    .rich-text-content ul {
                      list-style-type: disc;
                    }
                    .rich-text-content ol {
                      list-style-type: decimal;
                    }
                    .rich-text-content li {
                      margin: 0.25em 0;
                    }
                    .rich-text-content strong {
                      font-weight: 700;
                    }
                    .rich-text-content em {
                      font-style: italic;
                    }
                    .rich-text-content u {
                      text-decoration: underline;
                    }
                    .rich-text-content s {
                      text-decoration: line-through;
                    }
                    .rich-text-content blockquote {
                      border-left: 4px solid rgb(203, 213, 225);
                      padding-left: 1em;
                      margin: 1em 0;
                      color: rgb(100, 116, 139);
                    }
                    .rich-text-content a {
                      color: rgb(37, 99, 235);
                      text-decoration: underline;
                    }
                    .rich-text-content code {
                      background: rgb(241, 245, 249);
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-family: monospace;
                    }
                    .rich-text-content pre {
                      background: rgb(241, 245, 249);
                      padding: 1em;
                      border-radius: 4px;
                      overflow-x: auto;
                    }
                    .rich-text-content img {
                      max-width: 100%;
                      height: auto;
                      margin: 16px 0;
                    }
                  `}</style>
                </div>
              )}

              {/* View Details Button */}
              <div className="text-center">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  <span>View Details</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Events Carousel Card - Only show when there are events */}
        {carouselEvents.length > 0 ? (
          <div className="mb-12">
          {/* Section Header with Title and Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">Upcoming Events</h3>
              <p className="text-slate-600 text-base">Discover and explore our upcoming events</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={scrollLeft}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all duration-200 backdrop-blur-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={scrollRight}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all duration-200 backdrop-blur-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          {/* Carousel Container */}
          <div 
            className="relative overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <motion.div
              className="flex gap-6"
              animate={{ 
                x: `-${currentEventIndex * (300 + 24)}px`
              }}
              transition={{ 
                type: "spring", 
                stiffness: 100, 
                damping: 20
              }}
              style={{ 
                width: `${carouselEvents.length * 300 + (carouselEvents.length - 1) * 24}px`
              }}
            >
              {carouselEvents.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="min-w-[300px] rounded-lg overflow-hidden cursor-pointer hover:scale-110 transition-transform duration-300 flex-shrink-0 bg-white shadow-sm hover:shadow-lg"
                >
                  <img
                    src={event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center'}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center')}
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800">{event.title}</h3>
                    <div
                      className="text-gray-600 text-sm mt-2 rich-text-content"
                      dangerouslySetInnerHTML={{
                        __html: decodeHtml(event.description || event.rationale || 'Experience something amazing')
                      }}
                    />
                    <div className="mt-3 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
          
            {/* See All Button */}
            <div className="flex justify-end mt-6">
              <Link
                to="/events"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                <span>See All</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Upcoming Events</h3>
                <p className="text-gray-600">
                  There are no upcoming events at the moment. Check back later for new events!
                </p>
              </div>
            </div>
          )
        )}
      </div>

        {/* Event Modal */}
        {displayFeaturedEvent && (
          <EventModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            event={displayFeaturedEvent} 
          />
        )}
    </section>
  );
};
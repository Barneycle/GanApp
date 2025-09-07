import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import EventModal from './EventModal';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';

export const Home = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const [slideOffset, setSlideOffset] = useState(0);
  const [currentSlideOffset, setCurrentSlideOffset] = useState(0);
  const { user, isAuthenticated, signOut, clearAuthData } = useAuth();

  // Sample events data for carousel
  // Sample events data for carousel
  const sampleEvents = [
    {
      id: "550e8400-e29b-41d4-a716-446655440031",
      title: "Tech Conference 2025",
      img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440032",
      title: "Music Festival",
      img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440033",
      title: "Startup Pitch Night",
      img: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440034",
      title: "AI Summit",
      img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440035",
      title: "Art & Design Expo",
      img: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440036",
      title: "Business Networking",
      img: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440037",
      title: "Sports Championship",
      img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440038",
      title: "Food & Wine Festival",
      img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440039",
      title: "Gaming Convention",
      img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440040",
      title: "Educational Workshop",
      img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440041",
      title: "Health & Wellness Expo",
      img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop&crop=center",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440042",
      title: "Environmental Summit",
      img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop&crop=center",
    },
  ];

  // Create a truly infinite carousel by repeating the events multiple times
  const infiniteEvents = [
    ...sampleEvents, // First set
    ...sampleEvents, // Second set
    ...sampleEvents, // Third set
    ...sampleEvents, // Fourth set
    ...sampleEvents, // Fifth set
  ];

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
    loadEvents();
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

  // Use the first event as the featured event, or fallback to default
  const featuredEvent = events[0] || {
    title: "Tech Conference 2025",
    start_date: "2024-06-15",
    end_date: "2024-06-15",
    start_time: "09:00:00",
    end_time: "17:00:00",
    venue: "Grand Convention Center, Cityville",
    sponsors: [
      { name: "TechCorp" },
      { name: "InnovateX" },
      { name: "Future Solutions" }
    ],
    guest_speakers: [
      { name: "Dr. Jane Smith" },
      { name: "Mr. John Doe" },
      { name: "Prof. Emily Johnson" }
    ],
    rationale: "The Tech Conference 2025 aims to foster collaboration and innovation among technology professionals by providing a platform for sharing knowledge, networking, and showcasing the latest advancements in the industry.",
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center"
  };

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
    setCurrentEventIndex((prev) => prev - 1);
  };

  const scrollRight = () => {
    setCurrentEventIndex((prev) => prev + 1);
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        
        {/* Single Event Card */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden mb-12">
          
          {/* Banner Image */}
          <div className="w-full overflow-hidden h-48 sm:h-64 md:h-80 lg:h-96">
            <img
              src={featuredEvent.banner_url}
              alt={featuredEvent.title}
              className="w-full h-full object-cover"
              onError={(e) => handleImageError(e, featuredEvent.banner_url)}
            />
          </div>
          
          {/* Event Content */}
          <div className="p-8">
            {/* Event Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                {featuredEvent.title}
              </h2>
            </div>

            {/* Event Rationale */}
            {featuredEvent.rationale && (
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-slate-800">Event Rationale</h4>
                </div>
                <p className="text-slate-600">{featuredEvent.rationale}</p>
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
        
        {/* Events Carousel Card */}
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
                x: `-${currentEventIndex * (300 + 24)}px`,
                ...(isDragging && { x: `-${currentEventIndex * (300 + 24) + dragOffset}px` })
              }}
              transition={{ 
                type: "spring", 
                stiffness: 100, 
                damping: 20,
                ...(isDragging && { duration: 0 })
              }}
              style={{ 
                width: `${infiniteEvents.length * 300 + (infiniteEvents.length - 1) * 24}px`,
                userSelect: isDragging ? 'none' : 'auto'
              }}
            >
                             {infiniteEvents.map((event, index) => (
                 <div
                   key={`${event.id}-${index}`}
                   className="min-w-[300px] rounded-lg overflow-hidden cursor-pointer flex-shrink-0 bg-white shadow-sm hover:shadow-lg transition-shadow duration-200"
                 >
                   <img
                     src={event.img}
                     alt={event.title}
                     className="w-full h-48 object-cover"
                   />
                   <div className="p-4">
                     <h3 className="font-semibold text-lg text-gray-800">{event.title}</h3>
                     <p className="text-gray-600 text-sm mt-2">Experience something amazing</p>
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
      </div>

        {/* Event Modal */}
        <EventModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          event={featuredEvent} 
        />
    </section>
  );
};
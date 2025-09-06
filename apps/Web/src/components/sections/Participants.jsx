import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EventModal from './EventModal';
import { EventService } from '../../services/eventService';

// Sample events data for carousel
const sampleEvents = [
  {
    id: 1,
    title: "Tech Conference 2025",
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 2,
    title: "Music Festival",
    img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 3,
    title: "Startup Pitch Night",
    img: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 4,
    title: "AI Summit",
    img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 5,
    title: "Art & Design Expo",
    img: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 6,
    title: "Business Networking",
    img: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 7,
    title: "Sports Championship",
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 8,
    title: "Food & Wine Festival",
    img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 9,
    title: "Gaming Convention",
    img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 10,
    title: "Educational Workshop",
    img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 11,
    title: "Health & Wellness Expo",
    img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop&crop=center",
  },
  {
    id: 12,
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

export const Participants = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(12);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      
      // Fetch published events for the participants page
      const eventsPromise = EventService.getPublishedEvents();
      
      const result = await Promise.race([eventsPromise, timeoutPromise]);
      
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
        // Set the first event as selected by default
        if (result.events && result.events.length > 0) {
          setSelectedEvent(result.events[0]);
        }
      }
    } catch (err) {
      setError('Failed to load events from database');
    } finally {
      setLoading(false);
    }
  };

  // Use the selected event or first event as the featured event, or fallback to default
  const featuredEvent = selectedEvent || events[0] || {
    title: "Tech Conference 2025",
    rationale: "The Tech Conference 2025 aims to foster collaboration and innovation among technology professionals by providing a platform for sharing knowledge, networking, and showcasing the latest advancements in the industry.",
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
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center"
  };

  // Navigation functions for carousel - truly infinite
  const scrollLeft = () => {
    setCurrentEventIndex((prev) => prev - 1);
  };

  const scrollRight = () => {
    setCurrentEventIndex((prev) => prev + 1);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ongoing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
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
            <p className="text-red-800 mb-6 text-lg">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
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
        
        {/* Single Event Card */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden mb-12">
          
          {/* Banner Image */}
          <div className="w-full overflow-hidden h-48 sm:h-64 md:h-80 lg:h-96">
            <img
              src={featuredEvent.banner_url}
              alt={featuredEvent.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Event Content */}
          <div className="p-8">
            {/* Event Title and Description */}
            <div className="text-center mb-8">
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
          <div className="relative overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ x: `-${currentEventIndex * (300 + 24)}px` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              style={{ 
                width: `${infiniteEvents.length * 300 + (infiniteEvents.length - 1) * 24}px` 
              }}
            >
              {infiniteEvents.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="min-w-[300px] rounded-lg overflow-hidden cursor-pointer hover:scale-110 transition-transform duration-300 flex-shrink-0 bg-white shadow-sm hover:shadow-lg"
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
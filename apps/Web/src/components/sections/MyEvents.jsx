import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users } from "lucide-react";
import EventModal from './EventModal';
import { GenerateQRModal } from './GenerateQR';
import { EventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';

export const MyEvents = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user?.role !== 'participant') {
      navigate('/');
      return;
    }

    loadRegisteredEvents();
  }, [user, isAuthenticated, navigate]);

  const loadRegisteredEvents = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await EventService.getUserRegistrations(user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Extract the events from the registrations
        const events = result.registrations?.map(registration => ({
          ...registration.events,
          registration_date: registration.registration_date,
          registration_id: registration.id
        })) || [];
        
        setRegisteredEvents(events);
      }
    } catch (err) {
      setError('Failed to load your registered events');
    } finally {
      setLoading(false);
    }
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

  const formatCheckInTime = (event) => {
    if (!event.check_in_before_minutes) return formatTime(event.start_time);
    
    const startTime = new Date(`${event.start_date}T${event.start_time}`);
    const checkInTime = new Date(startTime.getTime() - (event.check_in_before_minutes * 60000));
    
    return checkInTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCheckInEndTime = (event) => {
    if (!event.check_in_during_minutes) return formatTime(event.start_time);
    
    const startTime = new Date(`${event.start_date}T${event.start_time}`);
    const checkInEndTime = new Date(startTime.getTime() + (event.check_in_during_minutes * 60000));
    
    return checkInEndTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = new Date(`${event.start_date}T${event.start_time}`);
    const endDate = new Date(`${event.end_date}T${event.end_time}`);

    if (now < startDate) {
      return { status: 'upcoming', text: 'Upcoming', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (now >= startDate && now <= endDate) {
      return { status: 'ongoing', text: 'Ongoing', color: 'bg-green-100 text-green-800 border-green-200' };
    } else {
      return { status: 'completed', text: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const handleUnregister = async (eventId) => {
    if (!user?.id) return;

    try {
      const result = await EventService.unregisterFromEvent(eventId, user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Remove the event from the list
        setRegisteredEvents(prev => prev.filter(event => event.id !== eventId));
        
        // Show success message (you might want to add a success modal here)
      }
    } catch (err) {
      setError('Failed to unregister from event');
    }
  };

  if (!isAuthenticated || user?.role !== 'participant') {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading your registered events...</p>
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
              onClick={loadRegisteredEvents} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (registeredEvents.length === 0) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Registered Events</h3>
            <p className="text-slate-600 mb-6">You haven't registered for any events yet. Explore available events and join the ones that interest you!</p>
            <Link 
              to="/events"
              className="inline-block bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Use the selected event or first event as the featured event
  const featuredEvent = selectedEvent || registeredEvents[0];
  const eventStatus = getEventStatus(featuredEvent);

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">My Registered Events</h1>
          <p className="text-slate-600 text-lg">Events you've registered for</p>
        </div>

        {/* Registered Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registeredEvents.map((event) => {
            const eventStatus = getEventStatus(event);
            
            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden"
              >
                {/* Event Banner */}
                {event.banner_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={event.banner_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center" style={{display: 'none'}}>
                      <span className="text-white text-lg font-semibold">Event Banner</span>
                    </div>
                  </div>
                )}
                
                {/* Event Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex-1">{event.title}</h3>
                    <div className={`ml-2 px-3 py-1 rounded-full text-xs font-medium border ${eventStatus.color}`}>
                      {eventStatus.text}
                    </div>
                  </div>
                  
                  {event.rationale && (
                    <p className="text-slate-600 mb-4 line-clamp-3">{event.rationale}</p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {formatDate(event.start_date)}
                        {event.start_date !== event.end_date && (
                          <> - {formatDate(event.end_date)}</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                    </div>
                    {/* Check-in Window Info */}
                    {(event.check_in_before_minutes || event.check_in_during_minutes) && (
                      <div className="flex items-center text-sm text-blue-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2M9 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2" />
                        </svg>
                        <span>
                          Check-in: {formatCheckInTime(event)} - {formatCheckInEndTime(event)}
                        </span>
                      </div>
                    )}
                    {event.venue && (
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="line-clamp-1">{event.venue}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsModalOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setQrEvent(event);
                        setIsQRModalOpen(true);
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Generate QR Code
                    </button>
                    <button
                      onClick={() => handleUnregister(event.id)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Unregister
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Event Modal */}
      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        event={selectedEvent} 
      />
      
      {/* QR Code Modal */}
      <GenerateQRModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        event={qrEvent} 
      />
    </section>
  );
};

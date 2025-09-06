import React, { useEffect } from 'react';
import { X } from "lucide-react";

const EventModal = ({ isOpen, onClose, event }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const handleImageError = (e, fallbackUrl) => {
    e.target.src = fallbackUrl;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBA';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-end p-6">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors duration-200"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Event Banner */}
          <div className="w-full overflow-hidden h-48 sm:h-64 rounded-xl mb-6">
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => handleImageError(e, event.banner_url)}
            />
          </div>

          {/* Event Title and Description */}
          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
              {event.title}
            </h3>
            <p className="text-slate-600 text-lg max-w-3xl mx-auto">
              {event.description}
            </p>
          </div>

          {/* Event Rationale */}
          {event.rationale && (
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Event Rationale</h4>
              </div>
              <p className="text-slate-600">{event.rationale}</p>
            </div>
          )}

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="group relative overflow-hidden bg-slate-50 rounded-2xl hover:shadow-lg transition-all duration-300 border border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Date</h4>
                <p className="text-base text-slate-600 font-medium">{formatDate(event.start_date)}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-slate-50 rounded-2xl hover:shadow-lg transition-all duration-300 border border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Time</h4>
                <p className="text-base text-slate-600 font-medium">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-slate-50 rounded-2xl hover:shadow-lg transition-all duration-300 border border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Venue</h4>
                <p className="text-base text-slate-600 font-medium">{event.venue || 'TBA'}</p>
              </div>
            </div>
          </div>

          {/* Guest Speakers */}
          {event.guest_speakers && event.guest_speakers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Guest Speakers</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {event.guest_speakers.map((speaker, index) => (
                  <div key={index} className="flex flex-col items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group">
                    <div className="w-40 h-40 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 relative mb-3 group-hover:shadow-xl transition-shadow duration-300">
                      {event.speaker_photos_url ? (() => {
                        const photoUrls = event.speaker_photos_url.split(',').map(url => url.trim());
                        const speakerPhotoUrl = photoUrls[index];
                        return speakerPhotoUrl ? (
                          <img 
                            src={speakerPhotoUrl} 
                            alt={speaker.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null;
                      })() : null}
                      <div className={`w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg ${event.speaker_photos_url ? 'hidden' : 'block'}`}>
                        {speaker.name ? speaker.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-800 font-medium text-sm">{speaker.name}</p>
                      {speaker.title && (
                        <p className="text-slate-500 text-xs mt-1">{speaker.title}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Sponsors */}
          {event.sponsors && event.sponsors.length > 0 && (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Sponsors</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {event.sponsors.map((sponsor, index) => (
                  <div key={index} className="flex flex-col items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group">
                    <div className="w-40 h-40 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0 flex items-center justify-center relative mb-3 group-hover:shadow-xl transition-shadow duration-300">
                      {event.sponsor_logos_url ? (() => {
                        const logoUrls = event.sponsor_logos_url.split(',').map(url => url.trim());
                        const sponsorLogoUrl = logoUrls[index];
                        return sponsorLogoUrl ? (
                          <img 
                            src={sponsorLogoUrl} 
                            alt={typeof sponsor === 'string' ? sponsor : sponsor.name}
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null;
                      })() : null}
                      <div className={`w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-lg ${event.sponsor_logos_url ? 'hidden' : 'block'}`}>
                        {typeof sponsor === 'string' ? sponsor.charAt(0).toUpperCase() : (sponsor.name ? sponsor.name.charAt(0).toUpperCase() : 'S')}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-800 font-medium text-sm">
                        {typeof sponsor === 'string' ? sponsor : sponsor.name}
                      </p>
                      {sponsor.website && (
                        <a 
                          href={sponsor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 text-xs hover:underline mt-1 block"
                        >
                          Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;

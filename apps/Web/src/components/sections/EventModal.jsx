import React, { useEffect, useState } from 'react';
import { X } from "lucide-react";
import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { useAuth } from '../../contexts/AuthContext';

const EventModal = ({ isOpen, onClose, event }) => {
  const { user } = useAuth();
  const [speakers, setSpeakers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(false);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);

  const shouldCollapseRationale = (rationale) => {
    if (!rationale) return false;
    const textContent = rationale.replace(/<[^>]*>/g, '');
    const hasMultipleParagraphs = (rationale.match(/<p>/g) || []).length > 1;
    return textContent.length > 300 || hasMultipleParagraphs;
  };

  // Fetch speakers and sponsors when modal opens
  useEffect(() => {
    if (isOpen && event?.id) {
      // Fetch speakers
      setLoadingSpeakers(true);
      SpeakerService.getEventSpeakers(event.id).then(result => {
        if (result.speakers) {
          setSpeakers(result.speakers);
        } else {
          setSpeakers([]);
        }
        setLoadingSpeakers(false);
      });

      // Fetch sponsors
      setLoadingSponsors(true);
      SponsorService.getEventSponsors(event.id).then(result => {
        if (result.sponsors) {
          setSponsors(result.sponsors);
        } else {
          setSponsors([]);
        }
        setLoadingSponsors(false);
      });
    }
  }, [isOpen, event?.id]);

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
              <div className="bg-blue-50 p-4 rounded-xl">
                <div 
                  className="text-slate-600 rich-text-content"
                  dangerouslySetInnerHTML={{ __html: event.rationale }}
                  style={{
                    wordWrap: 'break-word',
                    maxHeight: isRationaleExpanded ? 'none' : '150px',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease'
                  }}
                />
                {shouldCollapseRationale(event.rationale) && (
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

          {/* Event Materials - Show for authenticated users */}
          {user && (event.event_kits_url || event.event_programmes_url || event.materials_url || event.programme_url) && (
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-green-800 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Event Materials</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Kits */}
                {(event.event_kits_url || event.materials_url) && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-800">Event Kits</h5>
                        <p className="text-sm text-slate-600">Materials and resources for this event</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(event.event_kits_url || event.materials_url).split(',').map((url, index) => {
                        const trimmedUrl = url.trim();
                        // Check if URL is an external link (starts with http:// or https:// and is not a Supabase storage URL)
                        const isExternalLink = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
                        const isSupabaseStorage = trimmedUrl.includes('supabase.co/storage') || trimmedUrl.includes('/storage/v1/object/public/');
                        const showDownload = !isExternalLink || isSupabaseStorage;
                        
                        return (
                          <div key={index} className="flex space-x-2">
                            <a
                              href={trimmedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${showDownload ? 'flex-1' : 'w-full'} px-3 py-2 bg-blue-900 text-white text-center rounded-lg hover:bg-blue-800 transition-colors duration-200 text-sm`}
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>View</span>
                              </div>
                            </a>
                            {showDownload && (
                              <a
                                href={trimmedUrl}
                                download
                                className="flex-1 px-3 py-2 bg-slate-600 text-white text-center rounded-lg hover:bg-slate-700 transition-colors duration-200 text-sm"
                              >
                                <div className="flex items-center justify-center space-x-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Download</span>
                                </div>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Event Programme */}
                {(event.event_programmes_url || event.programme_url) && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-800">Event Programme</h5>
                        <p className="text-sm text-slate-600">Schedule and agenda for this event</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(event.event_programmes_url || event.programme_url).split(',').map((url, index) => {
                        const trimmedUrl = url.trim();
                        // Check if URL is an external link (starts with http:// or https:// and is not a Supabase storage URL)
                        const isExternalLink = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
                        const isSupabaseStorage = trimmedUrl.includes('supabase.co/storage') || trimmedUrl.includes('/storage/v1/object/public/');
                        const showDownload = !isExternalLink || isSupabaseStorage;
                        
                        return (
                          <div key={index} className="flex space-x-2">
                            <a
                              href={trimmedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${showDownload ? 'flex-1' : 'w-full'} px-3 py-2 bg-blue-900 text-white text-center rounded-lg hover:bg-blue-800 transition-colors duration-200 text-sm`}
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>View</span>
                              </div>
                            </a>
                            {showDownload && (
                              <a
                                href={trimmedUrl}
                                download
                                className="flex-1 px-3 py-2 bg-slate-600 text-white text-center rounded-lg hover:bg-slate-700 transition-colors duration-200 text-sm"
                              >
                                <div className="flex items-center justify-center space-x-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Download</span>
                                </div>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Event Details */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-600 to-slate-800 text-white flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-slate-800">Event Details</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          </div>

          {/* Guest Speakers */}
          {(loadingSpeakers || speakers.length > 0) && (
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Guest Speakers</h4>
              </div>
              
              {loadingSpeakers ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-slate-600">Loading speakers...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {speakers.map((eventSpeaker, index) => {
                    const speaker = eventSpeaker.speaker;
                    const fullName = `${speaker.prefix || ''} ${speaker.first_name} ${speaker.last_name} ${speaker.affix || ''}`.trim();
                    return (
                      <div key={eventSpeaker.id} className="flex flex-col items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group">
                        <div className="w-40 h-40 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 relative mb-3 group-hover:shadow-xl transition-shadow duration-300">
                          {speaker.photo_url ? (
                            <img 
                              src={speaker.photo_url} 
                              alt={fullName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg ${speaker.photo_url ? 'hidden' : 'block'}`}>
                            {fullName ? fullName.charAt(0).toUpperCase() : 'S'}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-800 font-medium text-sm">{fullName}</p>
                          {speaker.designation && (
                            <p className="text-slate-500 text-xs mt-1">{speaker.designation}</p>
                          )}
                          {speaker.organization && (
                            <p className="text-slate-400 text-xs mt-1">{speaker.organization}</p>
                          )}
                          {eventSpeaker.is_keynote && (
                            <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              Keynote
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Sponsors */}
          {(loadingSponsors || sponsors.length > 0) && (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-800">Sponsors</h4>
              </div>
              
              {loadingSponsors ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-slate-600">Loading sponsors...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sponsors.map((eventSponsor, index) => {
                    const sponsor = eventSponsor.sponsor;
                    return (
                      <div key={eventSponsor.id} className="flex flex-col items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group">
                        <div className="w-40 h-40 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0 flex items-center justify-center relative mb-3 group-hover:shadow-xl transition-shadow duration-300">
                          {sponsor.logo_url ? (
                            <img 
                              src={sponsor.logo_url} 
                              alt={sponsor.name}
                              className="w-full h-full object-contain p-2"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-lg ${sponsor.logo_url ? 'hidden' : 'block'}`}>
                            {sponsor.name ? sponsor.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-800 font-medium text-sm">{sponsor.name}</p>
                          {sponsor.contact_person && (
                            <p className="text-slate-500 text-xs mt-1">{sponsor.contact_person}</p>
                          )}
                          {sponsor.role && (
                            <p className="text-slate-400 text-xs mt-1">{sponsor.role}</p>
                          )}
                          {sponsor.contribution && (
                            <p className="text-slate-400 text-xs mt-1">{sponsor.contribution}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default EventModal;

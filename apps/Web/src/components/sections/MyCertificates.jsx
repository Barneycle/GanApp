import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CertificateService } from '../../services/certificateService';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { useToast } from '../Toast';
import { 
  Download, 
  Search, 
  Filter, 
  Grid3x3, 
  List, 
  Calendar, 
  MapPin, 
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

export const MyCertificates = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const isVisible = usePageVisibility();
  const loadingRef = useRef(false);

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [downloadingCertId, setDownloadingCertId] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'participant') {
      navigate('/');
      return;
    }

    if (isVisible && !loadingRef.current) {
      loadCertificates();
    }
  }, [isAuthenticated, user, isVisible, navigate]);

  const loadCertificates = async () => {
    if (!user?.id || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      const result = await CertificateService.getUserCertificates(user.id);

      if (result.error) {
        toast.error(result.error);
        setCertificates([]);
      } else {
        setCertificates(result.certificates || []);
        // Expand first event by default
        if (result.certificates && result.certificates.length > 0) {
          const firstEventId = result.certificates[0]?.event?.id;
          if (firstEventId) {
            setExpandedEvents(new Set([firstEventId]));
          }
        }
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
      toast.error('Failed to load certificates');
      setCertificates([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Group certificates by event
  const groupedCertificates = useMemo(() => {
    const grouped = {};
    
    certificates.forEach(cert => {
      if (!cert.event) return;
      
      const eventId = cert.event.id;
      if (!grouped[eventId]) {
        grouped[eventId] = {
          event: cert.event,
          certificates: []
        };
      }
      grouped[eventId].certificates.push(cert);
    });

    // Sort certificates within each group by generated_at (newest first)
    Object.values(grouped).forEach(group => {
      group.certificates.sort((a, b) => 
        new Date(b.generated_at) - new Date(a.generated_at)
      );
    });

    return grouped;
  }, [certificates]);

  // Filter and search certificates
  const filteredGroupedCertificates = useMemo(() => {
    const filtered = {};
    const query = searchQuery.toLowerCase().trim();

    Object.entries(groupedCertificates).forEach(([eventId, group]) => {
      const matchingCerts = group.certificates.filter(cert => {
        const eventTitle = cert.event?.title?.toLowerCase() || '';
        const certNumber = cert.certificate_number?.toLowerCase() || '';
        const participantName = cert.participant_name?.toLowerCase() || '';
        
        return eventTitle.includes(query) || 
               certNumber.includes(query) || 
               participantName.includes(query);
      });

      if (matchingCerts.length > 0) {
        filtered[eventId] = {
          ...group,
          certificates: matchingCerts
        };
      }
    });

    return filtered;
  }, [groupedCertificates, searchQuery]);

  const toggleEventExpansion = (eventId) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleDownload = async (certificate, format) => {
    if (!certificate) return;

    const url = format === 'pdf' 
      ? certificate.certificate_pdf_url 
      : certificate.certificate_png_url;

    if (!url) {
      toast.error(`${format.toUpperCase()} certificate not available`);
      return;
    }

    try {
      setDownloadingCertId(certificate.id);
      setDownloadingFormat(format);

      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${certificate.certificate_number}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Certificate downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${format.toUpperCase()} certificate`);
    } finally {
      setDownloadingCertId(null);
      setDownloadingFormat(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading certificates...</p>
        </div>
      </section>
    );
  }

  const eventGroups = Object.values(filteredGroupedCertificates);
  const totalCertificates = certificates.length;

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">My Certificates</h1>
          <p className="text-slate-600">
            View and download your certificates for completed events
          </p>
        </div>

        {/* Search and View Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by event name, certificate number, or participant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificates Count */}
        {totalCertificates > 0 && (
          <div className="mb-4 text-slate-600">
            Showing {totalCertificates} certificate{totalCertificates !== 1 ? 's' : ''} from {eventGroups.length} event{eventGroups.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Certificates Display */}
        {totalCertificates === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Certificates Found</h3>
            <p className="text-slate-600">
              {searchQuery 
                ? 'No certificates match your search criteria.'
                : 'You don\'t have any certificates yet. Certificates will appear here after you complete events.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventGroups.map((group) => {
              const event = group.event;
              const isExpanded = expandedEvents.has(event.id);
              const certs = group.certificates;

              return (
                <div key={event.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Event Header */}
                  <button
                    onClick={() => toggleEventExpansion(event.id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-800 mb-1">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.start_date)}</span>
                          {event.end_date && event.end_date !== event.start_date && (
                            <span> - {formatDate(event.end_date)}</span>
                          )}
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.venue}</span>
                          </div>
                        )}
                        <div className="text-slate-500">
                          {certs.length} certificate{certs.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {/* Certificates List */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 p-6">
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {certs.map((cert) => (
                            <div
                              key={cert.id}
                              className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              {/* Certificate Preview */}
                              {cert.certificate_png_url ? (
                                <div className="mb-4 aspect-video bg-slate-100 rounded-lg overflow-hidden">
                                  <img
                                    src={cert.certificate_png_url}
                                    alt={`Certificate ${cert.certificate_number}`}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="hidden w-full h-full items-center justify-center text-slate-400">
                                    <ImageIcon className="w-12 h-12" />
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-4 aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                                  <FileText className="w-12 h-12 text-slate-400" />
                                </div>
                              )}

                              {/* Certificate Info */}
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-slate-800">
                                  Certificate #{cert.certificate_number}
                                </div>
                                <div className="text-xs text-slate-600">
                                  <div>Issued: {formatDateTime(cert.generated_at)}</div>
                                  <div>Completion: {formatDate(cert.completion_date)}</div>
                                </div>

                                {/* Download Buttons */}
                                <div className="flex gap-2 mt-4">
                                  {cert.certificate_pdf_url && (
                                    <button
                                      onClick={() => handleDownload(cert, 'pdf')}
                                      disabled={downloadingCertId === cert.id && downloadingFormat === 'pdf'}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {downloadingCertId === cert.id && downloadingFormat === 'pdf' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Download className="w-4 h-4" />
                                      )}
                                      PDF
                                    </button>
                                  )}
                                  {cert.certificate_png_url && (
                                    <button
                                      onClick={() => handleDownload(cert, 'png')}
                                      disabled={downloadingCertId === cert.id && downloadingFormat === 'png'}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {downloadingCertId === cert.id && downloadingFormat === 'png' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Download className="w-4 h-4" />
                                      )}
                                      PNG
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {certs.map((cert) => (
                            <div
                              key={cert.id}
                              className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Thumbnail */}
                                {cert.certificate_png_url ? (
                                  <div className="w-full sm:w-32 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                    <img
                                      src={cert.certificate_png_url}
                                      alt={`Certificate ${cert.certificate_number}`}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="hidden w-full h-full items-center justify-center text-slate-400">
                                      <ImageIcon className="w-8 h-8" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full sm:w-32 h-24 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-8 h-8 text-slate-400" />
                                  </div>
                                )}

                                {/* Certificate Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-slate-800 mb-1">
                                    Certificate #{cert.certificate_number}
                                  </div>
                                  <div className="text-sm text-slate-600 space-y-1">
                                    <div>Issued: {formatDateTime(cert.generated_at)}</div>
                                    <div>Completion Date: {formatDate(cert.completion_date)}</div>
                                    <div>Participant: {cert.participant_name}</div>
                                  </div>
                                </div>

                                {/* Download Buttons */}
                                <div className="flex gap-2 flex-shrink-0">
                                  {cert.certificate_pdf_url && (
                                    <button
                                      onClick={() => handleDownload(cert, 'pdf')}
                                      disabled={downloadingCertId === cert.id && downloadingFormat === 'pdf'}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {downloadingCertId === cert.id && downloadingFormat === 'pdf' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Download className="w-4 h-4" />
                                      )}
                                      PDF
                                    </button>
                                  )}
                                  {cert.certificate_png_url && (
                                    <button
                                      onClick={() => handleDownload(cert, 'png')}
                                      disabled={downloadingCertId === cert.id && downloadingFormat === 'png'}
                                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {downloadingCertId === cert.id && downloadingFormat === 'png' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Download className="w-4 h-4" />
                                      )}
                                      PNG
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

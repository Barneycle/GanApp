import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { EventService } from '../../services/eventService';
import { X, Download, CheckCircle, AlertCircle, Loader, Calendar, MapPin, Clock } from 'lucide-react';

export const BulkQRCodeGenerator = ({ isOpen, onClose, event }) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (isOpen && event) {
      loadParticipants();
    } else {
      // Reset state when modal closes
      setParticipants([]);
      setQrCodes([]);
      setError(null);
      setProgress({ current: 0, total: 0 });
    }
  }, [isOpen, event]);

  const loadParticipants = async () => {
    if (!event?.id) return;

    try {
      setLoading(true);
      setError(null);

      const result = await EventService.getEventParticipants(event.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      const participantsList = result.participants || [];
      setParticipants(participantsList);

      // Load existing QR codes for these participants
      await loadExistingQRCodes(participantsList);
    } catch (err) {
      console.error('Error loading participants:', err);
      setError('Failed to load participants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingQRCodes = async (participantsList) => {
    try {
      const userIds = participantsList.map(p => p.user_id || p.users?.id).filter(Boolean);
      
      if (userIds.length === 0) {
        setQrCodes({});
        return;
      }

      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('event_id', event.id)
        .eq('code_type', 'event_checkin')
        .in('owner_id', userIds);

      if (error) {
        console.error('Error loading existing QR codes:', error);
        return;
      }

      // Map QR codes by owner_id and generate QR URLs from existing qr_data
      const qrMap = {};
      (data || []).forEach(qr => {
        const qrData = qr.qr_data || {};
        // Generate QR code URL from existing qr_data
        const qrCodeData = JSON.stringify(qrData);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}`;
        
        qrMap[qr.owner_id] = {
          ...qr,
          qrUrl,
          participantId: qr.owner_id,
          participantName: qrData.participantName || 'Participant',
          participantEmail: qrData.participantEmail
        };
      });

      setQrCodes(qrMap);
    } catch (err) {
      console.error('Error loading existing QR codes:', err);
    }
  };

  const calculateEventDays = () => {
    if (!event?.start_date || !event?.end_date) return 1;
    
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const generateQRCodeForParticipant = async (participant) => {
    const participantId = participant.user_id || participant.users?.id;
    const participantUser = participant.users || participant;
    
    if (!participantId) {
      throw new Error('Participant ID not found');
    }

    // Check if QR code already exists - if so, reuse it
    const existingQR = qrCodes[participantId];
    if (existingQR && existingQR.qrUrl) {
      return existingQR;
    }

    const participantName = `${participantUser.first_name || ''} ${participantUser.last_name || ''}`.trim() || participantUser.email || 'Participant';
    const eventDays = calculateEventDays();

    // Create QR data for event check-in
    const qrData = {
      eventId: event.id,
      userId: participantId,
      title: event.title,
      date: event.start_date,
      endDate: event.end_date,
      time: event.start_time,
      venue: event.venue,
      participantName: participantName,
      participantEmail: participantUser.email,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
      type: 'event_checkin',
      eventDays: eventDays,
      // Add metadata for one-time-per-day check-in
      metadata: {
        maxCheckInsPerDay: 1,
        eventDurationDays: eventDays,
        checkInDates: [] // Will be populated when scanned
      }
    };

    // Create a unique token for this participant+event combination
    const qrDataString = `EVENT_${event.id}_USER_${participantId}_${Date.now()}`;

    // Create new QR code
    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        code_type: 'event_checkin',
        title: `${event.title} - ${participantName} Check-in QR Code`,
        description: `QR code for event check-in: ${event.title}`,
        created_by: user?.id,
        owner_id: participantId,
        event_id: event.id,
        qr_data: qrData,
        qr_token: qrDataString,
        is_active: true,
        is_public: false, // Only the participant should use this
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Generate QR code URL
    const qrCodeData = JSON.stringify(qrData);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}`;

    return {
      ...data,
      qrUrl,
      participantId,
      participantName,
      participantEmail: participantUser.email
    };
  };

  const generateAllQRCodes = async () => {
    if (participants.length === 0) {
      setError('No participants found for this event.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      
      // Filter participants that don't have QR codes yet
      const participantsNeedingQR = participants.filter(p => {
        const participantId = p.user_id || p.users?.id;
        return !qrCodes[participantId] || !qrCodes[participantId].qrUrl;
      });

      if (participantsNeedingQR.length === 0) {
        // All participants already have QR codes
        return;
      }

      setProgress({ current: 0, total: participantsNeedingQR.length });

      const updatedQrMap = { ...qrCodes };

      for (let i = 0; i < participantsNeedingQR.length; i++) {
        const participant = participantsNeedingQR[i];
        try {
          const qrCode = await generateQRCodeForParticipant(participant);
          updatedQrMap[qrCode.participantId] = qrCode;
          setProgress({ current: i + 1, total: participantsNeedingQR.length });
        } catch (err) {
          console.error(`Error generating QR code for participant ${i + 1}:`, err);
          // Continue with other participants even if one fails
        }
      }

      setQrCodes(updatedQrMap);
    } catch (err) {
      console.error('Error generating QR codes:', err);
      setError('Failed to generate some QR codes. Please try again.');
    } finally {
      setGenerating(false);
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

  const downloadQRCode = (qrCode) => {
    if (!qrCode.qrUrl) return;

    const link = document.createElement('a');
    link.href = qrCode.qrUrl;
    const fileName = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${qrCode.participantName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
    link.download = fileName;
    link.click();
  };

  const downloadAllQRCodes = async () => {
    const qrCodeList = Object.values(qrCodes).filter(qr => qr.qrUrl);
    
    if (qrCodeList.length === 0) {
      setError('No QR codes available to download.');
      return;
    }

    // Download each QR code with a small delay to avoid browser blocking
    for (let i = 0; i < qrCodeList.length; i++) {
      setTimeout(() => {
        downloadQRCode(qrCodeList[i]);
      }, i * 200); // 200ms delay between downloads
    }
  };

  if (!isOpen) {
    return null;
  }

  const hasQRCodes = Object.keys(qrCodes).length > 0;
  const allGenerated = participants.length > 0 && Object.keys(qrCodes).length === participants.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Generate QR Codes</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate check-in QR codes for registered participants
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Event Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">{event?.title}</h3>
            <div className="text-sm text-gray-600">
              <p>Event Date: {event?.start_date} {event?.end_date !== event?.start_date ? `- ${event?.end_date}` : ''}</p>
              <p>Registered Participants: {participants.length}</p>
              {event && (
                <p>Event Duration: {calculateEventDays()} day{calculateEventDays() !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading participants...</p>
            </div>
          )}

          {/* Generate Button */}
          {!loading && participants.length > 0 && (
            <div className="mb-6 flex items-center justify-between">
              <div>
                <button
                  onClick={generateAllQRCodes}
                  disabled={generating || allGenerated}
                  className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {generating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Generating... ({progress.current}/{progress.total})
                    </>
                  ) : allGenerated ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      All QR Codes Generated
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Generate All QR Codes
                    </>
                  )}
                </button>
              </div>
              {hasQRCodes && (
                <button
                  onClick={downloadAllQRCodes}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download All
                </button>
              )}
            </div>
          )}

          {/* Participants List */}
          {!loading && participants.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No registered participants found for this event.</p>
            </div>
          )}

          {/* QR Codes Grid */}
          {!loading && hasQRCodes && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {participants.map((participant) => {
                const participantId = participant.user_id || participant.users?.id;
                const participantUser = participant.users || participant;
                const participantName = `${participantUser.first_name || ''} ${participantUser.last_name || ''}`.trim() || participantUser.email || 'Participant';
                const qrCode = qrCodes[participantId];

                if (!qrCode || !qrCode.qrUrl) return null;

                return (
                  <div key={participantId} className="bg-white rounded-lg overflow-hidden">
                    {/* Modern QR Code Card - Matching GenerateQRModal Design */}
                    <div className="bg-slate-900 rounded-3xl p-4 mb-4 shadow-2xl relative overflow-hidden">
                      {/* Background Pattern Effect */}
                      <div className="absolute inset-0 bg-blue-900 opacity-10 rounded-3xl"></div>
                      
                      {/* White Card Container */}
                      <div className="bg-white rounded-2xl p-4 max-w-xs mx-auto relative z-10 shadow-lg">
                        {/* QR Code */}
                        <div className="bg-white rounded-2xl p-3 mb-3">
                          <img
                            src={qrCode.qrUrl}
                            alt={`QR Code for ${participantName}`}
                            className="w-full h-auto mx-auto"
                            style={{ maxWidth: '200px' }}
                          />
                        </div>

                        {/* Participant Name */}
                        <p className="text-lg font-bold text-blue-600 mt-2 mb-1 text-center">
                          {participantName}
                        </p>

                        {/* Event Title */}
                        <p className="text-sm text-slate-500 text-center mb-2">
                          {event.title}
                        </p>
                      </div>

                      {/* Scan Instruction */}
                      <p className="text-xs text-slate-400 mt-3 text-center relative z-10">
                        Scan for event check-in
                      </p>
                    </div>

                    {/* Event Info */}
                    <div className="bg-blue-50 rounded-xl p-3 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-gray-600">
                          <Calendar className="w-3 h-3 mr-2" />
                          <span>{formatDate(event.start_date)}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <Clock className="w-3 h-3 mr-2" />
                          <span>{formatTime(event.start_time)}</span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center text-xs text-gray-600">
                            <MapPin className="w-3 h-3 mr-2" />
                            <span className="truncate">{event.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={() => downloadQRCode(qrCode)}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors font-semibold text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PNG</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State - No QR Codes Generated Yet */}
          {!loading && participants.length > 0 && !hasQRCodes && !generating && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Click "Generate All QR Codes" to create QR codes for all participants.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


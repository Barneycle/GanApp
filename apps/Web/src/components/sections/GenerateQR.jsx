import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { createQRDataString, getQRTokenInfo } from '../../lib/jwtUtils';
import { generateQRCodeID, formatQRCodeID } from '../../utils/qrCodeUtils';
import { X, Download, Calendar, MapPin, Clock, Loader } from 'lucide-react';
import { useToast } from '../Toast';

// Modal version for event QR codes
export const GenerateQRModal = ({ isOpen, onClose, event }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeToken, setQrCodeToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && event) {
      generateEventQRCode();
    }
  }, [isOpen, event]);

  const generateEventQRCode = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create QR data for event registration
      const qrData = {
        eventId: event.id,
        title: event.title,
        date: event.start_date,
        time: event.start_time,
        venue: event.venue,
        userId: user?.id,
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
        type: 'event_registration'
      };

      // Create a unique 8-character QR code ID
      const qrCodeID = generateQRCodeID();

      // Check if QR code already exists for this user+event combination
      // Check both created_by and owner_id to find QR codes created from either web or mobile
      const { data: existingQRs, error: fetchError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('event_id', event.id)
        .eq('code_type', 'event_checkin')
        .or(`created_by.eq.${user?.id},owner_id.eq.${user?.id}`)
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      const existingQR = existingQRs && existingQRs.length > 0 ? existingQRs[0] : null;

      let qrRecord;
      if (existingQR) {
        // Reuse existing QR code (whether created by user or organizer)
        // Generate QR code URL from existing qr_data
        const existingQrData = existingQR.qr_data || qrData;
        const qrCodeData = JSON.stringify(existingQrData);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=1e3a8a&data=${encodeURIComponent(qrCodeData)}`;
        setQrCodeUrl(qrUrl);

        // If existing token is not 8 characters, generate a new random one and update
        let finalToken = existingQR.qr_token;
        if (!finalToken || finalToken.length !== 8) {
          finalToken = generateQRCodeID();
          // Update the QR code with the new random 8-character ID
          await supabase
            .from('qr_codes')
            .update({ qr_token: finalToken })
            .eq('id', existingQR.id);
        }
        setQrCodeToken(finalToken);
        return; // Exit early - reuse existing QR code
      } else {
        // Create new QR code
        const { data, error } = await supabase
          .from('qr_codes')
          .insert({
            code_type: 'event_checkin',
            title: `${event.title} - Check-in QR Code`,
            description: `QR code for event check-in: ${event.title}`,
            created_by: user?.id,
            owner_id: user?.id,
            event_id: event.id,
            qr_data: qrData,
            qr_token: qrCodeID,
            is_active: true,
            is_public: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        qrRecord = data && data.length > 0 ? data[0] : null;
        setQrCodeToken(qrRecord?.qr_token || qrCodeID);
      }

      // Generate QR code URL with full qrData
      const qrCodeData = JSON.stringify(qrData);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=1e3a8a&data=${encodeURIComponent(qrCodeData)}`;
      setQrCodeUrl(qrUrl);

    } catch (err) {
      console.error('Error generating event QR code:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      setError(`Failed to generate QR code: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const qrCardRef = useRef(null);

  const [downloading, setDownloading] = useState(false);

  const downloadQRCode = async () => {
    if (!qrCodeUrl || !qrCardRef.current) return;

    if (downloading) return; // Prevent multiple simultaneous downloads

    try {
      setDownloading(true);

      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;

      // Capture the entire QR code card
      const canvas = await html2canvas(qrCardRef.current, {
        backgroundColor: '#0f172a', // Match the dark blue background
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob');
        }

        // Create download link with blob URL
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Clean up after a delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
          setDownloading(false);
        }, 100);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Error downloading QR code:', err);
      setDownloading(false);
      // Fallback: try downloading just the QR code image
      try {
        const response = await fetch(qrCodeUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
        });
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
          }, 100);
        }
      } catch (fallbackErr) {
        console.error('Fallback download also failed:', fallbackErr);
      }
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Event QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating QR code...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={generateEventQRCode}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* QR Code */}
          {qrCodeUrl && !loading && !error && (
            <>
              {/* Modern QR Code Card - Matching Mobile Design */}
              <div ref={qrCardRef} className="bg-slate-900 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden">
                {/* Background Pattern Effect */}
                <div className="absolute inset-0 bg-blue-900 opacity-10 rounded-3xl"></div>

                {/* White Card Container */}
                <div className="bg-white rounded-2xl p-5 max-w-xs mx-auto relative z-10 shadow-lg">
                  {/* QR Code */}
                  <div className="bg-white rounded-2xl p-4 mb-4">
                    <img
                      src={qrCodeUrl}
                      alt="Event QR Code"
                      className="w-full h-auto mx-auto"
                      style={{ maxWidth: '240px' }}
                    />
                  </div>

                  {/* User Name */}
                  {user && (
                    <p className="text-lg font-bold text-black mt-2 mb-1 text-center">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email?.split('@')[0] || 'User'}
                    </p>
                  )}

                  {/* Event Title */}
                  <p className="text-sm text-slate-500 text-center mb-4">
                    {event.title}
                  </p>

                  {/* QR Code ID for Manual Entry */}
                  {qrCodeToken && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2 text-center font-medium">
                        Manual Entry ID
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            const idToCopy = formatQRCodeID(qrCodeToken).replace(/-/g, '');
                            await navigator.clipboard.writeText(idToCopy);
                            toast.success('ID copied to clipboard!');
                          } catch (err) {
                            console.error('Failed to copy:', err);
                            toast.error('Failed to copy ID. Please select and copy manually.');
                          }
                        }}
                        className="w-full bg-slate-50 rounded-lg p-3 border border-slate-300 hover:border-blue-900 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group"
                      >
                        <code className="text-xl text-blue-900 font-mono font-bold tracking-widest select-all">
                          {formatQRCodeID(qrCodeToken)}
                        </code>
                        <svg className="w-4 h-4 text-blue-900 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <p className="text-xs text-slate-400 mt-2 text-center">
                        Use if camera doesn't work
                      </p>
                    </div>
                  )}
                </div>

                {/* Scan Instruction */}
                <p className="text-xs text-slate-400 mt-4 text-center relative z-10">
                  Scan for event check-in
                </p>
              </div>

              {/* Event Info */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">{event.title}</h3>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(event.start_date)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{formatTime(event.start_time)}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{event.venue}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadQRCode}
                disabled={downloading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download PNG</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Original page component for user QR codes
export default function GenerateQR() {
  const { user } = useAuth();
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [scanHistory, setScanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(!user);

  useEffect(() => {
    if (user) {
      generateQRCode();
      fetchScanHistory();
    } else {
      // Generate demo QR code for unauthenticated users
      generateDemoQRCode();
    }
  }, [user]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create JWT-based QR data string in format: userID | timestamp | signature
      const qrDataString = createQRDataString(user);

      // Create QR data object for database storage
      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      const qrData = {
        userId: user.id,
        userEmail: user.email,
        userName: userName,
        userRole: user.role || 'participant',
        generatedAt: new Date().toISOString(),
        type: 'user_qr',
        qrDataString: qrDataString // Store the JWT-based QR string
      };

      // Check if QR code already exists for this user
      const { data: existingQRs, error: fetchError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('created_by', user.id)
        .eq('code_type', 'user_profile')
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      const existingQR = existingQRs && existingQRs.length > 0 ? existingQRs[0] : null;

      let qrRecord;
      if (existingQR) {
        // Update existing QR code
        const { data, error } = await supabase
          .from('qr_codes')
          .update({
            qr_data: qrData,
            qr_token: qrDataString,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingQR.id)
          .select();

        if (error) throw error;
        qrRecord = data && data.length > 0 ? data[0] : null;
      } else {
        // Create new QR code
        const title = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
        const { data, error } = await supabase
          .from('qr_codes')
          .insert({
            code_type: 'user_profile',
            title: title,
            description: 'User profile QR code',
            created_by: user.id,
            owner_id: user.id,
            qr_data: qrData,
            qr_token: qrDataString, // Use the JWT string as unique token
            is_active: true,
            is_public: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        qrRecord = data && data.length > 0 ? data[0] : null;
      }

      setQrCodeData(qrRecord);

      // Generate QR code URL using the JWT-based data string
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=1e3a8a&data=${encodeURIComponent(qrDataString)}`;
      setQrCodeUrl(qrUrl);

    } catch (err) {
      console.error('Error generating user QR code:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        user: user
      });
      setError(`Failed to generate QR code: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoQRCode = () => {
    try {
      setLoading(true);
      setError(null);

      // Create demo QR data
      const demoData = {
        userId: 'demo-user-123',
        userEmail: 'demo@example.com',
        userName: 'Demo User',
        userRole: 'participant',
        generatedAt: new Date().toISOString(),
        type: 'demo_qr',
        qrDataString: 'DEMO_QR_CODE_DATA'
      };

      setQrCodeData(demoData);

      // Generate demo QR code URL
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=1e3a8a&data=${encodeURIComponent('DEMO_QR_CODE_DATA')}`;
      setQrCodeUrl(qrUrl);

      // Set empty scan history for demo
      setScanHistory([]);

    } catch (err) {
      setError('Failed to generate demo QR code');
    } finally {
      setLoading(false);
    }
  };

  const fetchScanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_code_scans')
        .select('*')
        .eq('scanned_by', user.id)
        .order('scan_timestamp', { ascending: false });

      if (error) throw error;
      setScanHistory(data || []);
    } catch (err) {
      // Error fetching scan history
    }
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={generateQRCode}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* QR Code Section - Centered */}
        <div className="flex justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-10 max-w-lg w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Your QR Code
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto"></div>
            </div>

            {qrCodeUrl && (
              <div className="text-center">
                <div className="mb-8">
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-xl border border-gray-100 inline-block">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-72 h-72 mx-auto drop-shadow-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Name</p>
                    <p className="text-gray-800 font-semibold">{demoMode ? 'Demo User' : `${user?.first_name} ${user?.last_name}`}</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Email</p>
                    <p className="text-gray-800 font-semibold text-sm">{demoMode ? 'demo@example.com' : user?.email}</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Role</p>
                    <p className="text-gray-800 font-semibold">{demoMode ? 'Participant' : user?.role}</p>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Generated</p>
                    <p className="text-gray-800 font-semibold text-sm">{qrCodeData?.generatedAt ? formatDate(qrCodeData.generatedAt) : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={demoMode ? generateDemoQRCode : generateQRCode}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {demoMode ? 'Regenerate Demo QR' : 'Regenerate QR Code'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

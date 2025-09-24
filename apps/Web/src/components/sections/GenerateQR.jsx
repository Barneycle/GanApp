import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { createQRDataString, getQRTokenInfo } from '../../lib/jwtUtils';
import { X, Download, Calendar, MapPin, Clock } from 'lucide-react';

// Modal version for event QR codes
export const GenerateQRModal = ({ isOpen, onClose, event }) => {
  const { user } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
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
      const qrData = JSON.stringify({
        eventId: event.id,
        title: event.title,
        date: event.start_date,
        time: event.start_time,
        venue: event.venue,
        userId: user?.id,
        type: 'event_registration'
      });

      // Generate QR code URL
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);

    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
    link.click();
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
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* QR Code */}
          {qrCodeUrl && !loading && !error && (
            <>
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
                  <img
                    src={qrCodeUrl}
                    alt="Event QR Code"
                    className="w-64 h-64 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Scan this QR code for event details
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  onClick={downloadQRCode}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR Code</span>
                </button>
              </div>
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
      const qrData = {
        userId: user.id,
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        userRole: user.role,
        generatedAt: new Date().toISOString(),
        type: 'user_qr',
        qrDataString: qrDataString // Store the JWT-based QR string
      };

      // Check if QR code already exists for this user
      const { data: existingQR, error: fetchError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let qrRecord;
      if (existingQR) {
        // Update existing QR code
        const { data, error } = await supabase
          .from('qr_codes')
          .update({
            qr_data: qrData,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        qrRecord = data;
      } else {
        // Create new QR code
        const { data, error } = await supabase
          .from('qr_codes')
          .insert({
            user_id: user.id,
            qr_data: qrData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        qrRecord = data;
      }

      setQrCodeData(qrRecord);

      // Generate QR code URL using the JWT-based data string
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataString)}`;
      setQrCodeUrl(qrUrl);

    } catch (err) {
      setError('Failed to generate QR code');
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
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('DEMO_QR_CODE_DATA')}`;
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
        .from('qr_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false });

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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventService } from '../../services/eventService';

export const Certificate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);
  const [certificateData, setCertificateData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    } else {
      setError('Event ID is missing');
      setLoading(false);
    }
  }, [eventId]);

  const loadEventData = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const eventResult = await EventService.getEventById(eventId);
      
      if (eventResult.error) {
        setError(eventResult.error || 'Failed to load event data');
        setLoading(false);
        return;
      }

      if (eventResult.event) {
        setEvent(eventResult.event);
        
        // Get participant name from user data
        const participantName = user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`
          : user?.email?.split('@')[0] || 'Participant';

        // Format event date
        const eventDate = new Date(eventResult.event.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Get organizer name (you might need to fetch this from the creator)
        const organizer = 'GanApp Events';

        const certData = {
          eventId: eventResult.event.id,
          eventName: eventResult.event.title,
          participantName: participantName,
          date: eventDate,
          certificateId: `CERT-${Date.now()}`,
          organizer: organizer
        };
        
        setCertificateData(certData);
      }
    } catch (err) {
      console.error('Error loading event data:', err);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async () => {
    if (!certificateData) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      alert('Certificate Generated! Your certificate has been successfully generated.');
    }, 3000);
  };

  const downloadCertificate = async () => {
    alert('Certificate download functionality would be implemented here.');
  };

  const shareCertificate = async () => {
    alert('Certificate sharing functionality would be implemented here.');
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading certificate data...</p>
        </div>
      </section>
    );
  }

  if (error || !certificateData) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Error</h3>
            <p className="text-slate-600 mb-6">{error || 'Failed to load certificate data'}</p>
            <button 
              onClick={() => navigate('/my-events')} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Back to My Events
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">Certificate of Participation</h2>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Event Name</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.eventName}</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Participant</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.participantName}</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Date</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.date}</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <p className="text-base text-gray-600 mb-2">Organizer</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-800">{certificateData.organizer}</p>
            </div>

            <div>
              <p className="text-base text-gray-600 mb-2">Certificate ID</p>
              <p className="text-base font-mono text-gray-500">{certificateData.certificateId}</p>
            </div>
          </div>
        </div>

        {!isGenerated ? (
          <button
            onClick={generateCertificate}
            disabled={isGenerating}
            className={`w-full py-5 rounded-lg items-center justify-center mb-6 ${
              isGenerating ? 'bg-blue-400' : 'bg-blue-700'
            } text-white text-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isGenerating ? 'Generating Certificate...' : 'Generate Certificate'}
          </button>
        ) : (
          <div className="space-y-4">
            <button
              onClick={downloadCertificate}
              className="w-full py-5 bg-green-500 rounded-lg items-center justify-center text-white text-lg font-semibold hover:bg-green-600 transition-colors"
              style={{ minHeight: '56px' }}
            >
              Download PDF
            </button>

            <button
              onClick={shareCertificate}
              className="w-full py-5 bg-blue-700 rounded-lg items-center justify-center text-white text-lg font-semibold hover:bg-blue-800 transition-colors"
              style={{ minHeight: '56px' }}
            >
              Share Certificate
            </button>
          </div>
        )}

        {isGenerated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-medium">Certificate generated successfully!</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full py-5 bg-blue-800 rounded-lg items-center justify-center text-white text-lg font-semibold hover:bg-blue-900 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
};


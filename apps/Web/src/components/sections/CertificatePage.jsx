import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CertificateGenerator from '../CertificateGenerator';

export const CertificatePage = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const handleClose = () => {
    window.history.back();
  };

  if (!eventId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Error</h2>
          <p className="text-slate-600 mb-6">Event ID is required to generate a certificate.</p>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <CertificateGenerator eventId={eventId} onClose={handleClose} />;
};


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CertificateDesigner from '../CertificateDesigner';
import { useToast } from '../Toast';

export const DesignCertificate = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [pendingEventData, setPendingEventData] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.warning('Please log in to continue');
      navigate('/login');
      return;
    }

    // Check if there's pending event data
    const eventData = sessionStorage.getItem('pending-event-data');
    if (!eventData) {
      toast.warning('No event data found. Please create an event first.');
      navigate('/create-event');
      return;
    }

    setPendingEventData(JSON.parse(eventData));
  }, [isAuthenticated, navigate, toast]);

  const handleContinue = () => {
    // Navigate to evaluation form creation
    navigate('/create-survey');
  };

  const handleBack = () => {
    // Go back to event creation
    navigate('/create-event');
  };

  if (!pendingEventData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex items-center justify-center mb-4">
              <button
                onClick={handleBack}
                className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-200 mr-4 group"
                aria-label="Back to create event"
              >
                <svg
                  className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800">
                Design Certificate
              </h1>
            </div>

            {/* Progress Indicator */}
            <div className="mt-8 mb-8">
              <div className="flex items-center justify-center space-x-4 sm:space-x-8">
                {/* Step 1: Create Event - Completed */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-semibold text-green-600">Create Event</p>
                    <p className="text-xs text-slate-500 mt-1">Completed</p>
                  </div>
                </div>

                {/* Connector Line */}
                <div className="hidden sm:block w-16 h-0.5 bg-green-500"></div>

                {/* Step 2: Design Certificate - Current Step */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                    2
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-semibold text-blue-600">Design Certificate</p>
                    <p className="text-xs text-slate-500 mt-1">Current Step</p>
                  </div>
                </div>

                {/* Connector Line */}
                <div className="hidden sm:block w-16 h-0.5 bg-slate-300"></div>

                {/* Step 3: Create Evaluation - Next Step */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-semibold text-slate-500">Create Evaluation</p>
                    <p className="text-xs text-slate-400 mt-1">Next Step</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Designer */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <CertificateDesigner
            draftMode={true}
            draftStorageKey="pending-certificate-config"
            onSave={(config) => {
              // Config is automatically saved to sessionStorage in draft mode
              toast.success('Certificate configuration saved!');
            }}
          />
        </div>

        {/* Navigation Footer */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="px-6 py-3 text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            ← Back to Event Details
          </button>
          <button
            onClick={handleContinue}
            className="px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            Continue to Evaluation Form
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};


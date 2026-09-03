import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CertificateDesigner from '../CertificateDesigner';
import { useToast } from '../Toast';
import { PageSkeleton } from '../loading/Skeleton';

export const DesignCertificate = () => {
  const navigate = useNavigate();
  const { user: _user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [pendingEventData, setPendingEventData] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);

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

    // Check if there's a saved draft
    const checkDraft = () => {
      const draftConfig = sessionStorage.getItem('pending-certificate-config');
      if (draftConfig) {
        try {
          const config = JSON.parse(draftConfig);
          // Check if config has meaningful content
          if (config && (config.title_text || config.name_config || config.header_config)) {
            setHasDraft(true);
            return;
          }
        } catch (e) {
          // Invalid draft, ignore
        }
      }
      setHasDraft(false);
    };

    // Check initially
    checkDraft();

    // Set up interval to check for draft updates (for auto-save)
    const interval = setInterval(checkDraft, 1000);

    return () => clearInterval(interval);
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
    return <PageSkeleton variant="form" />;
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-slate-50">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Back to create event"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-slate-900">Design Certificate</h1>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">1 Event</span>
          <span className="text-slate-300">/</span>
          <span className={`rounded px-1.5 py-0.5 font-medium ${hasDraft ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-800'}`}>
            2 Certificate
          </span>
          <span className="text-slate-300">/</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">3 Evaluation</span>
        </div>
        <button
          type="button"
          onClick={handleContinue}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-blue-900 px-3 text-xs font-semibold text-white hover:bg-blue-800"
        >
          Continue
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </header>
      <div className="flex h-full min-h-0 flex-1 overflow-hidden">
        <CertificateDesigner
          draftMode={true}
          draftStorageKey="pending-certificate-config"
          onSave={(_config) => {
            setHasDraft(true);
            toast.success('Certificate configuration saved!');
          }}
        />
      </div>
    </div>
  );
};


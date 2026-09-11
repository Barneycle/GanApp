import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CertificateDesigner from '../CertificateDesigner';
import { useToast } from '../Toast';
import { PageSkeleton } from '../loading/Skeleton';
import { EventPipelineTracker, isCertificateConfigured, isPipelineCertificateDone, markPipelineCertificateDone, readSessionCertificateConfig } from '../eventForm/EventPipelineTracker';
import { CertificateService } from '../../services/certificateService';

export const DesignCertificate = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
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

    const checkDraft = async () => {
      const sessionConfig = readSessionCertificateConfig();
      if (isCertificateConfigured(sessionConfig)) {
        setHasDraft(true);
        markPipelineCertificateDone();
        return;
      }

      const draftEventId = sessionStorage.getItem('pending-event-id');
      if (draftEventId) {
        const { config } = await CertificateService.getCertificateConfig(draftEventId);
        if (isCertificateConfigured(config)) {
          setHasDraft(true);
          markPipelineCertificateDone();
          try {
            sessionStorage.setItem('pending-certificate-config', JSON.stringify(config));
          } catch {
            // Ignore session write failures
          }
        }
      }
    };

    checkDraft();

    const interval = setInterval(() => {
      if (isCertificateConfigured(readSessionCertificateConfig())) {
        setHasDraft(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, navigate, toast]);

  const handleContinue = async () => {
    markPipelineCertificateDone();
    const draftEventId = sessionStorage.getItem('pending-event-id');
    const config = readSessionCertificateConfig();
    if (draftEventId && user?.id && config) {
      try {
        await CertificateService.saveCertificateConfig(draftEventId, config, user.id);
      } catch (error) {
        console.warn('Failed to persist certificate draft:', error);
      }
    }
    navigate('/create-survey');
  };

  const handleBack = () => {
    const draftEventId = sessionStorage.getItem('pending-event-id');
    navigate(draftEventId ? `/edit-event/${draftEventId}` : '/create-event');
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
        <EventPipelineTracker compact current={2} certificateDone={hasDraft} />
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
            markPipelineCertificateDone();
            toast.success('Certificate configuration saved!');
          }}
        />
      </div>
    </div>
  );
};


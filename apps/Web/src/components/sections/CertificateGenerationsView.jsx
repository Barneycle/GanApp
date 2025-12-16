import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { EventService } from '../../services/eventService';
import { JobQueueService } from '../../services/jobQueueService';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { X, CheckCircle, XCircle, Loader, Calendar } from 'lucide-react';

export const CertificateGenerationsView = ({ isOpen, onClose, event }) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [orphanedCertificatesWithUsers, setOrphanedCertificatesWithUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !event) {
    return null;
  }

  useEffect(() => {
    if (isOpen && event) {
      loadData();
    } else {
      // Reset state when modal closes
      setParticipants([]);
      setCertificates([]);
      setOrphanedCertificatesWithUsers([]);
      setError(null);
    }
  }, [isOpen, event]);

  const loadData = async () => {
    if (!event?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load participants and certificates
      // Note: We don't load job queue certificates anymore - they're just a queue, not actual certificates
      const [participantsResult, certificatesResult] = await Promise.all([
        EventService.getEventParticipants(event.id),
        loadCertificates(event.id)
      ]);

      if (participantsResult.error) {
        setError(participantsResult.error);
        return;
      }

      const participantsList = participantsResult.participants || [];
      setParticipants(participantsList);

      // Only use database certificates for counting and display
      // Job queue is just a queue, not actual certificates
      // Database certificates are the source of truth
      const databaseCertificates = certificatesResult || [];
      setCertificates(databaseCertificates);

      // Load user info for orphaned certificates (certificates without matching participants)
      const participantIds = new Set(participantsList.map(p => p.user_id || p.users?.id).filter(Boolean));
      const orphanedCerts = databaseCertificates.filter(cert => {
        if (!cert.user_id) return false; // Skip certs without user_id
        return !participantIds.has(cert.user_id);
      });

      if (orphanedCerts.length > 0) {
        // Load user info for orphaned certificates (for email display)
        // But use participant_name from certificate record as primary name
        const orphanedWithUsers = await Promise.all(
          orphanedCerts.map(async (cert) => {
            try {
              const { data: userData } = await supabase.rpc('get_user_profile', {
                user_id: cert.user_id
              });
              return {
                ...cert,
                user: userData || null,
                // Use participant_name from certificate if available, otherwise use user name
                displayName: cert.participant_name ||
                  (userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : 'Unknown User') ||
                  userData?.email ||
                  'Unknown User'
              };
            } catch (err) {
              console.error(`Error loading user for certificate ${cert.id}:`, err);
              return {
                ...cert,
                user: null,
                displayName: cert.participant_name || 'Unknown User'
              };
            }
          })
        );
        setOrphanedCertificatesWithUsers(orphanedWithUsers);
      } else {
        setOrphanedCertificatesWithUsers([]);
      }
    } catch (err) {
      console.error('Error loading certificate generations:', err);
      setError('Failed to load certificate generations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async (eventId) => {
    try {
      console.log('[CertificateGenerationsView] Loading certificates for event:', eventId);

      // First, get all certificate templates for this event
      const { data: templates, error: templatesError } = await supabase
        .from('certificate_templates')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (templatesError) {
        console.error('[CertificateGenerationsView] Error loading certificate templates:', templatesError);
      } else {
        console.log('[CertificateGenerationsView] Found templates:', templates?.length || 0);
      }

      const templateIds = templates?.map(t => t.id) || [];
      console.log('[CertificateGenerationsView] Template IDs:', templateIds);

      // Query certificates that either:
      // 1. Have event_id matching the event (primary method - works for standalone certs with event selected)
      // 2. Have certificate_template_id matching any of the event's templates (fallback)
      let allCertificates = [];

      // Primary query: Get certificates by event_id
      // This is the main way to find certificates, including those generated via standalone generator with event selected
      const { data: eventCerts, error: eventError } = await supabase
        .from('certificates')
        .select('*')
        .eq('event_id', eventId)
        .order('generated_at', { ascending: false });

      if (eventError) {
        console.error('[CertificateGenerationsView] Error loading certificates by event_id:', eventError);
        console.error('[CertificateGenerationsView] Error details:', JSON.stringify(eventError, null, 2));
      } else {
        console.log('[CertificateGenerationsView] Found certificates by event_id:', eventCerts?.length || 0);
        allCertificates = eventCerts || [];
      }

      // Secondary query: Get certificates by template_id (if templates exist)
      // This is a fallback for certificates that might be linked via template but not event_id
      if (templateIds.length > 0) {
        const { data: templateCerts, error: templateError } = await supabase
          .from('certificates')
          .select('*')
          .in('certificate_template_id', templateIds)
          .order('generated_at', { ascending: false });

        if (templateError) {
          console.error('[CertificateGenerationsView] Error loading certificates by template_id:', templateError);
        } else {
          console.log('[CertificateGenerationsView] Found certificates by template_id:', templateCerts?.length || 0);
          // Merge and deduplicate by certificate id
          const existingIds = new Set(allCertificates.map(c => c.id));
          const newCerts = (templateCerts || []).filter(c => !existingIds.has(c.id));
          allCertificates = [...allCertificates, ...newCerts];
          console.log('[CertificateGenerationsView] Added certificates from template query:', newCerts.length);
        }
      }

      console.log('[CertificateGenerationsView] Total certificates found:', allCertificates.length);

      // Sort by generated_at descending
      allCertificates.sort((a, b) => {
        const dateA = new Date(a.generated_at || 0);
        const dateB = new Date(b.generated_at || 0);
        return dateB - dateA;
      });

      return allCertificates;
    } catch (err) {
      console.error('Error loading certificates:', err);
      return [];
    }
  };

  const loadJobQueueCertificates = async (eventId) => {
    try {
      // Get all completed certificate generation jobs
      // We need to check jobs from all users, not just the current user
      // because organizers generate certs for participants
      // Note: This might be limited by RLS policies, but we'll try to get all relevant jobs
      const { data: allJobs, error: jobsError } = await supabase
        .from('job_queue')
        .select('*')
        .eq('job_type', 'certificate_generation')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (jobsError) {
        console.error('Error loading job queue certificates:', jobsError);
        // If we can't query all jobs (RLS restriction), try to get jobs from current user
        // and participants of this event
        return await loadJobQueueCertificatesFallback(eventId);
      }

      if (!allJobs || allJobs.length === 0) {
        return [];
      }

      // Filter jobs that match this event
      const eventJobs = allJobs.filter(job => {
        const jobData = job.job_data || {};
        const jobEventId = jobData.eventId;

        // Match if:
        // 1. Job eventId matches the event
        // 2. Job eventTitle matches the event title (for standalone certs that reference the event)
        return jobEventId === eventId ||
          (jobEventId && jobEventId !== 'standalone' && jobEventId === eventId) ||
          jobData.eventTitle === event?.title;
      });

      // Convert job queue entries to certificate-like objects
      const certificatesFromJobs = eventJobs
        .filter(job => job.result_data?.certificateNumber || job.result_data?.pdfUrl || job.result_data?.pngUrl)
        .map(job => {
          const jobData = job.job_data || {};
          const resultData = job.result_data || {};

          // Try to find the participant user_id by matching participant name
          // This will be matched later with participants
          return {
            id: `job_${job.id}`, // Unique ID for job-based certificates
            certificate_number: resultData.certificateNumber,
            participant_name: jobData.participantName || 'Unknown',
            event_title: jobData.eventTitle || event?.title || 'Event',
            generated_at: job.completed_at || job.created_at,
            // Store job data for matching
            _jobData: {
              jobId: job.id,
              userId: jobData.userId, // This might be organizer's ID, not participant's
              participantName: jobData.participantName,
              createdBy: job.created_by
            }
          };
        });

      return certificatesFromJobs;
    } catch (err) {
      console.error('Error loading job queue certificates:', err);
      return [];
    }
  };

  const loadJobQueueCertificatesFallback = async (eventId) => {
    try {
      // Fallback: Get jobs from current user (organizer) and participants
      if (!user?.id) return [];

      // Get current user's jobs
      const currentUserResult = await JobQueueService.getUserJobs(user.id, 'completed');
      let allJobs = currentUserResult.jobs || [];

      // Also try to get jobs from participants (if we have access)
      // Get participant IDs first
      const participantsResult = await EventService.getEventParticipants(eventId);
      if (participantsResult.participants) {
        const participantIds = participantsResult.participants
          .map(p => p.user_id || p.users?.id)
          .filter(Boolean);

        // Query jobs from each participant (in parallel, but limit to avoid too many requests)
        const participantJobPromises = participantIds.slice(0, 20).map(async (participantId) => {
          try {
            const result = await JobQueueService.getUserJobs(participantId, 'completed');
            return result.jobs || [];
          } catch (err) {
            console.warn(`Failed to load jobs for participant ${participantId}:`, err);
            return [];
          }
        });

        const participantJobsArrays = await Promise.all(participantJobPromises);
        const participantJobs = participantJobsArrays.flat();

        // Merge and deduplicate by job ID
        const existingJobIds = new Set(allJobs.map(j => j.id));
        const newJobs = participantJobs.filter(j => !existingJobIds.has(j.id));
        allJobs = [...allJobs, ...newJobs];
      }

      // Filter jobs that match this event
      const eventJobs = allJobs
        .filter(job => job.job_type === 'certificate_generation')
        .filter(job => {
          const jobData = job.job_data || {};
          const jobEventId = jobData.eventId;
          return jobEventId === eventId ||
            (jobEventId && jobEventId !== 'standalone' && jobEventId === eventId) ||
            jobData.eventTitle === event?.title;
        });

      // Convert to certificate-like objects
      return eventJobs
        .filter(job => job.result_data?.certificateNumber || job.result_data?.pdfUrl || job.result_data?.pngUrl)
        .map(job => {
          const jobData = job.job_data || {};
          const resultData = job.result_data || {};

          return {
            id: `job_${job.id}`,
            certificate_number: resultData.certificateNumber,
            participant_name: jobData.participantName || 'Unknown',
            event_title: jobData.eventTitle || event?.title || 'Event',
            generated_at: job.completed_at || job.created_at,
            _jobData: {
              jobId: job.id,
              userId: jobData.userId,
              participantName: jobData.participantName,
              createdBy: job.created_by
            }
          };
        });
    } catch (err) {
      console.error('Error loading job queue certificates (fallback):', err);
      return [];
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Create a map of certificates by user_id for quick lookup
  // Only use database certificates (not job queue entries)
  const certificatesMap = {};
  const databaseCerts = certificates.filter(cert => cert.id && !cert.id.startsWith('job_'));
  databaseCerts.forEach(cert => {
    // For database certificates, use user_id
    if (cert.user_id) {
      certificatesMap[cert.user_id] = cert;
    }
  });

  // Find certificates that don't match any participant (orphaned certificates)
  const participantIds = new Set(participants.map(p => p.user_id || p.users?.id).filter(Boolean));
  const orphanedCertificates = databaseCerts.filter(cert => {
    if (!cert.user_id) return false; // Skip certs without user_id
    return !participantIds.has(cert.user_id);
  });

  // Calculate statistics
  // Only count database certificates (not job queue entries)
  const totalParticipants = participants.length;
  const participantsWithCert = participants.filter(p => {
    const participantId = p.user_id || p.users?.id;
    // Only match against database certificates (those with user_id)
    return databaseCerts.some(cert => cert.user_id === participantId);
  }).length;
  const participantsWithoutCert = totalParticipants - participantsWithCert;

  // Total certificates - only count actual database certificates
  const totalCertificates = databaseCerts.length;

  // Prepare data for export
  const getExportData = () => {
    const exportData = [];

    // Add all participants with their certificate status
    participants.forEach((participant) => {
      const participantId = participant.user_id || participant.users?.id;
      const participantUser = participant.users || participant;
      const participantName = `${participantUser.first_name || ''} ${participantUser.last_name || ''}`.trim() || participantUser.email || 'Participant';
      const certificate = certificatesMap[participantId];

      exportData.push({
        'Participant Name': participantName,
        'Email': participantUser.email || '',
        'Status': certificate ? 'Generated' : 'Not Generated',
        'Certificate Number': certificate?.certificate_number || '',
        'Generation Date': certificate?.generated_at ? formatDate(certificate.generated_at) : '',
      });
    });

    // Add orphaned certificates (certificates without matching participants)
    orphanedCertificatesWithUsers.forEach((cert) => {
      const userName = cert.displayName || cert.participant_name || 'Unknown User';
      exportData.push({
        'Participant Name': userName,
        'Email': cert.user?.email || '',
        'Status': 'Generated (Not Registered)',
        'Certificate Number': cert.certificate_number || '',
        'Generation Date': cert.generated_at ? formatDate(cert.generated_at) : '',
      });
    });

    return exportData;
  };

  const handleExportCSV = () => {
    const eventTitle = event?.title || 'event';
    const sanitizedTitle = eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const exportData = getExportData();
    exportToCSV(exportData, `${sanitizedTitle}_certificates_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const eventTitle = event?.title || 'event';
    const sanitizedTitle = eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const exportData = getExportData();
    exportToExcel(exportData, `${sanitizedTitle}_certificates_${new Date().toISOString().split('T')[0]}`, 'Certificates');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Certificate Generations</h2>
            <p className="text-sm text-gray-600 mt-1">
              View certificate generation status for "{event?.title}"
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Export buttons */}
            {!loading && !error && certificates.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  title="Export to CSV"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  title="Export to Excel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading certificate generations...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
              <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Content when not loading */}
          {!loading && !error && (
            <>
              {/* Statistics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-1">Total Participants</p>
                  <p className="text-2xl font-bold text-blue-900">{totalParticipants}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-1">With Certificate</p>
                  <p className="text-2xl font-bold text-green-900">{participantsWithCert}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-sm font-medium text-orange-800 mb-1">Without Certificate</p>
                  <p className="text-2xl font-bold text-orange-900">{participantsWithoutCert}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm font-medium text-purple-800 mb-1">Total Certificates</p>
                  <p className="text-2xl font-bold text-purple-900">{totalCertificates}</p>
                  {orphanedCertificatesWithUsers.length > 0 && (
                    <p className="text-xs text-purple-600 mt-1">
                      {orphanedCertificatesWithUsers.length} not in participant list
                    </p>
                  )}
                </div>
              </div>

              {/* Participants List */}
              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No registered participants found for this event.</p>
                </div>
              ) : (
                /* Participants Table */
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Participant Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Certificate Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Generation Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {participants.map((participant) => {
                          const participantId = participant.user_id || participant.users?.id;
                          const participantUser = participant.users || participant;
                          const participantName = `${participantUser.first_name || ''} ${participantUser.last_name || ''}`.trim() || participantUser.email || 'Participant';
                          const nameKey = participantName ? `name_${participantName.toLowerCase().trim()}` : null;

                          // Find certificate by user_id
                          const certificate = certificatesMap[participantId];

                          const hasCertificate = !!certificate;

                          return (
                            <tr key={participantId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                {hasCertificate ? (
                                  <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                    <span className="text-sm text-green-700 font-medium">Generated</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <XCircle className="w-5 h-5 text-orange-500 mr-2" />
                                    <span className="text-sm text-orange-700 font-medium">Not Generated</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{participantName}</div>
                                {participantUser.email && (
                                  <div className="text-xs text-gray-500">{participantUser.email}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {hasCertificate ? (
                                  <span className="text-sm text-gray-900 font-mono">{certificate.certificate_number}</span>
                                ) : (
                                  <span className="text-sm text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {hasCertificate ? (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {formatDate(certificate.generated_at)}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Orphaned Certificates (certificates without matching participants) */}
                        {orphanedCertificatesWithUsers.map((cert) => {
                          const userName = cert.displayName || cert.participant_name || 'Unknown User';
                          const userEmail = cert.user?.email || '';

                          return (
                            <tr key={`orphaned_${cert.id}`} className="hover:bg-gray-50 transition-colors bg-yellow-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                  <span className="text-sm text-green-700 font-medium">Generated</span>
                                  <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                                    Not Registered
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{userName}</div>
                                {userEmail && (
                                  <div className="text-xs text-gray-500">{userEmail}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-gray-900 font-mono">{cert.certificate_number}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  {formatDate(cert.generated_at)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
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


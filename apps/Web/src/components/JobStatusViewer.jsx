import React, { useState, useEffect } from 'react';
import { JobQueueService } from '../services/jobQueueService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw, FileText } from 'lucide-react';

export const JobStatusViewer = ({ jobIds = [], autoRefresh = true, onJobComplete }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load jobs when component mounts or when user/jobIds change
  useEffect(() => {
    if (user?.id) {
      loadJobs();
    } else {
      // If no user, clear loading state immediately
      setLoading(false);
      setRefreshing(false);
      setJobs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, jobIds.length]); // Reload when user or jobIds count changes

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Only refresh if there are pending/processing jobs
      const hasActiveJobs = jobs.some(job => 
        job.status === 'pending' || job.status === 'processing'
      );
      if (hasActiveJobs) {
        loadJobs(true);
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [jobs, autoRefresh]);

  const loadJobs = async (silent = false) => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      let jobsData = [];

      if (jobIds.length > 0) {
        // Load specific jobs - handle errors gracefully for deleted jobs
        const jobPromises = jobIds.map(async (jobId) => {
          try {
            const result = await JobQueueService.getJobStatus(jobId);
            return result;
          } catch (err) {
            console.warn(`Failed to load job ${jobId}:`, err);
            return { error: err.message, job: null };
          }
        });
        
        const results = await Promise.allSettled(jobPromises);
        jobsData = results
          .map(result => {
            if (result.status === 'fulfilled' && result.value?.job) {
              return result.value.job;
            }
            return null;
          })
          .filter(job => job !== null)
          .map(job => ({
            ...job,
            jobData: job.job_data || {}
          }));
      } else {
        // Load all user jobs
        const result = await JobQueueService.getUserJobs(user.id);
        if (result.error) {
          console.error('Failed to load user jobs:', result.error);
          if (!silent) {
            toast.error(result.error);
          }
          // Set empty array instead of returning early
          jobsData = [];
        } else {
          jobsData = (result.jobs || [])
            .filter(job => job.job_type === 'certificate_generation')
            .map(job => ({
              ...job,
              jobData: job.job_data || {}
            }))
            .sort((a, b) => {
              // Sort by created_at, newest first
              return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            });
        }
      }

      setJobs(jobsData);

      // Check for completed jobs and notify
      if (onJobComplete) {
        jobsData.forEach(job => {
          if (job.status === 'completed') {
            onJobComplete(job);
          }
        });
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
      if (!silent) {
        toast.error('Failed to load job status');
      }
      // Ensure we set empty array on error
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      default:
        return status || 'Unknown';
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-slate-600">Loading job status...</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center p-8 text-slate-600">
        <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <p>No certificate generation jobs found.</p>
      </div>
    );
  }

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800">Job Status Summary</h3>
          <button
            onClick={() => loadJobs()}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{processingCount}</div>
            <div className="text-sm text-slate-600">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <div className="text-sm text-slate-600">Failed</div>
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="space-y-3">
        {jobs.map((job) => {
          const participantName = job.jobData?.participantName || 'Unknown';
          const eventTitle = job.jobData?.eventTitle || 'Event';
          const certificateNumber = job.result_data?.certificateNumber;

          return (
            <div
              key={job.id}
              className={`bg-white rounded-lg border-2 ${getStatusColor(job.status)} p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getStatusIcon(job.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{participantName}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </span>
                    </div>
                    <p className="text-sm opacity-80 mb-2">{eventTitle}</p>
                    {certificateNumber && (
                      <p className="text-xs opacity-70">Certificate: {certificateNumber}</p>
                    )}
                    {job.error_message && (
                      <p className="text-xs text-red-700 mt-1">Error: {job.error_message}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs opacity-70">
                      <span>Created: {formatDate(job.created_at)}</span>
                      {job.started_at && <span>Started: {formatDate(job.started_at)}</span>}
                      {job.completed_at && <span>Completed: {formatDate(job.completed_at)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


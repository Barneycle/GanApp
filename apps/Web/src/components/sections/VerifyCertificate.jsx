import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CertificateService } from '../../services/certificateService';
import { CircleCheck, CircleX, Calendar, User, Award, FileText } from 'lucide-react';
import { PageSkeleton } from '../loading/Skeleton';
import { toErrorCopy } from '../../utils/errorCopy';

export const VerifyCertificate = () => {
  const { certificateNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (certificateNumber) {
      verifyCertificate();
    } else {
      setError('Certificate number is missing');
      setLoading(false);
    }
  }, [certificateNumber]);

  const verifyCertificate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await CertificateService.verifyCertificate(certificateNumber);
      
      if (result.error) {
        setError(result.error);
      } else {
        setCertificate(result.certificate);
      }
    } catch (err) {
      setError('Failed to verify certificate. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <PageSkeleton variant="form" />
      </section>
    );
  }

  if (error) {
    const copy = toErrorCopy(error, 'verifyCertificate');
    return (
      <section className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
            <CircleX className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{copy.what}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{copy.why}</p>
          {certificateNumber ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="mb-1 text-sm text-slate-500">Certificate number</p>
              <p className="font-mono text-lg font-semibold text-slate-800">{certificateNumber}</p>
            </div>
          ) : null}
          <p className="mt-4 text-sm font-medium text-slate-800">{copy.action}</p>
        </div>
      </section>
    );
  }

  if (!certificate) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <PageSkeleton variant="form" />
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CircleCheck className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Certificate Verified</h1>
            <p className="text-green-600 font-semibold mb-4">This certificate is authentic and valid</p>
          </div>
        </div>

        {/* Certificate Details */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Award className="w-6 h-6 mr-2 text-blue-600" />
            Certificate Details
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Certificate Number */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <FileText className="w-5 h-5 text-slate-600 mr-2" />
                <label className="text-sm font-medium text-slate-600">Certificate Number</label>
              </div>
              <p className="font-mono text-lg font-semibold text-slate-800">{certificate.certificate_number}</p>
            </div>

            {/* Participant Name */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User className="w-5 h-5 text-slate-600 mr-2" />
                <label className="text-sm font-medium text-slate-600">Participant Name</label>
              </div>
              <p className="text-lg font-semibold text-slate-800">{certificate.participant_name}</p>
            </div>

            {/* Event Title */}
            <div className="bg-slate-50 rounded-lg p-4 md:col-span-2">
              <div className="flex items-center mb-2">
                <Award className="w-5 h-5 text-slate-600 mr-2" />
                <label className="text-sm font-medium text-slate-600">Event</label>
              </div>
              <p className="text-lg font-semibold text-slate-800">{certificate.event_title}</p>
            </div>

            {/* Completion Date */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-slate-600 mr-2" />
                <label className="text-sm font-medium text-slate-600">Completion Date</label>
              </div>
              <p className="text-lg text-slate-800">{formatDate(certificate.completion_date)}</p>
            </div>

            {/* Issue Date */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-slate-600 mr-2" />
                <label className="text-sm font-medium text-slate-600">Issued On</label>
              </div>
              <p className="text-lg text-slate-800">{formatDate(certificate.generated_at || certificate.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


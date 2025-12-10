import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CertificateService } from '../../services/certificateService';
import { CheckCircle, XCircle, Calendar, User, Award } from 'lucide-react';

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
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-2xl w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying certificate...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Certificate Not Found</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-500 mb-2">Certificate Number:</p>
              <p className="font-mono text-lg font-semibold text-slate-800">{certificateNumber}</p>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>This certificate may:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Not exist in our database</li>
                <li>Have been revoked or invalidated</li>
                <li>Have an incorrect certificate number</li>
              </ul>
            </div>
            <Link
              to="/"
              className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!certificate) {
    return null;
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-8 mb-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Certificate Verified</h1>
            <p className="text-green-600 font-semibold mb-4">This certificate is authentic and valid</p>
          </div>
        </div>

        {/* Certificate Details */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-6">
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

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-block text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
};


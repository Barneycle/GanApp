import React from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';

export const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning', loading = false }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const iconColors = {
    warning: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
    success: 'text-green-600',
  };

  const buttonColors = {
    warning: 'bg-blue-900 hover:bg-blue-800',
    danger: 'bg-red-600 hover:bg-red-700',
    info: 'bg-blue-900 hover:bg-blue-800',
    success: 'bg-blue-900 hover:bg-blue-800',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${iconColors[type]} bg-opacity-10`}>
              <AlertCircle className={`w-6 h-6 ${iconColors[type]}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              if (onConfirm && !loading) {
                onConfirm();
              }
            }}
            disabled={loading}
            className={`px-6 py-2.5 text-white rounded-lg font-medium transition-colors ${buttonColors[type]} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


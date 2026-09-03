import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CircleAlert } from 'lucide-react';
import { SmartSpinner } from './loading/SmartSpinner';
import { overlayEnter, panelEnter } from './motion/tokens';

export const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning', loading = false }) => {
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
    <AnimatePresence>
      {isOpen && (
    <motion.div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      {...overlayEnter}
    >
      <motion.div className="w-full max-w-md rounded-xl border border-slate-200 bg-white" {...panelEnter}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${iconColors[type]} bg-opacity-10`}>
              <CircleAlert className={`w-6 h-6 ${iconColors[type]}`} />
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
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
            className={`flex items-center gap-2 rounded-md px-6 py-2.5 font-medium text-white transition-colors ${buttonColors[type] || buttonColors.warning} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <SmartSpinner active={loading} variant="inline" light>
              {confirmText}
            </SmartSpinner>
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};


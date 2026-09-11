import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function RailIconButton({ label, onClick, children }) {
  const [showTip, setShowTip] = useState(false);
  const timerRef = useRef(null);

  const clearTipTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleEnter = () => {
    clearTipTimer();
    timerRef.current = setTimeout(() => setShowTip(true), 700);
  };

  const handleLeave = () => {
    clearTipTimer();
    setShowTip(false);
  };

  useEffect(() => () => clearTipTimer(), []);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <motion.button
        type="button"
        onClick={(event) => {
          clearTipTimer();
          setShowTip(false);
          onClick?.(event);
        }}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-900"
        aria-label={label}
      >
        {children}
      </motion.button>
      {showTip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-30 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
        >
          {label}
        </span>
      )}
    </div>
  );
}

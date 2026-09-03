import { useEffect, useState } from 'react';
import { useSpinnerPhase } from '../../hooks/useSpinnerPhase';

const DEFAULT_MESSAGES = [
  'Still working on it',
  'This is taking a bit longer',
  'Almost there',
  'Hang tight',
];

const SpinnerMark = ({ size = 'md', light = false }) => {
  const dim = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-8 w-8 border-[3px]' : 'h-6 w-6 border-2';
  const color = light ? 'border-white/30 border-t-white' : 'border-blue-200 border-t-blue-600';
  return (
    <span
      className={`inline-block ${dim} animate-spin rounded-full ${color}`}
      aria-hidden="true"
    />
  );
};

export const SmartSpinner = ({
  active = false,
  variant = 'block',
  label = 'This is taking a moment',
  messages = DEFAULT_MESSAGES,
  children = null,
  className = '',
  light = false,
}) => {
  const phase = useSpinnerPhase(active);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (phase !== 'changing') {
      setMessageIndex(0);
      return undefined;
    }
    const id = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % messages.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [phase, messages.length]);

  if (!active || phase === 'idle' || phase === 'hidden') {
    return children || null;
  }

  const text = phase === 'changing' ? messages[messageIndex] : label;
  const showText = phase === 'static' || phase === 'changing';
  const size = variant === 'inline' ? 'sm' : 'md';
  const textClass = light ? 'text-white/80' : 'text-slate-500';

  if (variant === 'inline') {
    return (
      <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 ${className}`}>
        <SpinnerMark size={size} light={light} />
        {showText && <span className={`text-[13px] ${textClass}`}>{text}</span>}
      </span>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[2px] ${className}`}>
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
          <SpinnerMark size="md" light={light} />
          {showText && <p className={`text-[13px] ${textClass}`}>{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}>
      <SpinnerMark size="lg" light={light} />
      {showText && <p className={`text-[13px] ${textClass}`}>{text}</p>}
    </div>
  );
};

export const SpinnerMarkExport = SpinnerMark;

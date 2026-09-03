import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CircleCheck, CircleAlert, Info, AlertTriangle } from 'lucide-react';
import { toastEnter } from './motion/tokens';
import { ConfirmationDialog } from './ConfirmationDialog';
import { StatusDialog } from './StatusDialog';
import { formatErrorCopy, isErrorCopy, modalButtonCopy, toErrorCopy } from '../utils/errorCopy';

const ToastContext = React.createContext(null);

const DURATIONS = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 8000,
};

const MAX_TOASTS = 4;

let toastApi = null;
let confirmApi = null;
let statusApi = null;

export const notify = (type, message, duration) => {
  if (!message || !toastApi) return;
  const fn = toastApi[type] || toastApi.info;
  return fn(message, duration);
};

export const confirmDialog = (options) => {
  if (!confirmApi) return Promise.resolve(false);
  return confirmApi(options);
};

export const statusDialog = (options) => {
  if (!statusApi) return Promise.resolve(false);
  return statusApi(options);
};

export const statusError = (raw, context = 'generic', options = {}) => {
  const copy = toErrorCopy(raw, context);
  const defaults = modalButtonCopy(copy, context);
  const { confirmText, secondaryText, ...rest } = options;
  return statusDialog({
    type: 'error',
    title: copy.what,
    message: copy.why,
    action: copy.action,
    confirmText: confirmText || defaults.confirmText,
    secondaryText: secondaryText === undefined ? defaults.secondaryText : secondaryText,
    ...rest,
  });
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

export const useConfirm = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ToastProvider');
  }
  return context.confirm;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [statusState, setStatusState] = useState(null);
  const timersRef = useRef(new Map());
  const pausedRef = useRef(false);

  const clearTimer = (id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  const removeToast = useCallback((id) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback((id, duration) => {
    clearTimer(id);
    if (!duration || duration <= 0 || pausedRef.current) return;
    const timer = setTimeout(() => removeToast(id), duration);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  const showToast = useCallback((message, type = 'info', duration) => {
    if (!message) return;
    const copy = type === 'error' ? toErrorCopy(message) : null;
    const text = copy ? formatErrorCopy(copy) : (isErrorCopy(message) ? formatErrorCopy(message) : String(message));
    const wait = duration ?? DURATIONS[type] ?? DURATIONS.info;
    const id = Date.now() + Math.random();

    setToasts((prev) => {
      prev
        .filter((item) => item.message === text && item.type === type)
        .forEach((item) => clearTimer(item.id));
      const next = prev.filter((item) => !(item.message === text && item.type === type));
      return [...next, { id, message: text, copy, type, duration: wait }].slice(-MAX_TOASTS);
    });

    scheduleDismiss(id, wait);
    return id;
  }, [scheduleDismiss]);

  const toast = React.useMemo(() => ({
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    info: (message, duration) => showToast(message, 'info', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
  }), [showToast]);

  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const pauseTimers = () => {
    pausedRef.current = true;
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  };

  const resumeTimers = () => {
    pausedRef.current = false;
    toastsRef.current.forEach((item) => scheduleDismiss(item.id, item.duration));
  };

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        resolve,
      });
    });
  }, []);

  const closeConfirm = (value) => {
    setConfirmState((current) => {
      current?.resolve(Boolean(value));
      return null;
    });
  };

  const showStatus = useCallback((options) => {
    return new Promise((resolve) => {
      setStatusState({
        title: options.title || 'Done',
        message: options.message || '',
        action: options.action || '',
        confirmText: options.confirmText || 'Got it',
        secondaryText: options.secondaryText || '',
        type: options.type || 'success',
        resolve,
      });
    });
  }, []);

  const closeStatus = (confirmed = false) => {
    setStatusState((current) => {
      current?.resolve(Boolean(confirmed));
      return null;
    });
  };

  useEffect(() => {
    toastApi = toast;
    confirmApi = confirm;
    statusApi = showStatus;
    return () => {
      toastApi = null;
      confirmApi = null;
      statusApi = null;
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [toast, confirm, showStatus]);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      <ToastContainer
        toasts={toasts}
        removeToast={removeToast}
        onPause={pauseTimers}
        onResume={resumeTimers}
      />
      <ConfirmationDialog
        isOpen={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        cancelText={confirmState?.cancelText}
        type={confirmState?.type}
        onClose={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
      />
      <StatusDialog
        isOpen={Boolean(statusState)}
        title={statusState?.title}
        message={statusState?.message}
        action={statusState?.action}
        confirmText={statusState?.confirmText}
        secondaryText={statusState?.secondaryText}
        type={statusState?.type}
        onClose={() => closeStatus(false)}
        onConfirm={() => closeStatus(true)}
      />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast, onPause, onResume }) => {
  const isMobile = typeof document !== 'undefined' && document.body.classList.contains('mobile-certificate-view');

  return (
    <div
      className="fixed right-4 z-[9999] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      style={{ top: isMobile ? 'calc(env(safe-area-inset-top) + 1rem)' : '1rem' }}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
    >
      <AnimatePresence>
        {toasts.map((item) => (
          <Toast key={item.id} toast={item} onClose={() => removeToast(item.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const styles = {
    success: 'border-green-200 bg-white text-green-800',
    error: 'border-red-200 bg-white text-red-800',
    warning: 'border-amber-200 bg-white text-amber-800',
    info: 'border-blue-200 bg-white text-blue-800',
  };

  const icons = {
    success: <CircleCheck className="h-5 w-5 text-green-600" />,
    error: <CircleAlert className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  };

  return (
    <motion.div
      layout
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      {...toastEnter}
      className={`flex items-start gap-3 rounded-xl border p-3.5 ${styles[toast.type] || styles.info}`}
    >
      <div className="mt-0.5 shrink-0">{icons[toast.type] || icons.info}</div>
      {toast.copy ? (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-slate-900">{toast.copy.what}</p>
          {toast.copy.why ? <p className="mt-0.5 text-xs leading-snug text-slate-600">{toast.copy.why}</p> : null}
          {toast.copy.action ? <p className="mt-1 text-xs font-medium leading-snug text-slate-800">{toast.copy.action}</p> : null}
        </div>
      ) : (
        <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

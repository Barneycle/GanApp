import { CircleAlert, CircleCheck, Info, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  warning: AlertTriangle,
  info: Info,
};

const ICON_WRAP = {
  success: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
};

export const StatusDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Done',
  message = '',
  action = '',
  confirmText = 'Got it',
  secondaryText = '',
  type = 'success',
}) => {
  const Icon = ICONS[type] || ICONS.success;
  const confirm = onConfirm || onClose;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={10000}
      role="alertdialog"
      labelledBy="status-dialog-title"
      panelClassName="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center"
    >
            <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${ICON_WRAP[type] || ICON_WRAP.success}`}>
              <Icon className="h-7 w-7" />
            </div>
            <h3 id="status-dialog-title" className="text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
            {message ? (
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{message}</p>
            ) : null}
            {action ? (
              <p className="mt-3 text-sm font-medium text-slate-800">{action}</p>
            ) : null}
            <button
              type="button"
              onClick={confirm}
              className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800"
            >
              {confirmText}
            </button>
            {secondaryText ? (
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-slate-300 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {secondaryText}
              </button>
            ) : null}
    </Modal>
  );
};

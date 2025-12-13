import { SweetAlertRef } from '../components/SweetAlertProvider';

let sweetAlertRef: React.RefObject<SweetAlertRef> | null = null;

export const setSweetAlertRef = (ref: React.RefObject<SweetAlertRef>) => {
  sweetAlertRef = ref;
};

export const showAlert = (
  title: string,
  message?: string,
  type: 'success' | 'error' | 'warning' | 'info' | 'question' = 'info',
  options?: {
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmButtonColor?: string;
    cancelButtonColor?: string;
  }
) => {
  if (sweetAlertRef?.current) {
    sweetAlertRef.current.show({
      title,
      message,
      type,
      confirmText: options?.confirmText || 'OK',
      cancelText: options?.cancelText || 'Cancel',
      showCancel: options?.showCancel || false,
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel,
      confirmButtonColor: options?.confirmButtonColor,
      cancelButtonColor: options?.cancelButtonColor,
    });
  }
};

// Convenience methods
export const showSuccess = (title: string, message?: string, onConfirm?: () => void) => {
  showAlert(title, message, 'success', { onConfirm });
};

export const showError = (title: string, message?: string, onConfirm?: () => void) => {
  showAlert(title, message, 'error', { onConfirm });
};

export const showWarning = (title: string, message?: string, onConfirm?: () => void) => {
  showAlert(title, message, 'warning', { onConfirm });
};

export const showInfo = (title: string, message?: string, onConfirm?: () => void) => {
  showAlert(title, message, 'info', { onConfirm });
};

export const showConfirm = (
  title: string,
  message?: string,
  onConfirm?: () => void,
  onCancel?: () => void
) => {
  showAlert(title, message, 'question', {
    showCancel: true,
    confirmText: 'Yes',
    cancelText: 'No',
    onConfirm,
    onCancel,
  });
};


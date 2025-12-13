import React from 'react';
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
    autoClose?: boolean;
    autoCloseDelay?: number;
  }
) => {
  console.log('SweetAlert: showAlert called', { title, message, type, hasRef: !!sweetAlertRef, hasCurrent: !!sweetAlertRef?.current });
  
  if (!sweetAlertRef) {
    console.error('SweetAlert: Ref not set. Make sure SweetAlertProvider is mounted in your app root.');
    return;
  }
  
  if (!sweetAlertRef.current) {
    console.warn('SweetAlert: Ref current is null. The provider may not be initialized yet. Retrying...');
    // Try again after a short delay
    setTimeout(() => {
      if (sweetAlertRef?.current) {
        console.log('SweetAlert: Retry successful, showing alert');
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
          autoClose: options?.autoClose,
          autoCloseDelay: options?.autoCloseDelay,
        });
      } else {
        console.error('SweetAlert: Failed to show alert - ref is still null after retry');
      }
    }, 100);
    return;
  }

  console.log('SweetAlert: Calling show method on ref');
  try {
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
      autoClose: options?.autoClose,
      autoCloseDelay: options?.autoCloseDelay,
    });
    console.log('SweetAlert: Show method called successfully');
  } catch (error) {
    console.error('SweetAlert: Error calling show method', error);
  }
};

// Convenience methods
export const showSuccess = (title: string, message?: string, onConfirm?: () => void, autoClose: boolean = true, autoCloseDelay: number = 3000) => {
  showAlert(title, message, 'success', { 
    onConfirm, 
    autoClose, 
    autoCloseDelay 
  });
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


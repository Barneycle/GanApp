import { confirmDialog, statusDialog } from '../components/Toast';

export const promptCertificateUsage = async () => {
  return confirmDialog({
    title: 'Will this event use certificates?',
    message: 'Choose Yes to design a certificate template, or No to create a survey or evaluation instead.',
    confirmText: 'Yes',
    cancelText: 'No',
    type: 'info',
  });
};

export const showEventCreationSuccess = async (onConfirm) => {
  await statusDialog({
    title: 'Event created',
    message: 'Your event is ready. You can keep editing it from your organizer home.',
  });
  if (onConfirm) onConfirm();
};

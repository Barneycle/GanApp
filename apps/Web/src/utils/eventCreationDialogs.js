import Swal from 'sweetalert2';

/**
 * Prompts the user to decide if the event will use certificates
 * @returns {Promise<boolean>} Returns true if user confirms (wants to design certificate), false if wants to create survey
 */
export const promptCertificateUsage = async () => {
  const result = await Swal.fire({
    title: 'Will this event use certificates?',
    html: `
      <div style="text-align: left; padding: 10px 0;">
        <p style="margin-bottom: 10px;">Click <strong>"Yes"</strong> to design a certificate template.</p>
        <p>Click <strong>"No"</strong> to create a survey/evaluation instead.</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    confirmButtonColor: '#1e40af',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
  });

  return result.isConfirmed;
};

/**
 * Shows a success alert after event creation
 * @param {Function} onConfirm - Callback function to execute when user clicks OK
 */
export const showEventCreationSuccess = (onConfirm) => {
  Swal.fire({
    title: 'Success!',
    text: 'Event created successfully!',
    icon: 'success',
    confirmButtonText: 'OK',
    confirmButtonColor: '#1e40af',
  }).then(() => {
    if (onConfirm) {
      onConfirm();
    }
  });
};


import toast from 'react-hot-toast';

/**
 * Show success toast message
 */
export const showSuccess = (message: string) => {
  return toast.success(message, {
    duration: 4000,
    position: 'top-right',
  });
};

/**
 * Show error toast message
 */
export const showError = (message: string) => {
  return toast.error(message, {
    duration: 5000,
    position: 'top-right',
  });
};

/**
 * Show loading toast message
 */
export const showLoading = (message: string = 'Loading...') => {
  return toast.loading(message, {
    position: 'top-right',
  });
};

/**
 * Show info toast message
 */
export const showInfo = (message: string) => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: 'ℹ️',
  });
};

/**
 * Dismiss a specific toast
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Promise toast - automatically shows loading, then success/error
 */
export const promiseToast = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      position: 'top-right',
    }
  );
};


import 'vue3-toastify/dist/index.css';
import { toast, type ToastContainerOptions, type ToastPosition, type ToastType } from 'vue3-toastify';

export function useNotification() {

  const notify = (
    message: string,
    type: ToastType = 'success',
    position: ToastPosition = "top-right",
    autoClose: number = 3000
  ) => {

    const options = {
      type,
      position,
      autoClose,
      newestOnTop: true,
    } as ToastContainerOptions;

    toast(message, options);
  }

  return { notify }
}

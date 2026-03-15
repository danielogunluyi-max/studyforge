type ToastType = 'success' | 'error' | 'info' | 'achievement';

interface ToastEvent {
  message: string;
  type: ToastType;
  emoji?: string;
}

type Listener = (event: ToastEvent) => void;

const listeners: Listener[] = [];

function emit(event: ToastEvent) {
  listeners.forEach((fn) => fn(event));
}

export function onToast(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export const toast = {
  success: (message: string) => emit({ message, type: 'success' }),
  error: (message: string) => emit({ message, type: 'error' }),
  info: (message: string) => emit({ message, type: 'info' }),
  achievement: (title: string, emoji = '🏆') => emit({ message: title, type: 'achievement', emoji }),
};

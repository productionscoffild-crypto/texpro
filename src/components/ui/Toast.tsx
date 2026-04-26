import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { IconCheck, IconClose, IconAlert } from './Icon';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: string; msg: string; type: ToastType; }

interface Ctx { toast: (msg: string, type?: ToastType) => void; }
const ToastCtx = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const remove = (id: string) => setToasts(p => p.filter(t => t.id !== id));

  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-600',
    error:   'bg-red-500',
    info:    'bg-blue-600',
  };
  const Icon: Record<ToastType, React.FC<{ size?: number }>> = {
    success: IconCheck,
    error:   IconAlert,
    info:    IconAlert,
  };

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-[320px] w-full" aria-live="polite">
        {toasts.map(t => {
          const Ic = Icon[t.type];
          return (
            <div key={t.id} className={`${colors[t.type]} text-white rounded-2xl px-4 py-3 flex items-start gap-3 shadow-lg anim-toast`}>
              <Ic size={16} />
              <p className="text-sm font-medium flex-1 leading-snug">{t.msg}</p>
              <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100 shrink-0 mt-px">
                <IconClose size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

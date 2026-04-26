import { ReactNode, useEffect } from 'react';
import { IconClose } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({ open, onClose, title, size = 'md', children, footer }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box ${size === 'lg' ? 'modal-box-lg' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-[17px] font-bold text-gray-900">{title}</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Закрыть">
              <IconClose size={16} />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 pb-5 pt-2 border-t border-slate-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

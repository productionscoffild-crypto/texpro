import { Invoice } from '../../types';
import { useAppStore } from '../../store';
import { t } from '../../i18n';

export const INVOICE_STATUSES: { value: Invoice['status']; label: string; short: string; className: string }[] = [
  { value: 'draft', label: 'Черновик', short: 'Черновик', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  { value: 'processing', label: 'В обработке', short: 'В работе', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { value: 'paid', label: 'Оплачено', short: 'Оплачено', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { value: 'shipped', label: 'Отгружено', short: 'Отгружено', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  { value: 'cancelled', label: 'Отменено', short: 'Отменено', className: 'bg-red-50 text-red-700 ring-red-200' },
];

export const statusLabel = (status: Invoice['status']) =>
  INVOICE_STATUSES.find(s => s.value === status)?.label ?? status;

const statusKey = (status: Invoice['status']) => status;

export function StatusBadge({ status }: { status: Invoice['status'] }) {
  const { language } = useAppStore();
  const cfg = INVOICE_STATUSES.find(s => s.value === status) ?? INVOICE_STATUSES[0];
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ring-1 ${cfg.className}`}>{t(language, statusKey(status))}</span>;
}

export function StatusStepper({ value, onChange }: { value: Invoice['status']; onChange: (status: Invoice['status']) => void }) {
  const { language } = useAppStore();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {INVOICE_STATUSES.map((s, idx) => {
        const active = value === s.value;
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={`relative rounded-2xl px-3 py-3 text-left ring-1 transition-colors ${active ? `${s.className} shadow-sm` : 'bg-white text-gray-500 ring-slate-200 hover:bg-slate-50'}`}
          >
            <span className="block text-[10px] font-normal opacity-60">{t(language, 'step')} {idx + 1}</span>
            <span className="mt-1 block text-[13px] font-semibold leading-none">{t(language, statusKey(s.value))}</span>
          </button>
        );
      })}
    </div>
  );
}
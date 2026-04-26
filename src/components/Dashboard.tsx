import { useAppStore } from '../store';
import { IconChevronR } from './ui/Icon';
import { StatusBadge } from './ui/Status';
import { t } from '../i18n';

const money = (n: number, digits = 2) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export default function Dashboard() {
  const { myInvoices, navigate, currentUser, language } = useAppStore();
  const allInvoices = myInvoices();
  const invoices = allInvoices.slice(0, 5);
  const user = currentUser();
  const totalUsd = allInvoices.reduce((s, i) => s + i.totalUsd, 0);
  const totalRub = allInvoices.reduce((s, i) => s + i.totalRub, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto anim-fade-up">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">{t(language, 'dashboard')}</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">{t(language, 'hello')}, {user?.name || ''}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-[11px] font-semibold text-gray-400">{t(language, 'invoiceCount')}</p>
          <p className="text-[26px] font-bold text-gray-900 mt-3">{allInvoices.length}</p>
          <p className="text-[12px] text-gray-400 mt-1">{t(language, 'totalCreated')}</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold text-gray-400">{t(language, 'salesUsd')}</p>
          <p className="text-[26px] font-bold text-gray-900 text-money mt-3">${money(totalUsd)}</p>
          <p className="text-[12px] text-gray-400 mt-1">{t(language, 'byInvoices')}</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold text-gray-400">{t(language, 'salesRub')}</p>
          <p className="text-[26px] font-bold text-blue-600 text-money mt-3">{money(totalRub)} ₽</p>
          <p className="text-[12px] text-gray-400 mt-1">{t(language, 'byRates')}</p>
        </div>
      </div>

      {invoices.length > 0 && <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-gray-900">{t(language, 'recentInvoices')}</h2>
          <button onClick={() => navigate('invoices')} className="btn btn-ghost btn-sm text-blue-600 hover:bg-blue-50">
            {t(language, 'all')} <IconChevronR size={14} />
          </button>
        </div>

          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid bg-slate-50 border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-gray-500" style={{ gridTemplateColumns: '150px 220px 120px 140px 110px 120px' }}>
                <div>{t(language, 'number')}</div><div>{t(language, 'client')}</div><div>USD</div><div>RUB</div><div>{t(language, 'rate')}</div><div>{t(language, 'status')}</div>
              </div>
              {invoices.map(inv => (
                <div key={inv.id} onClick={() => navigate('invoice-detail', inv.id)} className="grid items-center px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer text-[14px]" style={{ gridTemplateColumns: '150px 220px 120px 140px 110px 120px' }}>
                  <div className="font-semibold text-blue-600 truncate pr-3">{inv.number}</div>
                  <div className="font-medium text-gray-800 truncate pr-3">{inv.clientName}</div>
                  <div className="text-money font-semibold">${money(inv.totalUsd)}</div>
                  <div className="text-money text-gray-600">{money(inv.totalRub)} ₽</div>
                  <div className="text-money text-gray-500">{money(inv.usdRate)} ₽</div>
                  <div className="whitespace-nowrap"><StatusBadge status={inv.status} /></div>
                </div>
              ))}
            </div>
          </div>
      </div>}
    </div>
  );
}
import { useAppStore } from '../store';
import { IconChevronR } from './ui/Icon';
import { StatusBadge } from './ui/Status';

const money = (n: number, digits = 2) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export default function Dashboard() {
  const { myInvoices, navigate, currentUser } = useAppStore();
  const allInvoices = myInvoices();
  const invoices = allInvoices.slice(0, 5);
  const user = currentUser();
  const totalUsd = allInvoices.reduce((s, i) => s + i.totalUsd, 0);
  const totalRub = allInvoices.reduce((s, i) => s + i.totalRub, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto anim-fade-up">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">Главная</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">Добро пожаловать, {user?.name || 'пользователь'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-[11px] font-semibold text-gray-400">Накладные</p>
          <p className="text-[26px] font-bold text-gray-900 mt-3">{allInvoices.length}</p>
          <p className="text-[12px] text-gray-400 mt-1">создано всего</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold text-gray-400">Продажи USD</p>
          <p className="text-[26px] font-bold text-gray-900 text-money mt-3">${money(totalUsd)}</p>
          <p className="text-[12px] text-gray-400 mt-1">сумма по накладным</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold text-gray-400">Продажи RUB</p>
          <p className="text-[26px] font-bold text-blue-600 text-money mt-3">{money(totalRub)} ₽</p>
          <p className="text-[12px] text-gray-400 mt-1">по введённым курсам</p>
        </div>
      </div>

      {invoices.length > 0 && <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-gray-900">Последние накладные</h2>
          <button onClick={() => navigate('invoices')} className="btn btn-ghost btn-sm text-blue-600 hover:bg-blue-50">
            Все <IconChevronR size={14} />
          </button>
        </div>

          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid bg-slate-50 border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-gray-500" style={{ gridTemplateColumns: '150px 220px 120px 140px 110px 120px' }}>
                <div>Номер</div><div>Клиент</div><div>USD</div><div>RUB</div><div>Курс</div><div>Статус</div>
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
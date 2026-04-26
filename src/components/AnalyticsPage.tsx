import { useAppStore } from '../store';
import { IconChart, IconDollar, IconInvoice, IconPackage, IconCheck, IconTrend, IconFileText } from './ui/Icon';
import { exportAnalyticsExcel } from '../utils/excel';
import { useState } from 'react';
import { t } from '../i18n';

const fmt = (n: number, d = 2) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

function Card({ label, value, sub, children }: { label: string; value: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">{children}</div>
        <span className="text-[11px] font-semibold text-gray-400">{label}</span>
      </div>
      <p className="text-[24px] font-bold text-gray-900 text-money mt-4 leading-none">{value}</p>
      <p className="text-[12px] text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { myInvoices, myProducts, users, language } = useAppStore();
  const invoices = myInvoices();
  const products = myProducts();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const totalUsd = invoices.reduce((s, i) => s + i.totalUsd, 0);
  const totalRub = invoices.reduce((s, i) => s + i.totalRub, 0);
  const paidUsd = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalUsd, 0);
  const totalKg = invoices.reduce((s, i) => s + i.lines.reduce((x, l) => x + l.quantityKg, 0), 0);
  const avgRate = invoices.length ? invoices.reduce((s, i) => s + i.usdRate, 0) / invoices.length : 0;

  const productRows = products.map(p => {
    let kg = 0;
    let usd = 0;
    let rub = 0;
    invoices.forEach(inv => inv.lines.forEach(l => {
      if (l.productId === p.id) {
        kg += l.quantityKg;
        usd += l.lineTotalUsd;
        rub += l.lineTotalUsd * inv.usdRate;
      }
    }));
    return { name: p.name, kg, usd, rub, share: totalUsd ? (usd / totalUsd) * 100 : 0 };
  }).filter(r => r.kg > 0).sort((a, b) => b.usd - a.usd);

  const monthInvoices = invoices.filter(invoice => invoice.createdAt.slice(0, 7) === month);
  const managerRows = users.map(user => {
    const userInvoices = monthInvoices.filter(invoice => invoice.userId === user.id);
    return {
      name: user.name,
      invoices: userInvoices.length,
      kg: userInvoices.reduce((sum, invoice) => sum + invoice.lines.reduce((lineSum, line) => lineSum + line.quantityKg, 0), 0),
      usd: userInvoices.reduce((sum, invoice) => sum + invoice.totalUsd, 0),
      rub: userInvoices.reduce((sum, invoice) => sum + invoice.totalRub, 0),
    };
  }).filter(row => row.invoices > 0).sort((a, b) => b.rub - a.rub);

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const clientRows = Array.from(
    invoices.reduce((map, invoice) => {
      const key = invoice.clientName || 'Без клиента';
      const prev = map.get(key) || { name: key, invoices: 0, usd: 0, rub: 0 };
      prev.invoices += 1;
      prev.usd += invoice.totalUsd;
      prev.rub += invoice.totalRub;
      map.set(key, prev);
      return map;
    }, new Map<string, { name: string; invoices: number; usd: number; rub: number }>()).values()
  ).sort((a, b) => b.rub - a.rub).slice(0, 5);

  const cards = [
    { label: t(language, 'invoiceCount'), value: String(invoices.length), sub: t(language, 'totalCreated'), icon: <IconInvoice size={21} /> },
    { label: t(language, 'salesUsd'), value: `$${fmt(totalUsd)}`, sub: t(language, 'byInvoices'), icon: <IconDollar size={21} /> },
    { label: t(language, 'salesRub'), value: `${fmt(totalRub)} ₽`, sub: t(language, 'byRates'), icon: <IconChart size={21} /> },
    { label: t(language, 'paid'), value: `$${fmt(paidUsd)}`, sub: t(language, 'paid'), icon: <IconCheck size={21} /> },
    { label: t(language, 'kg'), value: `${fmt(totalKg, 3)} кг`, sub: t(language, 'totalWeight'), icon: <IconPackage size={21} /> },
    { label: t(language, 'avgRate'), value: avgRate ? `${fmt(avgRate)} ₽` : '0 ₽', sub: t(language, 'avgRateSub'), icon: <IconDollar size={21} /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto anim-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">{t(language, 'analytics')}</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">{t(language, 'analyticsSubtitle')}</p>
        </div>
        <button
          className="btn bg-[#217346] text-white hover:bg-[#1b5f39]"
          onClick={() => exportAnalyticsExcel({ invoices, products, users, productRows, managerRows, monthLabel })}
          disabled={invoices.length === 0}
        >
          {t(language, 'excelReport')}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 pr-4 scroll-smooth sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 sm:overflow-visible sm:pr-0">
  {cards.map(c => (
    <div key={c.label} className="w-[220px] shrink-0 snap-start sm:w-auto sm:shrink">
      <Card label={c.label} value={c.value} sub={c.sub}>{c.icon}</Card>
    </div>
  ))}
</div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">{t(language, 'managerSales')}</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">{t(language, 'monthMetrics')}</p>
          </div>
          <input className="input max-w-[180px]" type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        {managerRows.length === 0 ? (
          <div className="py-12 text-center text-gray-400">{t(language, 'noManagerSales')}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid bg-slate-50 border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-gray-500" style={{ gridTemplateColumns: '240px 120px 140px 130px 150px' }}>
                <div>{t(language, 'manager')}</div><div>{t(language, 'invoices')}</div><div>{t(language, 'kg')}</div><div>USD</div><div>RUB</div>
              </div>
              {managerRows.map(row => (
                <div key={row.name} className="grid items-center px-4 py-3 border-b border-slate-100 last:border-b-0 text-[14px]" style={{ gridTemplateColumns: '240px 120px 140px 130px 150px' }}>
                  <div className="font-semibold truncate pr-3">{row.name}</div>
                  <div>{row.invoices}</div>
                  <div>{fmt(row.kg, 3)} кг</div>
                  <div className="font-semibold">${fmt(row.usd)}</div>
                  <div className="font-semibold text-blue-600">{fmt(row.rub)} ₽</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden min-h-[158px]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-emerald-600"><IconTrend size={18} /></span>
            <h2 className="text-[16px] font-bold text-gray-900">{t(language, 'topProducts')}</h2>
          </div>
          {productRows.length === 0 ? (
            <div className="py-12 text-center text-gray-400">{t(language, 'noSalesData')}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {productRows.slice(0, 5).map((row, index) => (
                <div key={row.name} className="grid items-center px-5 py-3 text-[14px]" style={{ gridTemplateColumns: '32px 1fr 120px' }}>
                  <div className="text-gray-400">{index + 1}</div>
                  <div className="font-semibold text-gray-900 truncate pr-3">{row.name}</div>
                  <div className="text-right font-semibold text-blue-600">{fmt(row.rub)} ₽</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden min-h-[158px]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-blue-600"><IconFileText size={18} /></span>
            <h2 className="text-[16px] font-bold text-gray-900">{t(language, 'topClients')}</h2>
          </div>
          {clientRows.length === 0 ? (
            <div className="py-12 text-center text-gray-400">{t(language, 'noClientData')}</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clientRows.map((row, index) => (
                <div key={row.name} className="grid items-center px-5 py-3 text-[14px]" style={{ gridTemplateColumns: '32px 1fr 120px' }}>
                  <div className="text-gray-400">{index + 1}</div>
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-gray-900 truncate">{row.name}</p>
                    <p className="text-[12px] text-gray-400">{row.invoices} накл.</p>
                  </div>
                  <div className="text-right font-semibold text-blue-600">{fmt(row.rub)} ₽</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useAppStore } from '../store';
import { InvoiceLine } from '../types';
import { useToast } from './ui/Toast';
import { IconPlus, IconTrash, IconArrowBack, IconAlert } from './ui/Icon';

const uid = () => Math.random().toString(36).slice(2, 11);
const fmt2 = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtRub = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface LineForm {
  id: string;
  productId: string;
  quantityKg: string;
  priceUsd: string;
}

const emptyLine = (): LineForm => ({
  id: uid(), productId: '', quantityKg: '', priceUsd: '',
});

export default function InvoiceNewPage() {
  const { navigate, myProducts, createInvoice } = useAppStore();
  const { toast } = useToast();
  const products = myProducts();

  const [clientName, setClientName] = useState('');
  const [clientInfo, setClientInfo] = useState('');
  const [usdRate, setUsdRate] = useState('90');
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill price when product changes
  const updateLine = (id: string, field: keyof LineForm, val: string) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: val };
      if (field === 'productId' && val) {
        const prod = products.find(p => p.id === val);
        if (prod) updated.priceUsd = String(prod.priceUsd);
      }
      return updated;
    }));
    setErrors(p => ({ ...p, [id + '_' + field]: '' }));
  };

  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (id: string) => {
    if (lines.length === 1) return;
    setLines(p => p.filter(l => l.id !== id));
  };

  // Totals
  const rate = parseFloat(usdRate) || 0;
  const computedLines = lines.map(l => {
    const qty  = parseFloat(l.quantityKg) || 0;
    const price = parseFloat(l.priceUsd) || 0;
    const total = qty * price;
    return { ...l, qty, price, total, totalRub: total * rate };
  });
  const totalUsd = computedLines.reduce((s, l) => s + l.total, 0);
  const totalRub = totalUsd * rate;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!clientName.trim()) e.clientName = 'Введите имя клиента';
    const r = parseFloat(usdRate);
    if (!usdRate || isNaN(r) || r <= 0) e.usdRate = 'Укажите корректный курс';

    lines.forEach(l => {
      if (!l.productId) e[l.id + '_productId'] = '!';
      const qty = parseFloat(l.quantityKg);
      if (!l.quantityKg || isNaN(qty) || qty <= 0) e[l.id + '_quantityKg'] = '!';
      const price = parseFloat(l.priceUsd);
      if (!l.priceUsd || isNaN(price) || price <= 0) e[l.id + '_priceUsd'] = '!';
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast('Заполните все обязательные поля', 'error');
      return;
    }

    const invLines: InvoiceLine[] = lines.map(l => {
      const prod = products.find(p => p.id === l.productId)!;
      const qty  = parseFloat(l.quantityKg);
      const price = parseFloat(l.priceUsd);
      return {
        id: uid(),
        productId: prod.id,
        productName: prod.name,
        productComposition: prod.composition || '',
        productDensity: prod.density,
        quantityKg: qty,
        priceUsd: price,
        lineTotalUsd: qty * price,
      };
    });

    const invRate = parseFloat(usdRate);
    const id = createInvoice({
      clientName: clientName.trim(),
      clientInfo: clientInfo.trim(),
      lines: invLines,
      usdRate: invRate,
      totalUsd,
      totalRub: totalUsd * invRate,
      status: 'draft',
    });

    toast('Накладная создана!', 'success');
    navigate('invoice-detail', id);
  };

  return (
    <div className="max-w-3xl mx-auto anim-fade-up space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('invoices')}>
          <IconArrowBack size={18} />
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Новая накладная</h1>
          <p className="text-[13px] text-gray-500">Заполните данные и добавьте позиции</p>
        </div>
      </div>

      {/* No products warning */}
      {products.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <IconAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-semibold text-amber-800">Нет товаров в прайс-листе</p>
            <p className="text-[13px] text-amber-700 mt-0.5">
              <button onClick={() => navigate('products')} className="underline font-semibold">Добавьте товары</button>{' '}
              перед созданием накладной
            </p>
          </div>
        </div>
      )}

      {/* Client info */}
      <div className="card p-5 space-y-4">
        <h2 className="text-[15px] font-bold text-gray-900">Клиент</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Имя / компания *</label>
            <input
              className={`input ${errors.clientName ? 'error' : ''}`}
              placeholder="ООО Ромашка"
              value={clientName}
              onChange={e => { setClientName(e.target.value); setErrors(p => ({...p, clientName:''})); }}
            />
            {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
          </div>
          <div>
            <label className="label">Доп. информация</label>
            <input
              className="input"
              placeholder="ИНН, адрес, контакт..."
              value={clientInfo}
              onChange={e => setClientInfo(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Курс USD → RUB *</label>
            <input
              className={`input ${errors.usdRate ? 'error' : ''}`}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="90.00"
              value={usdRate}
              onChange={e => { setUsdRate(e.target.value); setErrors(p => ({...p, usdRate:''})); }}
            />
            {errors.usdRate && <p className="text-xs text-red-500 mt-1">{errors.usdRate}</p>}
          </div>
          <div className="sm:col-span-2 flex flex-col justify-end">
            {rate > 0 && (
              <div className="text-[13px] text-gray-500 bg-blue-50 rounded-xl px-4 py-2.5">
                1 USD = <strong className="text-blue-700">{fmtRub(rate)} ₽</strong>
                <span className="ml-2 text-gray-400">·</span>
                <span className="ml-2">Итого: <strong className="text-blue-700">${fmt2(totalUsd)}</strong> = <strong className="text-blue-700">{fmtRub(totalRub)} ₽</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">Позиции накладной</h2>
          <button className="btn btn-primary btn-sm" onClick={addLine} disabled={products.length === 0}>
            <IconPlus size={14} /> Добавить
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const comp = computedLines[idx];
            return (
              <div key={line.id} className="bg-slate-50 rounded-2xl p-4 space-y-3 anim-fade-up">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-gray-500">Позиция {idx + 1}</span>
                  <button
                    className="btn btn-ghost btn-icon text-red-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Product */}
                  <div className="sm:col-span-1">
                    <label className="label">Товар *</label>
                    <select
                      className={`input ${errors[line.id+'_productId'] ? 'error' : ''}`}
                      value={line.productId}
                      onChange={e => updateLine(line.id, 'productId', e.target.value)}
                    >
                      <option value="">Выберите товар</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.priceUsd}/кг)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Qty */}
                  <div>
                    <label className="label">Кол-во (кг) *</label>
                    <input
                      className={`input ${errors[line.id+'_quantityKg'] ? 'error' : ''}`}
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="0.000"
                      value={line.quantityKg}
                      onChange={e => updateLine(line.id, 'quantityKg', e.target.value)}
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="label">Цена USD/кг * {rate > 0 && line.priceUsd && parseFloat(line.priceUsd) > 0 ? <span className="text-gray-400 font-normal">({fmtRub(parseFloat(line.priceUsd) * rate)} ₽/кг)</span> : null}</label>
                    <input
                      className={`input ${errors[line.id+'_priceUsd'] ? 'error' : ''}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={line.priceUsd}
                      onChange={e => updateLine(line.id, 'priceUsd', e.target.value)}
                    />
                  </div>
                </div>

                {/* Line total */}
                {comp.total > 0 && (
                  <div className="flex flex-wrap items-center gap-3 text-[13px] bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                    <span className="text-gray-500">{comp.qty.toFixed(3)} кг × ${fmt2(comp.price)}</span>
                    {rate > 0 && <span className="text-gray-400">({fmtRub(comp.price * rate)} ₽/кг)</span>}
                    <span className="text-gray-400">=</span>
                    <span className="font-bold text-gray-900">${fmt2(comp.total)}</span>
                    {rate > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-600">{fmtRub(comp.totalRub)} ₽</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grand total */}
        {totalUsd > 0 && (
          <div className="mt-2 bg-blue-600 text-white rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-[14px] font-semibold opacity-80">Общая сумма</span>
            <div className="text-right">
              <div className="text-[22px] font-bold text-money">${fmt2(totalUsd)}</div>
              {rate > 0 && <div className="text-[14px] opacity-80 text-money">{fmtRub(totalRub)} ₽ при курсе {fmtRub(rate)} ₽</div>}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <button className="btn btn-secondary" onClick={() => navigate('invoices')}>Отмена</button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={products.length === 0}
        >
          Создать накладную
        </button>
      </div>
    </div>
  );
}

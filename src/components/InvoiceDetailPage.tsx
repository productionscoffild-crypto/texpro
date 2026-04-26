import { useAppStore } from '../store';
import { Invoice } from '../types';
import { useToast } from './ui/Toast';
import { IconArrowBack, IconDownload, IconPrint, IconTrash } from './ui/Icon';
import { generateInvoicePDF, printInvoice } from '../utils/pdf';
import { StatusStepper, statusLabel } from './ui/Status';
import { useState } from 'react';
import { t } from '../i18n';

const usd = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const rub = (n: number) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function InvoiceDetailPage() {
  const { myInvoices, activeInvoiceId, navigate, updateInvoiceStatus, deleteInvoice, language } = useAppStore();
  const { toast } = useToast();
  const [pdfBusy, setPdfBusy] = useState(false);
  const invoice = myInvoices().find(i => i.id === activeInvoiceId);

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto card p-8 text-center anim-fade-up">
        <p className="text-gray-500 mb-4">{t(language, 'invoiceNotFound')}</p>
        <button className="btn btn-primary" onClick={() => navigate('invoices')}>{t(language, 'backToList')}</button>
      </div>
    );
  }

  const setStatus = (status: Invoice['status']) => {
    updateInvoiceStatus(invoice.id, status);
    toast(`Статус: ${statusLabel(status)}`, 'success');
  };

  const downloadPdf = async () => {
    try {
      setPdfBusy(true);
      await generateInvoicePDF(invoice);
      toast('PDF скачан', 'success');
    } catch (error) {
      console.error(error);
      toast('Не удалось сформировать PDF', 'error');
    } finally {
      setPdfBusy(false);
    }
  };

  const remove = () => {
    deleteInvoice(invoice.id);
    toast('Накладная удалена', 'error');
    navigate('invoices');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 anim-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('invoices')}><IconArrowBack size={18} /></button>
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">{invoice.number}</h1>
            <p className="text-[13px] text-gray-500">{new Date(invoice.createdAt).toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary" onClick={() => printInvoice(invoice)}><IconPrint size={16} />{t(language, 'print')}</button>
          <button className="btn btn-primary" onClick={downloadPdf} disabled={pdfBusy}><IconDownload size={16} />{pdfBusy ? t(language, 'preparing') : 'PDF'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2">
          <p className="text-[12px] font-semibold text-gray-400 mb-2">{t(language, 'client')}</p>
          <h2 className="text-[18px] font-bold text-gray-900">{invoice.clientName}</h2>
          {invoice.clientInfo && <p className="text-[14px] text-gray-500 mt-1">{invoice.clientInfo}</p>}
        </div>
        <div className="card p-5">
          <p className="text-[12px] font-semibold text-gray-400 mb-2">{t(language, 'rate')}</p>
          <p className="text-[20px] font-bold text-gray-900">1 USD = {rub(invoice.usdRate)} ₽</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-bold text-gray-900">{t(language, 'invoiceStatus')}</p>
          <div className="w-full"><StatusStepper value={invoice.status} onChange={setStatus} /></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-gray-900">{t(language, 'lines')}</h2>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[920px]">
            <div className="grid bg-slate-50 border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-gray-500" style={{ gridTemplateColumns: '48px 210px 120px 120px 120px 140px 150px' }}>
              <div>#</div><div>{t(language, 'product')}</div><div>{t(language, 'quantity')}</div><div>{t(language, 'priceUsd')}</div><div>{t(language, 'priceRub')}</div><div>USD</div><div>RUB</div>
            </div>
            {invoice.lines.map((line, idx) => (
              <div key={line.id} className="grid items-center px-4 py-4 border-b border-slate-100 last:border-b-0 text-[14px]" style={{ gridTemplateColumns: '48px 210px 120px 120px 120px 140px 150px' }}>
                <div className="text-gray-400">{idx + 1}</div>
                <div className="pr-3">
                  <p className="font-semibold text-gray-900 truncate">{line.productName}</p>
                  <p className="text-[12px] text-gray-400 truncate">{t(language, 'density')}: {line.productDensity} г/м²</p>
                </div>
                <div className="text-money">{line.quantityKg.toFixed(3)} кг</div>
                <div className="text-money">${usd(line.priceUsd)}</div>
                <div className="text-money text-gray-500">{rub(line.priceUsd * invoice.usdRate)} ₽</div>
                <div className="text-money font-semibold">${usd(line.lineTotalUsd)}</div>
                <div className="text-money text-gray-600">{rub(line.lineTotalUsd * invoice.usdRate)} ₽</div>
              </div>
            ))}
            <div className="grid bg-slate-50 px-4 py-4 border-t border-slate-100" style={{ gridTemplateColumns: '48px 210px 120px 120px 120px 140px 150px' }}>
              <div className="col-start-6">
                <p className="text-[12px] text-gray-400 font-semibold">{t(language, 'totalUsd')}</p>
                <p className="text-[20px] font-bold text-gray-900 text-money">${usd(invoice.totalUsd)}</p>
              </div>
              <div>
                <p className="text-[12px] text-gray-400 font-semibold">{t(language, 'totalRub')}</p>
                <p className="text-[20px] font-bold text-blue-600 text-money">{rub(invoice.totalRub)} ₽</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pb-6">
        <button className="btn btn-danger" onClick={remove}><IconTrash size={16} />{t(language, 'delete')}</button>
        <button className="btn btn-secondary" onClick={() => navigate('invoices')}>{t(language, 'backToList')}</button>
      </div>
    </div>
  );
}
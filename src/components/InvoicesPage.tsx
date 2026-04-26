import { useState } from 'react';
import { useAppStore } from '../store';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';
import { IconPlus, IconInvoice, IconEye, IconTrash, IconDownload, IconPrint } from './ui/Icon';
import { generateInvoicePDF, printInvoice } from '../utils/pdf';
import { StatusBadge } from './ui/Status';
import { exportInvoicesExcel } from '../utils/excel';

const moneyRub = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function InvoicesPage() {
  const { myInvoices, users, navigate, deleteInvoice } = useAppStore();
  const { toast } = useToast();
  const invoices = myInvoices();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const handleDelete = () => {
    if (!deleteId) return;
    deleteInvoice(deleteId);
    setDeleteId(null);
    toast('Накладная удалена', 'error');
  };

  const downloadPdf = async (invoice: (typeof invoices)[number]) => {
    try {
      setPdfBusyId(invoice.id);
      await generateInvoicePDF(invoice);
      toast('PDF скачан', 'success');
    } catch (error) {
      console.error(error);
      toast('Не удалось сформировать PDF', 'error');
    } finally {
      setPdfBusyId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto anim-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Накладные</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">Создание и управление продажами</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn bg-[#217346] text-white hover:bg-[#1b5f39]" onClick={() => exportInvoicesExcel(invoices, users)} disabled={invoices.length === 0}>
            Excel
          </button>
          <button className="btn btn-primary" onClick={() => navigate('invoice-new')}>
            <IconPlus size={16} /> Создать накладную
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <IconInvoice size={44} />
            <p className="text-[15px] font-medium">Нет накладных</p>
            <p className="text-[13px] text-center px-6">Создайте накладную с несколькими позициями, курсом USD и расчётом RUB</p>
            <button className="btn btn-primary btn-sm mt-1" onClick={() => navigate('invoice-new')}>
              <IconPlus size={14} /> Создать
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[880px]">
              <div className="grid bg-slate-50 border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-gray-500" style={{ gridTemplateColumns: '150px 240px 150px 140px 110px 160px' }}>
                <div>Номер</div><div>Клиент</div><div>RUB</div><div>Статус</div><div>Дата</div><div className="text-center">Действия</div>
              </div>
              {invoices.map(inv => (
                <div key={inv.id} className="grid items-center px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 text-[14px]" style={{ gridTemplateColumns: '150px 240px 150px 140px 110px 160px' }}>
                  <button className="font-semibold text-blue-600 truncate text-left pr-3" onClick={() => navigate('invoice-detail', inv.id)}>{inv.number}</button>
                  <div className="font-medium text-gray-900 truncate pr-3">{inv.clientName}</div>
                  <div className="text-money font-semibold text-gray-900">{moneyRub(inv.totalRub)} ₽</div>
                  <div className="whitespace-nowrap"><StatusBadge status={inv.status} /></div>
                  <div className="text-gray-400 text-[13px]">{new Date(inv.createdAt).toLocaleDateString('ru-RU')}</div>
                  <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                    <button className="btn btn-ghost btn-icon text-blue-600 hover:bg-blue-50" onClick={() => navigate('invoice-detail', inv.id)} title="Открыть"><IconEye size={15} /></button>
                    <button className="btn btn-ghost btn-icon text-gray-600 hover:bg-gray-100" onClick={() => printInvoice(inv)} title="Печать"><IconPrint size={15} /></button>
                    <button className="btn btn-ghost btn-icon text-gray-600 hover:bg-gray-100" onClick={() => downloadPdf(inv)} disabled={pdfBusyId === inv.id} title="PDF"><IconDownload size={15} /></button>
                    <button className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50" onClick={() => setDeleteId(inv.id)} title="Удалить"><IconTrash size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Удалить накладную?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Отмена</button>
            <button className="btn btn-danger" onClick={handleDelete}>Удалить</button>
          </>
        }
      >
        <p className="text-[14px] text-gray-600">Действие нельзя отменить. Аналитика будет пересчитана автоматически.</p>
      </Modal>
    </div>
  );
}
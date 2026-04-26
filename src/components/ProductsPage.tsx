import { useState } from 'react';
import { useAppStore } from '../store';
import { Product } from '../types';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';
import { IconPlus, IconEdit, IconTrash, IconPackage } from './ui/Icon';
import { exportProductsExcel } from '../utils/excel';

const fmt2 = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

type FormData = { name: string; composition: string; priceUsd: string; density: string };
const empty: FormData = { name: '', composition: '', priceUsd: '', density: '' };

export default function ProductsPage() {
  const { myProducts, addProduct, updateProduct, deleteProduct } = useAppStore();
  const { toast } = useToast();
  const products = myProducts();

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const set = (k: keyof FormData, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = 'Введите название';
    const p = parseFloat(form.priceUsd);
    if (!form.priceUsd || isNaN(p) || p <= 0) e.priceUsd = 'Укажите корректную цену';
    const d = parseFloat(form.density);
    if (!form.density || isNaN(d) || d <= 0) e.density = 'Укажите плотность';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => { setForm(empty); setErrors({}); setModal('add'); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, composition: p.composition || '', priceUsd: String(p.priceUsd), density: String(p.density) });
    setErrors({});
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = () => {
    if (!validate()) return;
    const data = {
      name: form.name.trim(),
      composition: form.composition.trim(),
      priceUsd: parseFloat(form.priceUsd),
      density: parseFloat(form.density),
    };
    if (modal === 'add') {
      addProduct(data);
      toast('Товар добавлен', 'success');
    } else if (editing) {
      updateProduct(editing.id, data);
      toast('Товар обновлён', 'success');
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setDeleteConfirm(null);
    toast('Товар удалён', 'error');
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Товары</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">Управление прайс-листом тканей</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn bg-[#217346] text-white hover:bg-[#1b5f39]" onClick={() => exportProductsExcel(products)} disabled={products.length === 0}>
            Excel
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <IconPlus size={16} /> Добавить товар
          </button>
        </div>
      </div>

      {/* Table / Empty */}
      <div className="card overflow-hidden">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <IconPackage size={44} />
            <p className="text-[15px] font-medium">Нет товаров</p>
            <p className="text-[13px]">Добавьте первый товар для работы с накладными</p>
            <button className="btn btn-primary btn-sm mt-1" onClick={openAdd}>
              <IconPlus size={14} /> Добавить
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="hidden md:grid grid-cols-[1.4fr_1fr_120px_120px_88px] gap-4 px-5 py-3 bg-slate-50 text-[12px] font-semibold text-gray-500">
              <span>Название</span><span>Состав</span><span className="text-right">Цена</span><span className="text-right">Плотность</span><span className="text-center">Действия</span>
            </div>
            {products.map(p => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_120px_120px_88px] gap-3 md:gap-4 px-5 py-4 items-center">
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="md:hidden text-[12px] text-gray-400 mt-1">{p.composition || 'Состав не указан'} · {p.density} г/м²</p>
                </div>
                <div className="hidden md:block text-[14px] text-gray-600">{p.composition || '—'}</div>
                <div className="text-money font-bold text-emerald-700 md:text-right">${fmt2(p.priceUsd)}</div>
                <div className="hidden md:block text-gray-600 text-right">{p.density} г/м²</div>
                <div className="flex md:justify-center gap-2">
                  <button className="btn btn-ghost btn-icon text-blue-600 hover:bg-blue-50" onClick={() => openEdit(p)} title="Редактировать"><IconEdit size={15} /></button>
                  <button className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(p.id)} title="Удалить"><IconTrash size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? 'Добавить товар' : 'Редактировать товар'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>Отмена</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {modal === 'add' ? 'Добавить' : 'Сохранить'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Название ткани *</label>
            <input
              className={`input ${errors.name ? 'error' : ''}`}
              placeholder="Кулирка, футер, рибана..."
              value={form.name}
              onChange={e => set('name', e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="label">Состав</label>
            <input
              className="input"
              placeholder="95% хлопок, 5% лайкра"
              value={form.composition}
              onChange={e => set('composition', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Цена (USD/кг) *</label>
              <input
                className={`input ${errors.priceUsd ? 'error' : ''}`}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.priceUsd}
                onChange={e => set('priceUsd', e.target.value)}
              />
              {errors.priceUsd && <p className="text-xs text-red-500 mt-1">{errors.priceUsd}</p>}
            </div>
            <div>
              <label className="label">Плотность (г/м²) *</label>
              <input
                className={`input ${errors.density ? 'error' : ''}`}
                type="number"
                min="1"
                step="1"
                placeholder="180"
                value={form.density}
                onChange={e => set('density', e.target.value)}
              />
              {errors.density && <p className="text-xs text-red-500 mt-1">{errors.density}</p>}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Удалить товар?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Отмена</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm!)}>Удалить</button>
          </>
        }
      >
        <p className="text-[14px] text-gray-600">
          Товар будет удалён из прайс-листа. Уже созданные накладные сохранят данные о нём.
        </p>
      </Modal>
    </div>
  );
}

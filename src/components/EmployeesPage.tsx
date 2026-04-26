import { FormEvent, useState } from 'react';
import { useAppStore } from '../store';
import { useToast } from './ui/Toast';
import { IconPlus, IconTrash, IconUser } from './ui/Icon';

export default function EmployeesPage() {
  const { users, currentUser, createEmployee, toggleEmployee, deleteEmployee } = useAppStore();
  const { toast } = useToast();
  const me = currentUser();
  const employees = users.filter(u => u.role === 'employee');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast('Заполните имя, email и пароль от 6 символов', 'error');
      return;
    }
    const res = await createEmployee(name, email, password);
    if (!res.ok) {
      toast(res.error || 'Не удалось добавить сотрудника', 'error');
      return;
    }
    setName('');
    setEmail('');
    setPassword('');
    toast('Сотрудник добавлен', 'success');
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteEmployee(deleteId);
    setDeleteId(null);
    toast('Сотрудник удалён', 'error');
  };

  if (me?.role !== 'owner') {
    return (
      <div className="max-w-3xl mx-auto card p-8 text-center anim-fade-up">
        <p className="text-gray-500">Доступ к сотрудникам есть только у владельца.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto anim-fade-up">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">Сотрудники</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">Публичная регистрация закрыта. Доступ выдаёте только вы.</p>
      </div>

      <form onSubmit={submit} className="card p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_160px_auto] gap-3 items-end">
        <div>
          <label className="label">Имя</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@company.ru" />
        </div>
        <div>
          <label className="label">Пароль</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="от 6 символов" />
        </div>
        <button className="btn btn-primary" type="submit"><IconPlus size={16} />Добавить</button>
      </form>

      <div className="card overflow-hidden">
        {employees.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <div className="flex justify-center mb-3"><IconUser size={40} /></div>
            Сотрудников пока нет
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid bg-slate-50 border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-gray-500" style={{ gridTemplateColumns: '190px 270px 120px 220px' }}>
                <div>Сотрудник</div><div>Email</div><div>Статус</div><div className="text-center">Действие</div>
              </div>
              {employees.map(u => (
                <div key={u.id} className="grid items-center px-4 py-3 border-b border-slate-100 last:border-b-0 text-[14px]" style={{ gridTemplateColumns: '190px 270px 120px 220px' }}>
                  <div className="font-semibold truncate pr-3">{u.name}</div>
                  <div className="text-gray-500 truncate pr-3">{u.email}</div>
                  <div><span className={`badge ${u.active ? 'badge-paid' : 'badge-cancelled'}`}>{u.active ? 'Активен' : 'Отключён'}</span></div>
                  <div className="flex justify-center gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleEmployee(u.id)}>{u.active ? 'Отключить' : 'Включить'}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(u.id)}><IconTrash size={14} />Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-box max-w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <h2 className="text-[17px] font-bold text-gray-900">Удалить сотрудника?</h2>
            </div>
            <div className="px-6 py-5 text-[14px] text-gray-600">
              Сотрудник больше не сможет войти в систему. Уже созданные им накладные останутся в базе.
            </div>
            <div className="px-6 pb-5 pt-2 border-t border-slate-100 flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Отмена</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { FormEvent, useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { useToast } from './ui/Toast';
import { IconUser } from './ui/Icon';

export default function ProfilePage() {
  const { currentUser, updateProfile, changePassword } = useAppStore();
  const { toast } = useToast();
  const user = currentUser();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setPosition(user.position ?? '');
  }, [user]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast('Введите имя и фамилию', 'error');
      return;
    }
    updateProfile({ name: name.trim(), phone: phone.trim(), position: position.trim() });
    toast('Профиль обновлён', 'success');
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('Новый пароль и подтверждение не совпадают', 'error');
      return;
    }
    const result = changePassword(currentPassword, newPassword);
    if (!result.ok) {
      toast(result.error || 'Не удалось сменить пароль', 'error');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast('Пароль изменён', 'success');
  };

  if (!user) return null;

  return (
    <div className="space-y-5 max-w-3xl mx-auto anim-fade-up">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">Профиль</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">Ваши данные и контактная информация</p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <IconUser size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-gray-900 truncate">{user.name}</p>
            <p className="text-[13px] text-gray-500 truncate">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600">
              {user.role === 'owner' ? 'Руководитель' : 'Сотрудник'}
            </span>
          </div>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="label">Имя и фамилия</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Иван Иванов"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Телефон</label>
              <input
                className="input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+7 999 000-00-00"
              />
            </div>
            <div>
              <label className="label">Должность</label>
              <input
                className="input"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="Менеджер по продажам"
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50 text-gray-500" value={user.email} disabled />
            <p className="text-[12px] text-gray-400 mt-1">Email используется для входа и сейчас не редактируется.</p>
          </div>

          <div className="flex justify-end pt-2">
            <button className="btn btn-primary" type="submit">Сохранить</button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-gray-900">Смена пароля</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">После смены используйте новый пароль при следующем входе.</p>
        </div>

        <form onSubmit={submitPassword} className="p-5 space-y-4">
          <div>
            <label className="label">Текущий пароль</label>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Введите текущий пароль"
              autoComplete="current-password"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Новый пароль</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Повторите новый пароль</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Изменить пароль
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
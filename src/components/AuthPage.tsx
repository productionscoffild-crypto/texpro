import { useState, FormEvent } from 'react';
import { useAppStore } from '../store';
import { useToast } from './ui/Toast';
import { IconUser, IconDollar } from './ui/Icon';

export default function AuthPage() {
  const { login } = useAppStore();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Введите email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Некорректный email';
    if (!password) e.password = 'Введите пароль';
    else if (password.length < 6) e.password = 'Минимум 6 символов';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const r = login(email, password);
      const result = await r;
      if (!result.ok) { toast(result.error!, 'error'); }
      else toast('Добро пожаловать!', 'success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 mb-4"
          style={{ width: 64, height: 64, minWidth: 64, minHeight: 64 }}
          aria-label="Логотип"
        >
          <IconDollar size={28} className="text-white" />
        </div>
        <h1 className="text-[26px] font-bold text-gray-900 leading-none">ТекстильПро</h1>
        <p className="text-[14px] text-gray-500 mt-1">Система управления оптовыми продажами</p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-[400px] p-8 anim-scale-in">
        <h2 className="text-[20px] font-bold text-gray-900 mb-1">
          Вход в систему
        </h2>
        <p className="text-[13px] text-gray-500 mb-6">
          Доступ только для владельца и сотрудников
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className={`input ${errors.email ? 'error' : ''}`}
              placeholder="ivan@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="label">Пароль</label>
            <input
              type="password"
              className={`input ${errors.password ? 'error' : ''}`}
              placeholder="Минимум 6 символов"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
              autoComplete="current-password"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center mt-2"
            style={{ width: '100%', paddingTop: 12, paddingBottom: 12, fontSize: 15 }}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Войти'
            )}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-[12px] text-gray-500 leading-relaxed">
          Публичная регистрация отключена. Сотрудников добавляет только владелец во вкладке «Сотрудники».
        </div>
      </div>

      <p className="text-[12px] text-gray-400 mt-6 flex items-center gap-1.5">
        <IconUser size={12} />
        Данные хранятся в вашем браузере
      </p>
    </div>
  );
}

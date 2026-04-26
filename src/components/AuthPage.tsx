import { useState, FormEvent } from 'react';
import { useAppStore } from '../store';
import { useToast } from './ui/Toast';
import { IconUser, IconDollar } from './ui/Icon';
import { t } from '../i18n';

export default function AuthPage() {
  const { login, language, setLanguage } = useAppStore();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = t(language, 'enterEmail');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t(language, 'invalidEmail');
    if (!password) e.password = t(language, 'enterPassword');
    else if (password.length < 6) e.password = t(language, 'min6');
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
      else toast(t(language, 'welcome'), 'success');
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
        <p className="text-[14px] text-gray-500 mt-1">{t(language, 'wholesale')}</p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-[400px] p-8 anim-scale-in">
        <h2 className="text-[20px] font-bold text-gray-900 mb-1">
          {t(language, 'loginTitle')}
        </h2>
        <p className="text-[13px] text-gray-500 mb-6">
          {t(language, 'loginSubtitle')}
        </p>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => setLanguage('ru')} className={`rounded-xl px-2 py-2 text-[12px] font-semibold ${language === 'ru' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>RU</button>
          <button type="button" onClick={() => setLanguage('tr')} className={`rounded-xl px-2 py-2 text-[12px] font-semibold ${language === 'tr' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>TR</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="label">{t(language, 'email')}</label>
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
            <label className="label">{t(language, 'password')}</label>
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
              t(language, 'signIn')
            )}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-[12px] text-gray-500 leading-relaxed">
          {t(language, 'publicRegistrationOff')}
        </div>
      </div>

      <p className="text-[12px] text-gray-400 mt-6 flex items-center gap-1.5">
        <IconUser size={12} />
        {t(language, 'dataInBrowser')}
      </p>
    </div>
  );
}

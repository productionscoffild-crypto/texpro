import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { Page } from '../types';
import {
  IconDashboard, IconChart, IconPackage, IconInvoice, IconChat, IconBell, IconLogout, IconMenu, IconClose, IconDollar, IconUser,
} from './ui/Icon';
import ExchangeRate from './ExchangeRate';

const NAV: { page: Page; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { page: 'dashboard', label: 'Главная',  Icon: IconDashboard },
  { page: 'profile', label: 'Профиль', Icon: IconUser },
  { page: 'analytics', label: 'Аналитика', Icon: IconChart },
  { page: 'products',  label: 'Товары',   Icon: IconPackage   },
  { page: 'invoices',  label: 'Накладные', Icon: IconInvoice  },
  { page: 'chat', label: 'Чат', Icon: IconChat },
  { page: 'employees', label: 'Сотрудники', Icon: IconUser },
];

export default function Layout({ children }: { children: ReactNode }) {
  const {
    page,
    navigate,
    logout,
    sidebarOpen,
    setSidebarOpen,
    currentUser,
    users,
    chatMessages,
    notificationReadAtByUser,
    markChatNotificationsRead,
    syncFromCloud,
  } = useAppStore();
  const user = currentUser();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const incomingChatMessages = useMemo(() => {
    if (!user) return [];
    return chatMessages
      .filter(message => {
        if (message.fromUserId === user.id) return false;
        if (message.scope === 'general') return true;
        return message.scope === 'direct' && message.toUserId === user.id;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [chatMessages, user]);

  const lastReadAt = user ? notificationReadAtByUser[user.id] : undefined;
  const unreadCount = incomingChatMessages.filter(message =>
    !lastReadAt || new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime()
  ).length;

  const userById = (id: string) => users.find(item => item.id === id);

  useEffect(() => {
    void syncFromCloud();
    const interval = window.setInterval(() => void syncFromCloud(), 5000);
    return () => window.clearInterval(interval);
  }, [syncFromCloud]);

  const openNotifications = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) markChatNotificationsRead();
  };

  const openChatFromNotification = () => {
    markChatNotificationsRead();
    setNotificationsOpen(false);
    navigate('chat');
  };

  const NavItem = ({ item }: { item: typeof NAV[0] }) => {
    const active = page === item.page || (page === 'invoice-new' && item.page === 'invoices') || (page === 'invoice-detail' && item.page === 'invoices');
    return (
      <button
        onClick={() => navigate(item.page)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-150 text-left ${
          active
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <item.Icon size={18} />
        {item.label}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center bg-blue-600 text-white rounded-full shadow-sm shadow-blue-200 shrink-0"
            style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}
          >
            <IconDollar size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900 leading-none">ТекстильПро</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-none">Оптовые продажи</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.filter(item => item.page !== 'employees' || user?.role === 'owner').map(item => <NavItem key={item.page} item={item} />)}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <ExchangeRate />
        <div className="relative mb-3">
          <button
            onClick={openNotifications}
            className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${notificationsOpen ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-gray-700 hover:bg-slate-100'}`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-blue-600">
                <IconBell size={17} />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">Уведомления</span>
                <span className="block truncate text-[11px] opacity-60">{unreadCount > 0 ? `${unreadCount} новых из чата` : 'Новых нет'}</span>
              </span>
            </span>
          </button>

          {notificationsOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-[13px] font-bold text-gray-900">Уведомления чата</p>
              </div>
              {incomingChatMessages.length === 0 ? (
                <div className="px-4 py-5 text-center text-[13px] text-gray-400">Пока нет уведомлений</div>
              ) : (
                <div className="max-h-[260px] overflow-auto">
                  {incomingChatMessages.slice(0, 6).map(message => {
                    const author = userById(message.fromUserId);
                    const preview = message.kind === 'voice'
                      ? 'Голосовое сообщение'
                      : message.kind === 'file'
                        ? `Файл: ${message.fileName || 'вложение'}`
                        : message.text;
                    return (
                      <button key={message.id} onClick={openChatFromNotification} className="w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 last:border-b-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-gray-900">{author?.name || 'Пользователь'}</span>
                          <span className="shrink-0 text-[11px] text-gray-400">{new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 truncate text-[12px] text-gray-500">{preview}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => navigate('profile')} className={`w-full flex items-center gap-3 px-3 py-2 mb-2 rounded-xl text-left transition-colors ${page === 'profile' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
          <div
            className="flex items-center justify-center bg-blue-100 text-blue-600 rounded-full shrink-0"
            style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
          >
            <IconUser size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-400 truncate">Открыть профиль</p>
          </div>
        </button>
        <button onClick={logout} className="btn btn-ghost w-full justify-start gap-2 text-red-500 hover:bg-red-50 hover:text-red-600">
          <IconLogout size={16} />
          Выйти
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 bg-white border-r border-slate-100 h-full">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          <div className="sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="sidebar-drawer lg:hidden">
            <div className="absolute top-3 right-3">
              <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(false)}>
                <IconClose size={16} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shrink-0">
          <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(true)}>
            <IconMenu size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex items-center justify-center bg-blue-600 text-white rounded-full shrink-0"
              style={{ width: 30, height: 30, minWidth: 30, minHeight: 30 }}
            >
              <IconDollar size={14} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-gray-900 truncate">ТекстильПро</span>
          </div>
          <button
            onClick={() => navigate('profile')}
            className="ml-auto flex items-center justify-center bg-blue-100 text-blue-600 rounded-full shrink-0"
            style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
            aria-label="Открыть профиль"
          >
            <IconUser size={16} />
          </button>
          <button
            onClick={openNotifications}
            className="relative flex items-center justify-center bg-slate-100 text-slate-600 rounded-full shrink-0"
            style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
            aria-label="Открыть уведомления"
          >
            <IconBell size={16} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

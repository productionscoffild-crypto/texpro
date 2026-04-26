import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Product, Invoice, Page, ChatMessage } from '../types';
import { CloudState, cloudApi } from '../utils/cloudApi';
import { Lang } from '../i18n';

const uid = () => Math.random().toString(36).slice(2, 11);

const OWNER_EMAIL = 'owner@textilepro.local';
const OWNER_PASSWORD = 'owner12345';
const ACCESS_USERS_KEY = 'textile-access-users';

const defaultOwner = (): User => ({
  id: 'owner-root',
  name: 'Владелец',
  phone: '',
  position: 'Руководитель',
  email: OWNER_EMAIL,
  passwordHash: OWNER_PASSWORD,
  role: 'owner',
  active: true,
  createdAt: new Date().toISOString(),
});

const normalizeUser = (user: User): User => ({
  ...user,
  email: user.email.trim().toLowerCase(),
  role: user.role ?? 'employee',
  active: user.active ?? true,
  phone: user.phone ?? '',
  position: user.position ?? (user.role === 'owner' ? 'Руководитель' : 'Менеджер'),
});

const uniqueUsers = (users: User[]) => {
  const map = new Map<string, User>();
  users.map(normalizeUser).forEach(user => map.set(user.email, user));
  return Array.from(map.values());
};

const loadAccessUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(ACCESS_USERS_KEY);
    if (!raw) return [];
    return uniqueUsers(JSON.parse(raw));
  } catch {
    return [];
  }
};

const invoiceNumber = (invoices: Invoice[]): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const seq = String(invoices.length + 1).padStart(4, '0');
  return `ИНВ-${y}${m}-${seq}`;
};

const normalizeInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  status: ((invoice.status as string) === 'sent' ? 'shipped' : invoice.status) as Invoice['status'],
  lines: invoice.lines.map(line => ({
    ...line,
    productComposition: line.productComposition ?? '',
  })),
});

const normalizeChatMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  kind: message.kind ?? 'text',
  text: message.text ?? '',
});

interface AppState {
  users: User[];
  currentUserId: string | null;

  products: Product[];
  invoices: Invoice[];
  chatMessages: ChatMessage[];
  notificationReadAtByUser: Record<string, string>;

  page: Page;
  activeInvoiceId: string | null;
  sidebarOpen: boolean;
  cloudError: string | null;
  language: Lang;

  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  createEmployee: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  toggleEmployee: (id: string) => void;
  deleteEmployee: (id: string) => void;
  updateProfile: (data: Pick<User, 'name' | 'phone' | 'position'>) => void;
  changePassword: (currentPassword: string, newPassword: string) => { ok: boolean; error?: string };
  syncFromCloud: () => Promise<void>;

  navigate: (page: Page, invoiceId?: string) => void;
  setSidebarOpen: (v: boolean) => void;
  setLanguage: (language: Lang) => void;

  addProduct: (data: Omit<Product, 'id' | 'userId' | 'createdAt'>) => void;
  updateProduct: (id: string, data: Partial<Pick<Product, 'name' | 'composition' | 'priceUsd' | 'density'>>) => void;
  deleteProduct: (id: string) => void;

  createInvoice: (data: Omit<Invoice, 'id' | 'userId' | 'number' | 'createdAt'>) => string;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void;
  deleteInvoice: (id: string) => void;

  sendChatMessage: (data: Pick<ChatMessage, 'scope' | 'text' | 'toUserId'>) => void;
  sendVoiceMessage: (data: Pick<ChatMessage, 'scope' | 'toUserId' | 'audioDataUrl' | 'durationSec'>) => void;
  sendFileMessage: (data: Pick<ChatMessage, 'scope' | 'toUserId' | 'fileName' | 'fileType' | 'fileSize' | 'fileDataUrl'>) => void;
  editChatMessage: (id: string, text: string) => void;
  markChatNotificationsRead: () => void;

  currentUser: () => User | null;
  myProducts: () => Product[];
  myInvoices: () => Invoice[];
  dashboardStats: () => { invoiceCount: number; totalSalesUsd: number; totalSalesRub: number; paidUsd: number };
}

const toCloudState = (state: AppState): CloudState => ({
  users: uniqueUsers([defaultOwner(), ...state.users]),
  products: state.products.map(p => ({ ...p, composition: p.composition ?? '' })),
  invoices: state.invoices.map(normalizeInvoice),
  chatMessages: state.chatMessages.map(normalizeChatMessage),
  notificationReadAtByUser: state.notificationReadAtByUser,
});

const mergeCloudState = (remote: CloudState, local: AppState): CloudState => ({
  users: uniqueUsers([defaultOwner(), ...remote.users, ...local.users]),
  products: [...remote.products, ...local.products]
    .filter((item, index, array) => array.findIndex(other => other.id === item.id) === index)
    .map(p => ({ ...p, composition: p.composition ?? '' })),
  invoices: [...remote.invoices, ...local.invoices]
    .filter((item, index, array) => array.findIndex(other => other.id === item.id) === index)
    .map(normalizeInvoice),
  chatMessages: [...remote.chatMessages, ...local.chatMessages]
    .filter((item, index, array) => array.findIndex(other => other.id === item.id) === index)
    .map(normalizeChatMessage),
  notificationReadAtByUser: {
    ...(remote.notificationReadAtByUser || {}),
    ...(local.notificationReadAtByUser || {}),
  },
});

const saveCloud = async (state: AppState): Promise<{ ok: boolean; error?: string }> => {
  try {
    let nextState = toCloudState(state);

    try {
      const remote = await cloudApi.getState();
      nextState = mergeCloudState(remote, state);
    } catch {
      // If remote read fails, still try to save the current state.
    }

    await cloudApi.saveState(nextState);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Сервер недоступен',
    };
  }
};

const applyCloudState = (
  set: (partial: Partial<AppState>) => void,
  state: CloudState,
  currentUserId: string | null = null
) => {
  set({
    users: uniqueUsers([defaultOwner(), ...state.users]),
    products: state.products.map(p => ({ ...p, composition: p.composition ?? '' })),
    invoices: state.invoices.map(normalizeInvoice),
    chatMessages: state.chatMessages.map(normalizeChatMessage),
    notificationReadAtByUser: state.notificationReadAtByUser || {},
    currentUserId,
    cloudError: null,
  });
};

const saveAccessUsers = (users: User[]) => {
  try {
    localStorage.setItem(ACCESS_USERS_KEY, JSON.stringify(uniqueUsers(users)));
  } catch {
    // Ignore localStorage problems.
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: [defaultOwner()],
      currentUserId: null,
      products: [],
      invoices: [],
      chatMessages: [],
      notificationReadAtByUser: {},
      page: 'dashboard',
      activeInvoiceId: null,
      sidebarOpen: false,
      cloudError: null,
      language: 'ru',

      createEmployee: async (name, email, password) => {
        const current = get().currentUser();
        if (current?.role !== 'owner') return { ok: false, error: 'Недостаточно прав' };

        const normalizedEmail = email.trim().toLowerCase();
        const users = uniqueUsers([defaultOwner(), ...get().users, ...loadAccessUsers()]);

        if (users.find(u => u.email === normalizedEmail)) {
          return { ok: false, error: 'Пользователь с таким email уже существует' };
        }

        const user: User = {
          id: uid(),
          name: name.trim(),
          phone: '',
          position: 'Менеджер',
          email: normalizedEmail,
          passwordHash: password,
          role: 'employee',
          active: true,
          createdAt: new Date().toISOString(),
        };

        const nextUsers = uniqueUsers([...users, user]);
        saveAccessUsers(nextUsers);
        set({ users: nextUsers });

        const saved = await saveCloud(get());
        if (!saved.ok) {
          return { ok: false, error: `Supabase не сохранил сотрудника: ${saved.error}` };
        }

        return { ok: true };
      },

      toggleEmployee: (id) => {
        const current = get().currentUser();
        if (current?.role !== 'owner') return;

        set(s => {
          const users = uniqueUsers(
            s.users.map(u => u.id === id && u.role === 'employee' ? { ...u, active: !u.active } : u)
          );
          saveAccessUsers(users);
          return { users };
        });

        void saveCloud(get());
      },

      deleteEmployee: (id) => {
        const current = get().currentUser();
        if (current?.role !== 'owner') return;

        set(s => {
          const users = uniqueUsers(s.users.filter(u => !(u.id === id && u.role === 'employee')));
          saveAccessUsers(users);
          return { users };
        });

        void saveCloud(get());
      },

      updateProfile: (data) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return;

        set(s => {
          const users = uniqueUsers(s.users.map(u => u.id === currentUserId ? { ...u, ...data } : u));
          saveAccessUsers(users);
          return { users };
        });

        void saveCloud(get());
      },

      changePassword: (currentPassword, newPassword) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return { ok: false, error: 'Пользователь не найден' };

        const user = get().users.find(u => u.id === currentUserId);
        if (!user) return { ok: false, error: 'Пользователь не найден' };

        if (user.passwordHash !== currentPassword) {
          return { ok: false, error: 'Текущий пароль указан неверно' };
        }

        if (newPassword.length < 6) {
          return { ok: false, error: 'Новый пароль должен быть не короче 6 символов' };
        }

        set(s => {
          const users = uniqueUsers(
            s.users.map(u => u.id === currentUserId ? { ...u, passwordHash: newPassword } : u)
          );
          saveAccessUsers(users);
          return { users };
        });

        void saveCloud(get());
        return { ok: true };
      },

      login: async (email, password) => {
        try {
          const { user, state } = await cloudApi.login(email, password);
          const merged = mergeCloudState(state, get());

          applyCloudState(set, merged, user.id);
          saveAccessUsers(merged.users);

          void cloudApi.saveState(merged);
          return { ok: true };
        } catch (error) {
          const users = uniqueUsers([defaultOwner(), ...get().users, ...loadAccessUsers()]);
          set({ users, cloudError: error instanceof Error ? error.message : 'Ошибка облака' });
          saveAccessUsers(users);

          const user = users.find(u => u.email === email.trim().toLowerCase());

          if (!user) {
            const message = error instanceof Error ? error.message : '';

            if (message.includes('Пользователь не найден')) {
              return {
                ok: false,
                error: 'Пользователь не найден в Supabase. Проверьте, что он есть в state_json.users и Cloudflare уже задеплоил последнюю версию.',
              };
            }

            return {
              ok: false,
              error: `Не удалось подключиться к Supabase: ${message || 'неизвестная ошибка'}`,
            };
          }

          if (!user.active) return { ok: false, error: 'Доступ сотрудника отключён' };
          if (user.passwordHash !== password) return { ok: false, error: 'Неверный пароль' };

          set({ currentUserId: user.id, page: 'dashboard' });
          return { ok: true };
        }
      },

      logout: () => set({ currentUserId: null, page: 'dashboard', sidebarOpen: false }),

      navigate: (page, invoiceId) => set({ page, activeInvoiceId: invoiceId ?? null, sidebarOpen: false }),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      setLanguage: (language) => set({ language }),

      syncFromCloud: async () => {
        try {
          const remote = await cloudApi.getState();
          const merged = mergeCloudState(remote, get());

          applyCloudState(set, merged, get().currentUserId);

          if (JSON.stringify(remote) !== JSON.stringify(merged)) {
            void cloudApi.saveState(merged);
          }
        } catch (error) {
          set({ cloudError: error instanceof Error ? error.message : 'Ошибка синхронизации' });
        }
      },

      addProduct: (data) => {
        const product: Product = {
          id: uid(),
          userId: get().currentUserId!,
          ...data,
          createdAt: new Date().toISOString(),
        };

        set(s => ({ products: [...s.products, product] }));
        void saveCloud(get());
      },

      updateProduct: (id, data) => {
        set(s => ({
          products: s.products.map(p => p.id === id ? { ...p, ...data } : p),
        }));

        void saveCloud(get());
      },

      deleteProduct: (id) => {
        set(s => ({ products: s.products.filter(p => p.id !== id) }));
        void saveCloud(get());
      },

      createInvoice: (data) => {
        const { invoices, currentUserId } = get();
        const id = uid();

        const invoice: Invoice = {
          id,
          userId: currentUserId!,
          number: invoiceNumber(invoices),
          ...data,
          createdAt: new Date().toISOString(),
        };

        set(s => ({ invoices: [...s.invoices, invoice] }));
        void saveCloud(get());

        return id;
      },

      updateInvoiceStatus: (id, status) => {
        set(s => ({
          invoices: s.invoices.map(inv => inv.id === id ? { ...inv, status } : inv),
        }));

        void saveCloud(get());
      },

      deleteInvoice: (id) => {
        set(s => ({ invoices: s.invoices.filter(inv => inv.id !== id) }));
        void saveCloud(get());
      },

      sendChatMessage: ({ scope, text, toUserId }) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId || !text.trim()) return;

        const message: ChatMessage = {
          id: uid(),
          scope,
          kind: 'text',
          fromUserId: currentUserId,
          toUserId: scope === 'direct' ? toUserId : undefined,
          text: text.trim(),
          createdAt: new Date().toISOString(),
        };

        set(s => ({ chatMessages: [...s.chatMessages, message] }));
        void saveCloud(get());
      },

      sendVoiceMessage: ({ scope, toUserId, audioDataUrl, durationSec }) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId || !audioDataUrl) return;

        const message: ChatMessage = {
          id: uid(),
          scope,
          kind: 'voice',
          fromUserId: currentUserId,
          toUserId: scope === 'direct' ? toUserId : undefined,
          text: '',
          audioDataUrl,
          durationSec,
          createdAt: new Date().toISOString(),
        };

        set(s => ({ chatMessages: [...s.chatMessages, message] }));
        void saveCloud(get());
      },

      sendFileMessage: ({ scope, toUserId, fileName, fileType, fileSize, fileDataUrl }) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId || !fileDataUrl || !fileName) return;

        const message: ChatMessage = {
          id: uid(),
          scope,
          kind: 'file',
          fromUserId: currentUserId,
          toUserId: scope === 'direct' ? toUserId : undefined,
          text: '',
          fileName,
          fileType,
          fileSize,
          fileDataUrl,
          createdAt: new Date().toISOString(),
        };

        set(s => ({ chatMessages: [...s.chatMessages, message] }));
        void saveCloud(get());
      },

      editChatMessage: (id, text) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId || !text.trim()) return;

        set(s => ({
          chatMessages: s.chatMessages.map(message =>
            message.id === id &&
            message.fromUserId === currentUserId &&
            (message.kind ?? 'text') === 'text'
              ? { ...message, text: text.trim(), editedAt: new Date().toISOString() }
              : message
          ),
        }));

        void saveCloud(get());
      },

      markChatNotificationsRead: () => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return;

        set(s => ({
          notificationReadAtByUser: {
            ...s.notificationReadAtByUser,
            [currentUserId]: new Date().toISOString(),
          },
        }));

        void saveCloud(get());
      },

      currentUser: () => {
        const { users, currentUserId } = get();
        return users.find(u => u.id === currentUserId) ?? null;
      },

      myProducts: () => {
        const { products } = get();
        return products.map(p => ({ ...p, composition: p.composition ?? '' }));
      },

      myInvoices: () => {
        const { invoices } = get();

        return invoices
          .map(normalizeInvoice)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      dashboardStats: () => {
        const invs = get().myInvoices();

        return {
          invoiceCount: invs.length,
          totalSalesUsd: invs.reduce((s, i) => s + i.totalUsd, 0),
          totalSalesRub: invs.reduce((s, i) => s + i.totalRub, 0),
          paidUsd: invs.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalUsd, 0),
        };
      },
    }),
    {
      name: 'textile-app-v2',
      partialize: (s) => ({
        users: uniqueUsers([defaultOwner(), ...s.users]),
        currentUserId: s.currentUserId,
        products: s.products.map(p => ({ ...p, composition: p.composition ?? '' })),
        invoices: s.invoices.map(normalizeInvoice),
        chatMessages: s.chatMessages.map(normalizeChatMessage),
        notificationReadAtByUser: s.notificationReadAtByUser,
        language: s.language,
      }),
    }
  )
);
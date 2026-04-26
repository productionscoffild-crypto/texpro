// ─── Auth ───────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  phone: string;
  position: string;
  email: string;
  passwordHash: string; // stored as plain text in localStorage demo
  role: 'owner' | 'employee';
  active: boolean;
  createdAt: string;
}

// ─── Products ────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  userId: string;
  name: string;          // название ткани
  composition: string;   // состав ткани
  priceUsd: number;      // цена в USD
  density: number;       // плотность г/м² (характеристика)
  createdAt: string;
}

// ─── Invoices ────────────────────────────────────────────────────────────────
export interface InvoiceLine {
  id: string;
  productId: string;
  productName: string;
  productComposition: string;
  productDensity: number;
  quantityKg: number;    // количество в кг
  priceUsd: number;      // цена за кг в USD
  lineTotalUsd: number;  // quantityKg × priceUsd
}

export interface Invoice {
  id: string;
  userId: string;
  number: string;        // ИНВ-2025-0001
  clientName: string;
  clientInfo: string;    // доп. инфо о клиенте
  lines: InvoiceLine[];
  usdRate: number;       // курс USD→RUB на момент создания
  totalUsd: number;
  totalRub: number;
  status: 'draft' | 'processing' | 'shipped' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}

// ─── Internal chat ───────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  scope: 'general' | 'direct';
  kind: 'text' | 'voice' | 'file';
  fromUserId: string;
  toUserId?: string;
  text: string;
  audioDataUrl?: string;
  durationSec?: number;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileDataUrl?: string;
  editedAt?: string;
  createdAt: string;
}

// ─── App state ───────────────────────────────────────────────────────────────
export type Page = 'dashboard' | 'analytics' | 'products' | 'invoices' | 'invoice-new' | 'invoice-detail' | 'employees' | 'chat' | 'profile';

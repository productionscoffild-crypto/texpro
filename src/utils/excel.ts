import * as XLSX from 'xlsx';
import { Invoice, Product, User } from '../types';
import { statusLabel } from '../components/ui/Status';

const dateRu = (iso: string) => new Date(iso).toLocaleDateString('ru-RU');

function saveWorkbook(fileName: string, sheets: { name: string; rows: Record<string, string | number>[] }[]) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{ Данные: 'Нет данных' }]);
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    worksheet['!cols'] = Array.from({ length: range.e.c + 1 }, (_, colIndex) => {
      let maxWidth = 12;
      for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
        const value = cell?.v ? String(cell.v) : '';
        maxWidth = Math.max(maxWidth, Math.min(value.length + 2, 42));
      }
      return { wch: maxWidth };
    });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  });

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.target = '_self';
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportProductsExcel(products: Product[]) {
  saveWorkbook('Товары.xlsx', [
    {
      name: 'Товары',
      rows: products.map(product => ({
        Название: product.name,
        Состав: product.composition || '',
        'Цена USD/кг': product.priceUsd,
        'Плотность г/м2': product.density,
        'Дата создания': dateRu(product.createdAt),
      })),
    },
  ]);
}

export function exportInvoicesExcel(invoices: Invoice[], users: User[]) {
  const userName = (id: string) => users.find(user => user.id === id)?.name || 'Неизвестно';
  saveWorkbook('Накладные.xlsx', [
    {
      name: 'Накладные',
      rows: invoices.map(invoice => ({
        Номер: invoice.number,
        Клиент: invoice.clientName,
        Менеджер: userName(invoice.userId),
        Статус: statusLabel(invoice.status),
        'Курс USD/RUB': invoice.usdRate,
        'Итого USD': invoice.totalUsd,
        'Итого RUB': invoice.totalRub,
        Дата: dateRu(invoice.createdAt),
      })),
    },
    {
      name: 'Позиции',
      rows: invoices.flatMap(invoice => invoice.lines.map(line => ({
        Накладная: invoice.number,
        Клиент: invoice.clientName,
        Товар: line.productName,
        Состав: line.productComposition || '',
        'Плотность г/м2': line.productDensity,
        'Количество кг': line.quantityKg,
        'Цена USD/кг': line.priceUsd,
        'Цена RUB/кг': line.priceUsd * invoice.usdRate,
        'Сумма USD': line.lineTotalUsd,
        'Сумма RUB': line.lineTotalUsd * invoice.usdRate,
        Дата: dateRu(invoice.createdAt),
      }))),
    },
  ]);
}

export function exportAnalyticsExcel(params: {
  invoices: Invoice[];
  products: Product[];
  users: User[];
  productRows: { name: string; kg: number; usd: number; rub: number; share: number }[];
  managerRows: { name: string; invoices: number; kg: number; usd: number; rub: number }[];
  monthLabel: string;
}) {
  const { invoices, products, users, productRows, managerRows, monthLabel } = params;
  const totalUsd = invoices.reduce((sum, invoice) => sum + invoice.totalUsd, 0);
  const totalRub = invoices.reduce((sum, invoice) => sum + invoice.totalRub, 0);
  const totalKg = invoices.reduce((sum, invoice) => sum + invoice.lines.reduce((lineSum, line) => lineSum + line.quantityKg, 0), 0);

  saveWorkbook('Аналитика.xlsx', [
    {
      name: 'Итоги',
      rows: [
        { Показатель: 'Накладные', Значение: invoices.length },
        { Показатель: 'Продажи USD', Значение: totalUsd },
        { Показатель: 'Продажи RUB', Значение: totalRub },
        { Показатель: 'Килограммы', Значение: totalKg },
        { Показатель: 'Товары в прайсе', Значение: products.length },
      ],
    },
    {
      name: 'Продажи по товарам',
      rows: productRows.map(row => ({
        Товар: row.name,
        'Кг': row.kg,
        USD: row.usd,
        RUB: row.rub,
        'Доля %': row.share,
      })),
    },
    {
      name: 'Менеджеры за месяц',
      rows: managerRows.map(row => ({
        Месяц: monthLabel,
        Менеджер: row.name,
        Накладные: row.invoices,
        'Кг': row.kg,
        USD: row.usd,
        RUB: row.rub,
      })),
    },
    {
      name: 'Пользователи',
      rows: users.map(user => ({
        Имя: user.name,
        Email: user.email,
        Роль: user.role === 'owner' ? 'Руководитель' : 'Сотрудник',
        Активен: user.active ? 'Да' : 'Нет',
      })),
    },
  ]);
}
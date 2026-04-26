import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtRUB = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

const statusText: Record<string, string> = {
  draft: 'Черновик',
  processing: 'В обработке',
  shipped: 'Отгружено',
  paid:  'Оплачено',
  cancelled: 'Отменено',
};

const invoiceHtml = (invoice: Invoice) => {
  const rows = invoice.lines.map((line, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td><b>${line.productName}</b><br><span>Плотность: ${line.productDensity} г/м²</span></td>
      <td class="r">${fmtRUB(line.quantityKg)} кг</td>
      <td class="r">$${fmtRUB(line.priceUsd)}</td>
      <td class="r">${fmtRUB(line.priceUsd * invoice.usdRate)} ₽</td>
      <td class="r b">$${fmtRUB(line.lineTotalUsd)}</td>
      <td class="r">${fmtRUB(line.lineTotalUsd * invoice.usdRate)} ₽</td>
    </tr>`).join('');

  return `<div class="pdf-page">
    <style>
      .pdf-page{width:794px;min-height:1123px;background:white;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:0 0 28px 0;box-sizing:border-box}
      .pdf-head{background:#2563eb;color:#fff;padding:26px 34px;display:flex;justify-content:space-between;align-items:center}
      .pdf-head h1{font-size:24px;margin:0;font-weight:800}.pdf-head p{margin:4px 0 0;font-size:13px;opacity:.85}.num{text-align:right}.num b{font-size:18px}
      .pdf-body{padding:28px 34px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;border-bottom:1px solid #e5e7eb;padding-bottom:18px;margin-bottom:20px}
      .label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;font-weight:800;margin-bottom:6px}.value{font-size:16px;font-weight:800;color:#111827}.sub{font-size:13px;color:#6b7280;margin-top:4px;line-height:1.4}
      table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f8fafc;color:#6b7280;text-transform:uppercase;font-size:10px;letter-spacing:.04em;text-align:left;padding:9px 8px;border-bottom:1px solid #e5e7eb}td{padding:10px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}tr:nth-child(even){background:#fafbfc}td span{color:#6b7280;font-size:11px}.r{text-align:right}.c{text-align:center;color:#6b7280}.b{font-weight:800;color:#111827}
      .tot{display:flex;justify-content:flex-end;margin-top:24px}.box{width:290px;background:#f8fafc;border-radius:14px;padding:16px 18px}.row{display:flex;justify-content:space-between;font-size:14px;color:#4b5563;padding:4px 0}.main{border-top:1px solid #dbe2ea;margin-top:8px;padding-top:12px;font-size:18px;font-weight:900;color:#2563eb}.foot{margin-top:42px;text-align:center;color:#cbd5e1;font-size:11px;border-top:1px solid #f1f5f9;padding-top:12px}
    </style>
    <div class="pdf-head"><div><h1>ТекстильПро</h1><p>Оптовые продажи тканей</p></div><div class="num"><b>${invoice.number}</b><p>Накладная</p></div></div>
    <div class="pdf-body">
      <div class="meta"><div><div class="label">Клиент</div><div class="value">${invoice.clientName}</div>${invoice.clientInfo ? `<div class="sub">${invoice.clientInfo}</div>` : ''}</div><div><div class="label">Информация</div><div class="value">${fmtDate(invoice.createdAt)}</div><div class="sub">Статус: ${statusText[invoice.status]}<br>Курс: 1 USD = ${fmtRUB(invoice.usdRate)} ₽</div></div></div>
      <table><thead><tr><th class="c">#</th><th>Товар</th><th class="r">Кол-во</th><th class="r">Цена USD</th><th class="r">Цена RUB</th><th class="r">Сумма USD</th><th class="r">Сумма RUB</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot"><div class="box"><div class="row"><span>Итого USD</span><b>$${fmtRUB(invoice.totalUsd)}</b></div><div class="row main"><span>Итого RUB</span><span>${fmtRUB(invoice.totalRub)} ₽</span></div></div></div>
      <div class="foot">ТекстильПро · ${invoice.number} · PDF для клиента</div>
    </div>
  </div>`;
};

function downloadPdfBlob(pdf: jsPDF, fileName: string): void {
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.target = '_self';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function generateFallbackPdf(invoice: Invoice): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  let y = 18;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('TextilePro Invoice', 14, y);
  y += 9;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`No: ${invoice.number}`, 14, y);
  y += 6;
  pdf.text(`Date: ${fmtDate(invoice.createdAt)}`, 14, y);
  y += 6;
  pdf.text(`USD/RUB rate: ${fmtRUB(invoice.usdRate)}`, 14, y);
  y += 6;
  pdf.text(`Client: ${invoice.clientName}`, 14, y);
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Items', 14, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  invoice.lines.forEach((line, idx) => {
    const name = line.productName.replace(/[А-Яа-яЁё]/g, '?');
    pdf.text(`${idx + 1}. ${name}`, 14, y);
    y += 5;
    pdf.text(`Qty: ${line.quantityKg.toFixed(3)} kg | Price: $${fmtRUB(line.priceUsd)} | RUB/kg: ${fmtRUB(line.priceUsd * invoice.usdRate)}`, 18, y);
    y += 5;
    pdf.text(`Total: $${fmtRUB(line.lineTotalUsd)} | ${fmtRUB(line.lineTotalUsd * invoice.usdRate)} RUB`, 18, y);
    y += 7;
    if (y > 275) { pdf.addPage(); y = 18; }
  });
  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`TOTAL USD: $${fmtRUB(invoice.totalUsd)}`, 14, y);
  y += 7;
  pdf.text(`TOTAL RUB: ${fmtRUB(invoice.totalRub)} RUB`, 14, y);
  downloadPdfBlob(pdf, `${invoice.number}.pdf`);
}

export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = '794px';
  wrapper.style.background = '#ffffff';
  wrapper.style.zIndex = '-1';
  wrapper.style.pointerEvents = 'none';
  wrapper.innerHTML = invoiceHtml(invoice);
  document.body.appendChild(wrapper);

  try {
    const page = wrapper.firstElementChild as HTMLElement;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const canvasPromise = html2canvas(page, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 794,
      windowHeight: Math.max(1123, page.scrollHeight),
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF generation timeout')), 8000)
    );
    try {
      const canvas = await Promise.race([canvasPromise, timeoutPromise]);
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      const scale = imgH > pdfH ? pdfH / imgH : 1;
      const renderW = pdfW * scale;
      const renderH = imgH * scale;
      const x = (pdfW - renderW) / 2;
      pdf.addImage(img, 'PNG', x, 0, renderW, renderH);
      downloadPdfBlob(pdf, `${invoice.number}.pdf`);
    } catch (error) {
      console.warn('HTML PDF failed, using fallback PDF', error);
      generateFallbackPdf(invoice);
    }
  } finally {
    document.body.removeChild(wrapper);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// printInvoice — opens a print window with full Cyrillic HTML (no encoding issues)
// ─────────────────────────────────────────────────────────────────────────────
export function printInvoice(invoice: Invoice): void {
  const fmtN = (n: number, d = 2) =>
    new Intl.NumberFormat('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

  const rows = invoice.lines.map((line, i) => `
    <tr>
      <td style="text-align:center;color:#6b7280">${i + 1}</td>
      <td><strong>${line.productName}</strong><br>
        <small style="color:#6b7280">Плотность: ${line.productDensity} г/м²</small>
      </td>
      <td style="text-align:right">${fmtN(line.quantityKg, 3)} кг</td>
      <td style="text-align:right">$${fmtN(line.priceUsd)}</td>
      <td style="text-align:right;color:#4b5563">${fmtN(line.priceUsd * invoice.usdRate)} ₽</td>
      <td style="text-align:right;font-weight:700">$${fmtN(line.lineTotalUsd)}</td>
      <td style="text-align:right;color:#4b5563">${fmtN(line.lineTotalUsd * invoice.usdRate)} ₽</td>
    </tr>
  `).join('');

  const statusMap: Record<string,string> = { draft:'Черновик', processing:'В обработке', shipped:'Отгружено', paid:'Оплачено', cancelled:'Отменено' };

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${invoice.number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#fff;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .header{background:#2563eb;color:#fff;padding:20px 28px;display:flex;justify-content:space-between;align-items:center}
  .header h1{font-size:20px;font-weight:800;letter-spacing:-.02em}
  .header .sub{font-size:12px;opacity:.8;margin-top:3px}
  .header .num{text-align:right}
  .header .num-big{font-size:16px;font-weight:700}
  .content{padding:24px 28px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;padding-bottom:16px;border-bottom:1.5px solid #e5e7eb}
  .meta-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:4px}
  .meta-value{font-size:14px;font-weight:600;color:#111}
  .meta-sub{font-size:12px;color:#6b7280;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{background:#f8fafc;padding:9px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:1.5px solid #e5e7eb}
  tbody td{padding:10px 12px;border-bottom:1px solid #f1f5f9}
  tbody tr:nth-child(even){background:#fafbfc}
  .totals{margin-top:20px;display:flex;justify-content:flex-end}
  .totals-box{min-width:260px;background:#f8fafc;border-radius:12px;padding:14px 18px}
  .tot-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px;color:#4b5563}
  .tot-row.main{font-size:16px;font-weight:800;color:#2563eb;border-top:1.5px solid #e5e7eb;margin-top:6px;padding-top:10px}
  .rate-note{font-size:11px;color:#9ca3af;text-align:right;margin-top:8px}
  .sigs{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig-line{border-top:1px solid #d1d5db;padding-top:6px;font-size:11px;color:#9ca3af}
  .footer{margin-top:32px;text-align:center;font-size:11px;color:#d1d5db;border-top:1px solid #f1f5f9;padding-top:12px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>ТекстильПро</h1>
    <div class="sub">Оптовые продажи тканей</div>
  </div>
  <div class="num">
    <div class="num-big">${invoice.number}</div>
    <div class="sub">Накладная</div>
  </div>
</div>

<div class="content">
  <div class="meta">
    <div>
      <div class="meta-label">Клиент</div>
      <div class="meta-value">${invoice.clientName}</div>
      ${invoice.clientInfo ? `<div class="meta-sub">${invoice.clientInfo}</div>` : ''}
    </div>
    <div>
      <div class="meta-label">Реквизиты накладной</div>
      <div class="meta-value">Дата: ${new Date(invoice.createdAt).toLocaleDateString('ru-RU')}</div>
      <div class="meta-sub">Статус: ${statusMap[invoice.status]}</div>
      <div class="meta-sub">Курс: 1 USD = ${invoice.usdRate.toFixed(2)} ₽</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:32px;text-align:center">#</th>
        <th>Наименование</th>
        <th style="text-align:right">Кол-во (кг)</th>
        <th style="text-align:right">Цена USD/кг</th>
        <th style="text-align:right">Цена RUB/кг</th>
        <th style="text-align:right">Сумма USD</th>
        <th style="text-align:right">Сумма RUB</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="tot-row">
        <span>Итого (USD):</span>
        <strong>$${fmtN(invoice.totalUsd)}</strong>
      </div>
      <div class="tot-row main">
        <span>Итого (RUB):</span>
        <span>${fmtN(invoice.totalRub)} ₽</span>
      </div>
      <div class="rate-note">Курс на дату накладной: 1 USD = ${invoice.usdRate.toFixed(2)} ₽</div>
    </div>
  </div>

  <div class="sigs">
    <div class="sig-line">Покупатель</div>
    <div class="sig-line">Продавец</div>
  </div>

  <div class="footer">
    ТекстильПро · Накладная ${invoice.number} · Дата печати: ${new Date().toLocaleDateString('ru-RU')}
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),200);</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Разрешите всплывающие окна в браузере'); return; }
  w.document.write(html);
  w.document.close();
}

import { Order } from '../types/labpath';

export function formatPKR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    return `${TENS[Math.floor(n / 10)]}${n % 10 !== 0 ? ' ' + ONES[n % 10] : ''}`;
  }
  return `${ONES[Math.floor(n / 100)]} Hundred${
    n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : ''
  }`;
}

export function numberToWordsPKR(amount: number): string {
  const num = Math.round(amount);
  if (num <= 0) return 'Rupees Zero Only';

  let remaining = num;
  const parts: string[] = [];

  const লাখ = Math.floor(remaining / 100000);
  if (লাখ > 0) {
    parts.push(`${convertLessThanThousand(লাখ)} Lakh`);
    remaining %= 100000;
  }

  const thousand = Math.floor(remaining / 1000);
  if (thousand > 0) {
    parts.push(`${convertLessThanThousand(thousand)} Thousand`);
    remaining %= 1000;
  }

  if (remaining > 0) {
    parts.push(convertLessThanThousand(remaining));
  }

  return `Rupees ${parts.join(' ')} Only`;
}

export function generateOrderDocumentHtml(
  order: Order,
  mode: 'INVOICE' | 'CHALLAN'
): string {
  const isChallan = mode === 'CHALLAN';
  const totalQty = order.items.reduce((s, i) => s + i.quantity + (i.bonusQty || 0), 0);

  const rowsHtml = order.items
    .map(
      (item, index) => `
      <tr>
        <td style="text-align:center;font-weight:600;">${index + 1}</td>
        <td>
          <div style="font-weight:700;color:#0f172a;">${item.productName}</div>
          <div style="font-size:11px;color:#475569;">Brand: ${item.brand || 'Standard'} | Code: ${item.sku}</div>
        </td>
        <td style="text-align:center;">${item.packSizeInfo || item.unit}</td>
        <td style="text-align:center;font-weight:600;">${item.allocatedBatchNumber || 'FEFO-STD'}</td>
        <td style="text-align:center;">${item.allocatedBatchExpiry || 'Verified'}</td>
        <td style="text-align:center;font-weight:700;">${item.quantity} ${item.unit}</td>
        <td style="text-align:center;">${item.bonusQty ? item.bonusQty : '-'}</td>
        ${
          !isChallan
            ? `<td style="text-align:right;">${Math.round(item.unitPrice).toLocaleString('en-PK')}</td>
               <td style="text-align:right;font-weight:700;">${Math.round(item.lineTotal).toLocaleString('en-PK')}</td>`
            : `<td style="text-align:center;font-weight:600;color:#15803d;">Checked & Packed</td>`
        }
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${isChallan ? 'Delivery Challan' : 'Commercial Invoice'} - ${order.orderNumber}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      font-size: 12px;
    }
    .outer-border {
      border: 2px solid #0f172a;
      padding: 16px;
    }
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .company-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0;
    }
    .company-tagline {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin-top: 3px;
    }
    .company-address {
      font-size: 11px;
      color: #475569;
      margin-top: 3px;
      line-height: 1.4;
    }
    .doc-box {
      border: 2px solid #0f172a;
      padding: 8px 14px;
      text-align: center;
      min-width: 190px;
    }
    .doc-box-title {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      border-bottom: 1px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
      border: 1px solid #475569;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .info-col {
      flex: 1;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 800;
      padding: 8px 6px;
      border: 1px solid #0f172a;
      font-size: 11px;
      text-transform: uppercase;
    }
    td {
      padding: 7px 6px;
      border: 1px solid #475569;
      vertical-align: middle;
      font-size: 11.5px;
    }
    .bottom-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-top: 10px;
    }
    .terms-box {
      flex: 1.3;
      font-size: 11px;
      color: #334155;
      line-height: 1.45;
    }
    .totals-table {
      width: 280px;
      border-collapse: collapse;
    }
    .totals-table td {
      border: 1px solid #0f172a;
      padding: 6px 10px;
    }
    .net-payable-row {
      background: #e2e8f0;
      font-weight: 900;
      font-size: 14px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 52px;
      padding-top: 10px;
    }
    .sig-block {
      width: 28%;
      border-top: 1.5px solid #0f172a;
      text-align: center;
      padding-top: 6px;
      font-weight: 700;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="outer-border">
    <div class="top-header">
      <div>
        <h1 class="company-title">LABPATH DIAGNOSTICS & SUPPLIES</h1>
        <div class="company-tagline">Importers & Distributors: Biochemistry Reagents, Blood Collection Tubes, Lab Chemicals & Instruments</div>
        <div class="company-address">
          Office #04, Al-Shifa Medical Plaza, Hospital Road, Sukkur, Sindh<br/>
          Sales & Dispatch Desk: 071-5612233 | WhatsApp: 0300-7151122 | Email: orders@labpathsukkur.pk
        </div>
      </div>
      <div class="doc-box">
        <div class="doc-box-title">${isChallan ? 'DELIVERY CHALLAN' : 'COMMERCIAL INVOICE'}</div>
        <div style="text-align:left;font-size:11.5px;line-height:1.5;">
          <strong>${isChallan ? 'Challan No:' : 'Invoice No:'}</strong> ${order.orderNumber}<br/>
          <strong>Date:</strong> ${order.createdAt.slice(0, 10)}<br/>
          <strong>Terms:</strong> ${order.paymentTerms.replace('_', ' ')}<br/>
          <strong>Status:</strong> ${order.status}
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-col">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#475569;">M/S (Buyer / Lab / Hospital Details):</div>
        <div style="font-size:14px;font-weight:800;margin-top:2px;">${order.buyerName}</div>
        <div><strong>Address / Town:</strong> ${order.buyerArea}</div>
        <div><strong>Contact Person:</strong> ${order.buyerContact || 'Lab Incharge'} (${order.buyerPhone || 'N/A'})</div>
      </div>
      <div class="info-col" style="text-align:right;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#475569;">Order & Dispatch Reference:</div>
        <div><strong>Booked By (Sales Rep):</strong> ${order.salespersonName}</div>
        <div><strong>Approved By:</strong> ${order.approvedBy || 'Manager LabPath'}</div>
        <div><strong>Packed / Dispatched By:</strong> ${order.dispatchedBy || 'Main Cold Store Sukkur'}</div>
        <div><strong>Total Packs / Units:</strong> ${totalQty} Units</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:32px;">S#</th>
          <th style="text-align:left;">Item Description & Brand</th>
          <th style="width:85px;">Pack Size</th>
          <th style="width:90px;">Batch / Lot #</th>
          <th style="width:82px;">Expiry</th>
          <th style="width:65px;">Qty</th>
          <th style="width:48px;">Bonus</th>
          ${
            !isChallan
              ? `<th style="width:80px;text-align:right;">Rate (Rs)</th>
                 <th style="width:95px;text-align:right;">Net Amount</th>`
              : `<th style="width:120px;">Store Verification</th>`
          }
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="bottom-grid">
      <div class="terms-box">
        ${
          !isChallan
            ? `<div style="margin-bottom:8px;padding:6px 8px;background:#f1f5f9;border:1px solid #cbd5e1;font-weight:700;">
                 Amount in Words: ${numberToWordsPKR(order.totalAmount)}
               </div>`
            : ''
        }
        <strong>Local Supply Terms & Cold-Chain Note:</strong><br/>
        1. Please check batch numbers, intact seals, and quantities at the time of delivery.<br/>
        2. Temperature-sensitive Biochemistry Reagents (2°C to 8°C) are dispatched with ice gel packs; transfer immediately to lab refrigerator.<br/>
        3. Claims regarding breakage or short supply must be intimated within 24 hours of receipt.
        ${order.adminAdjustmentNote ? `<br/><strong>Order Note:</strong> ${order.adminAdjustmentNote}` : ''}
      </div>

      ${
        !isChallan
          ? `
        <table class="totals-table">
          <tr>
            <td><strong>Gross Amount:</strong></td>
            <td style="text-align:right;font-weight:700;">${formatPKR(order.subtotalAmount)}</td>
          </tr>
          <tr>
            <td><strong>Less Special Discount:</strong></td>
            <td style="text-align:right;">- ${formatPKR(order.extraDiscountAmount)}</td>
          </tr>
          <tr class="net-payable-row">
            <td>NET PAYABLE:</td>
            <td style="text-align:right;">${formatPKR(order.totalAmount)}</td>
          </tr>
        </table>
      `
          : `
        <table class="totals-table">
          <tr>
            <td><strong>Total Line Items:</strong></td>
            <td style="text-align:right;font-weight:700;">${order.items.length} Items</td>
          </tr>
          <tr class="net-payable-row">
            <td>TOTAL QTY PACKED:</td>
            <td style="text-align:right;">${totalQty} Units</td>
          </tr>
        </table>
      `
      }
    </div>

    <div class="signatures">
      <div class="sig-block">Prepared / Billed By (LabPath)</div>
      <div class="sig-block">Store / Cold-Chain Dispatch</div>
      <div class="sig-block">Receiver Signature & Lab Stamp</div>
    </div>
  </div>
</body>
</html>
  `;
}

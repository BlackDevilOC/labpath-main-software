import { Customer, Order } from '../types/labpath';

export function formatPKR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function generateOrderDocumentHtml(
  order: Order,
  customer: Customer | undefined,
  mode: 'INVOICE' | 'CHALLAN'
): string {
  const isChallan = mode === 'CHALLAN';
  const previousBalance = customer ? customer.currentBalance : 0;
  const closingBalance =
    order.status === 'DELIVERED'
      ? previousBalance
      : previousBalance + order.totalAmount;

  const rowsHtml = order.items
    .map(
      (item, index) => `
      <tr>
        <td style="text-align:center;">${index + 1}</td>
        <td>
          <strong>${item.productName}</strong><br/>
          <span style="font-size:11px;color:#64748b;">SKU: ${item.sku} | Unit: ${item.unit}</span>
        </td>
        <td style="text-align:center;">
          ${item.allocatedBatchNumber || 'FEFO Auto'}<br/>
          <span style="font-size:11px;color:#0f766e;">Exp: ${item.allocatedBatchExpiry || 'Verified'}</span>
        </td>
        <td style="text-align:center;font-weight:700;">${item.quantity}</td>
        ${
          !isChallan
            ? `<td style="text-align:right;">${formatPKR(item.unitPrice)}</td>
               <td style="text-align:right;font-weight:700;">${formatPKR(item.lineTotal)}</td>`
            : `<td style="text-align:center;">Checked & Packed</td>`
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
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 24px;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0d9488;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f766e;
      margin: 0;
    }
    .brand-sub {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
    }
    .doc-badge {
      background: #0f766e;
      color: white;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      text-align: right;
    }
    .meta-grid {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 10px 8px;
      border: 1px solid #cbd5e1;
      font-size: 12px;
    }
    td {
      padding: 9px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    .totals-box {
      width: 320px;
      margin-left: auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-row.highlight {
      background: #f0fdfa;
      font-weight: 800;
      font-size: 15px;
      color: #0f766e;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding-top: 12px;
    }
    .sig-line {
      width: 200px;
      border-top: 1px solid #64748b;
      text-align: center;
      padding-top: 6px;
      font-size: 12px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">LABPATH DIAGNOSTICS & SUPPLIES</h1>
      <div class="brand-sub">Biochemistry Reagents, Vacutainers, Lab Equipment & Chemicals</div>
      <div class="brand-sub">Hospital Road, Sukkur, Sindh | Helpline: +92 300 7150000</div>
    </div>
    <div>
      <div class="doc-badge">${isChallan ? 'DELIVERY CHALLAN' : 'COMMERCIAL INVOICE'}</div>
      <div style="margin-top:8px;text-align:right;font-size:12px;">
        <strong>No:</strong> ${order.orderNumber}<br/>
        <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-PK')}<br/>
        <strong>Status:</strong> ${order.status}
      </div>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Billed / Delivered To</div>
      <div style="font-size:15px;font-weight:800;margin-top:2px;">${order.customerName}</div>
      <div style="color:#475569;">Area: ${order.customerArea}</div>
      ${customer ? `<div style="color:#475569;">Contact: ${customer.contactPerson} (${customer.phone})</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">Sales & Dispatch Info</div>
      <div><strong>Sales Rep:</strong> ${order.salespersonName}</div>
      <div><strong>Approved By:</strong> ${order.approvedBy || 'Admin Manager'}</div>
      <div><strong>Cold-Chain Checked:</strong> Yes (2°C - 8°C Verified)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px;">#</th>
        <th style="text-align:left;">Item Description / Pack</th>
        <th style="width:140px;">Batch # & Expiry</th>
        <th style="width:65px;">Qty</th>
        ${
          !isChallan
            ? `<th style="width:105px;text-align:right;">Unit Rate</th>
               <th style="width:115px;text-align:right;">Total</th>`
            : `<th style="width:130px;">Dispatch Check</th>`
        }
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${
    !isChallan
      ? `
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal:</span>
        <strong>${formatPKR(order.subtotalAmount)}</strong>
      </div>
      <div class="totals-row">
        <span>Special Discount:</span>
        <strong>- ${formatPKR(order.extraDiscountAmount)}</strong>
      </div>
      <div class="totals-row highlight">
        <span>Net Invoice Total:</span>
        <span>${formatPKR(order.totalAmount)}</span>
      </div>
      <div class="totals-row">
        <span>Previous Khata Balance:</span>
        <span>${formatPKR(previousBalance)}</span>
      </div>
      <div class="totals-row" style="background:#fef2f2;color:#991b1b;font-weight:700;">
        <span>Closing Khata Balance:</span>
        <span>${formatPKR(closingBalance)}</span>
      </div>
    </div>
  `
      : `<div style="padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;color:#166534;">
           <strong>Warehouse Note:</strong> Please verify intact seals and cold-chain ice packs for Biochemistry Reagents upon receipt.
         </div>`
  }

  <div class="signatures">
    <div class="sig-line">Prepared / Packed By (LabPath)</div>
    <div class="sig-line">Authorized Manager Signature</div>
    <div class="sig-line">Receiver Sign & Lab Stamp</div>
  </div>
</body>
</html>
  `;
}

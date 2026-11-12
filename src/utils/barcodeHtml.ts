/**
 * Clean Local Thermal Barcode Generator (Pure Black & White SVG)
 * Works on any local thermal label printer (Xprinter, Zebra, TSC 50x25mm / 40x30mm)
 * or standard laser/inkjet sticker sheet.
 */

export interface BarcodeLabelData {
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  mfgDate?: string;
  unit: string;
}

/**
 * Generates deterministic high-contrast bar widths from a code string
 * so scanners & thermal printers render crisp vertical bars.
 */
export function generateBarcodeBars(code: string): number[] {
  const clean = (code || 'LP-000').toUpperCase();
  // Start guard pattern
  const bars: number[] = [2, 1, 1, 2, 1, 1];
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    bars.push(((charCode >> 0) & 1) + 1);
    bars.push(((charCode >> 1) & 1) + 1);
    bars.push(((charCode >> 2) & 1) + 1);
    bars.push(((charCode >> 3) & 1) + 1);
    bars.push(((charCode >> 4) & 1) + 1);
    bars.push(1);
  }
  // Stop guard pattern
  bars.push(2, 1, 1, 1, 2, 2);
  return bars;
}

export function generateBarcodeSvgMarkup(code: string, height: number = 42): string {
  const bars = generateBarcodeBars(code);
  const totalUnits = bars.reduce((sum, w) => sum + w, 0);
  const unitWidth = 2;
  const svgWidth = totalUnits * unitWidth;

  let currentX = 0;
  const rects: string[] = [];

  for (let i = 0; i < bars.length; i++) {
    const w = bars[i] * unitWidth;
    // Even indices are black bars, odd indices are white spaces
    if (i % 2 === 0) {
      rects.push(
        `<rect x="${currentX}" y="0" width="${w}" height="${height}" fill="#000000" />`
      );
    }
    currentX += w;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height}" width="100%" height="${height}" preserveAspectRatio="none">${rects.join(
    ''
  )}</svg>`;
}

export function generateThermalBarcodePrintHtml(
  label: BarcodeLabelData,
  copies: number = 1,
  layout: 'THERMAL_50X25' | 'SHEET_GRID' = 'THERMAL_50X25'
): string {
  const barcodeCode = `${label.sku}-${label.batchNumber}`;
  const svgMarkup = generateBarcodeSvgMarkup(barcodeCode, 38);
  const safeCopies = Math.min(100, Math.max(1, copies));

  const singleStickerHtml = `
    <div class="label-box">
      <div class="top-brand">LABPATH SUKKUR</div>
      <div class="item-name">${label.productName.slice(0, 34)}</div>
      <div class="barcode-wrap">${svgMarkup}</div>
      <div class="code-text">${barcodeCode}</div>
      <div class="meta-row">
        <span>BATCH: ${label.batchNumber}</span>
        <span>EXP: ${label.expiryDate}</span>
      </div>
    </div>
  `;

  const labelsHtml = Array.from({ length: safeCopies })
    .map(() => singleStickerHtml)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Labels - ${barcodeCode}</title>
  <style>
    @page {
      margin: ${layout === 'THERMAL_50X25' ? '2mm' : '8mm'};
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 4px;
    }
    .container {
      display: ${layout === 'SHEET_GRID' ? 'flex' : 'block'};
      flex-wrap: wrap;
      gap: 8px;
    }
    .label-box {
      width: 48mm;
      height: 24mm;
      border: 1px solid #000000;
      padding: 2mm 2.5mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      margin-bottom: ${layout === 'THERMAL_50X25' ? '3mm' : '0'};
    }
    .top-brand {
      font-size: 7.5pt;
      font-weight: 900;
      text-align: center;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #000;
      padding-bottom: 1px;
    }
    .item-name {
      font-size: 7.5pt;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
    .barcode-wrap {
      width: 100%;
      height: 9mm;
      margin: 1px 0;
    }
    .code-text {
      font-size: 7pt;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.8px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <div class="container">
    ${labelsHtml}
  </div>
</body>
</html>
  `;
}


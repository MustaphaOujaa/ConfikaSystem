import React, { useState } from 'react';
import { Printer, Copy, Check, Barcode as BarcodeIcon } from 'lucide-react';
import Modal from './Modal';

// Code 128 Table B encoding patterns
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 106=Stop)
];

function encodeCode128B(text) {
  const clean = String(text || '').trim();
  if (!clean) return null;

  const codes = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const val = charCode - 32;
    if (val >= 0 && val <= 95) {
      codes.push(val);
      checksum += val * (i + 1);
    } else {
      // Fallback for non-printable ascii
      const safeVal = 0;
      codes.push(safeVal);
      checksum += safeVal * (i + 1);
    }
  }

  const checkDigit = checksum % 103;
  codes.push(checkDigit);
  codes.push(106); // Stop code

  let patternStr = "";
  for (const code of codes) {
    patternStr += CODE128_PATTERNS[code] || "111111";
  }

  return patternStr;
}

export default function BarcodeLabelModal({ isOpen, onClose, product }) {
  const [printCopies, setPrintCopies] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  const barcodePattern = encodeCode128B(product.barcode);

  // Convert width modules into SVG bars
  const renderSvgBars = () => {
    if (!barcodePattern) return null;

    let x = 10;
    const barHeight = 55;
    const elements = [];

    for (let i = 0; i < barcodePattern.length; i++) {
      const width = parseInt(barcodePattern[i], 10);
      const isBar = i % 2 === 0; // Alternates bar (black) and space (white)
      if (isBar) {
        elements.push(
          <rect
            key={i}
            x={x}
            y={5}
            width={width * 1.5}
            height={barHeight}
            fill="#000"
          />
        );
      }
      x += width * 1.5;
    }

    return { elements, totalWidth: x + 10 };
  };

  const svgData = renderSvgBars();

  const handleCopyBarcode = () => {
    if (product.barcode) {
      navigator.clipboard.writeText(product.barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=600');
    if (!printWindow) return;

    const labelsHtml = Array.from({ length: Math.max(1, printCopies) })
      .map(() => `
        <div class="label-item">
          <div class="company-name">CONFIKA SYSTEM</div>
          <div class="product-name">${product.name}</div>
          ${product.brand ? `<div class="product-brand">${product.brand.name || ''}</div>` : ''}
          <div class="barcode-wrapper">
            <svg viewBox="0 0 ${svgData?.totalWidth || 200} 70" class="barcode-svg">
              ${document.getElementById('product-barcode-svg')?.innerHTML || ''}
            </svg>
          </div>
          <div class="barcode-digits">${product.barcode}</div>
          <div class="product-price">${Number(product.price).toFixed(2)} MAD</div>
        </div>
      `)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquettes Code-Barres - ${product.name}</title>
        <style>
          @page {
            size: auto;
            margin: 5mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: flex-start;
          }
          .label-item {
            width: 58mm;
            height: 38mm;
            border: 1px dashed #ccc;
            padding: 4px 6px;
            box-sizing: border-box;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            background: #fff;
          }
          .company-name {
            font-size: 8px;
            font-weight: 700;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .product-name {
            font-size: 11px;
            font-weight: bold;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .product-brand {
            font-size: 9px;
            color: #555;
          }
          .barcode-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-svg {
            max-width: 95%;
            height: 38px;
          }
          .barcode-digits {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 1px;
          }
          .product-price {
            font-size: 13px;
            font-weight: 900;
            color: #000;
          }
          @media print {
            .label-item {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Générateur d'Étiquette Code-Barres">
      <div style={styles.modalContent}>
        {/* Preview Card */}
        <div style={styles.previewCard}>
          <div style={styles.storeName}>CONFIKA SYSTEM</div>
          <div style={styles.prodName}>{product.name}</div>
          {product.brand && <div style={styles.prodBrand}>{product.brand.name}</div>}

          {/* SVG Barcode */}
          <div style={styles.svgContainer}>
            <svg
              id="product-barcode-svg"
              viewBox={`0 0 ${svgData?.totalWidth || 200} 70`}
              style={styles.svg}
            >
              {svgData?.elements}
            </svg>
          </div>

          <div style={styles.barcodeText}>
            <span>{product.barcode}</span>
            <button
              onClick={handleCopyBarcode}
              title="Copier le code-barres"
              style={styles.copyBtn}
            >
              {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
            </button>
          </div>

          <div style={styles.priceTag}>
            {Number(product.price).toFixed(2)} MAD
          </div>
        </div>

        {/* Print Controls */}
        <div style={styles.controls}>
          <div style={styles.copiesInputWrapper}>
            <label style={styles.label}>Nombre d'exemplaires à imprimer :</label>
            <input
              type="number"
              min="1"
              max="100"
              value={printCopies}
              onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
              style={styles.copiesInput}
            />
          </div>

          <div style={styles.actionRow}>
            <button onClick={onClose} style={styles.cancelBtn}>
              Fermer
            </button>
            <button onClick={handlePrint} style={styles.printBtn}>
              <Printer size={16} style={{ marginRight: '6px' }} />
              Imprimer les Étiquettes ({printCopies})
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const styles = {
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center',
  },
  previewCard: {
    width: '280px',
    backgroundColor: '#ffffff',
    border: '2px dashed #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  storeName: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  prodName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '2px',
  },
  prodBrand: {
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '8px',
  },
  svgContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    margin: '8px 0',
  },
  svg: {
    width: '100%',
    maxHeight: '60px',
  },
  barcodeText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    letterSpacing: '1.5px',
    marginTop: '2px',
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    color: '#64748b',
  },
  priceTag: {
    marginTop: '10px',
    fontSize: '18px',
    fontWeight: '800',
    color: '#dc2626',
  },
  controls: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  copiesInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569',
  },
  copiesInput: {
    width: '65px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    width: '100%',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#475569',
    fontWeight: '500',
    cursor: 'pointer',
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
  },
};

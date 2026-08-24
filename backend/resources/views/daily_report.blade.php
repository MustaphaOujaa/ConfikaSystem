<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Journalier des Ventes - {{ $date }} - Confika System</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            color: #111827;
            padding: 24px;
            margin: 0;
            display: flex;
            justify-content: center;
        }

        .report-sheet {
            width: 100%;
            max-width: 850px;
            background-color: #ffffff;
            padding: 32px 36px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }

        /* Header */
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 18px;
            margin-bottom: 20px;
        }

        .brand-section {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .logo {
            max-height: 52px;
            object-fit: contain;
        }

        .company-title {
            font-size: 22px;
            font-weight: 800;
            color: #dc2626;
            letter-spacing: -0.5px;
            margin: 0;
        }

        .company-sub {
            font-size: 12px;
            color: #6b7280;
            margin-top: 2px;
        }

        .meta-section {
            text-align: right;
        }

        .report-type {
            font-size: 15px;
            font-weight: 700;
            color: #111827;
            text-transform: uppercase;
        }

        .date-badge {
            display: inline-block;
            background-color: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 700;
            margin-top: 5px;
        }

        .print-date {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 4px;
        }

        /* KPI Cards Summary */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }

        .kpi-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px 14px;
            text-align: center;
        }

        .kpi-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .kpi-val {
            font-size: 16px;
            font-weight: 800;
            color: #111827;
        }

        .kpi-card-profit {
            background-color: #f0fdf4;
            border-color: #bbf7d0;
        }

        .kpi-card-profit .kpi-val {
            color: #16a34a;
        }

        .kpi-card-revenue {
            background-color: #eff6ff;
            border-color: #bfdbfe;
        }

        .kpi-card-revenue .kpi-val {
            color: #2563eb;
        }

        /* Section Title */
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 20px 0 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .section-count {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: none;
        }

        /* Data Table (Multi-page friendly) */
        table.report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 24px;
            page-break-inside: auto;
        }

        table.report-table thead {
            display: table-header-group;
        }

        table.report-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }

        table.report-table th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10.5px;
            padding: 8px 10px;
            border-top: 1px solid #d1d5db;
            border-bottom: 2px solid #9ca3af;
            text-align: left;
            letter-spacing: 0.3px;
        }

        table.report-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
            color: #1f2937;
        }

        table.report-table tr:nth-child(even) {
            background-color: #fafafa;
        }

        .col-index { width: 30px; text-align: center; color: #9ca3af; }
        .col-product { font-weight: 600; color: #111827; }
        .col-barcode { font-family: monospace; font-size: 10.5px; color: #6b7280; }
        .col-qty { text-align: center; font-weight: 700; }
        .col-price { text-align: right; }
        .col-total { text-align: right; font-weight: 700; }
        .col-profit { text-align: right; font-weight: 700; color: #16a34a; }

        .empty-table {
            text-align: center;
            padding: 30px;
            color: #6b7280;
            font-style: italic;
        }

        /* Table Totals Row */
        .totals-row td {
            background-color: #f9fafb !important;
            border-top: 2px solid #111827 !important;
            border-bottom: 2px solid #111827 !important;
            font-weight: 800 !important;
            font-size: 13px !important;
            padding: 10px !important;
        }

        /* Signatures / Footer */
        .report-footer {
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1px dashed #d1d5db;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 11px;
            color: #6b7280;
            page-break-inside: avoid;
        }

        .signature-box {
            text-align: center;
            width: 200px;
        }

        .signature-line {
            margin-top: 40px;
            border-top: 1px solid #9ca3af;
            padding-top: 4px;
        }

        /* Print Controls */
        .no-print {
            text-align: center;
            margin-top: 24px;
        }

        .btn-print {
            padding: 10px 26px;
            background-color: #dc2626;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(220, 38, 38, 0.25);
        }

        .btn-print:hover {
            background-color: #b91c1c;
        }

        /* Print Specific Media Styles */
        @media print {
            body {
                background: none;
                padding: 0;
                margin: 0;
            }

            .report-sheet {
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }

            .no-print {
                display: none !important;
            }

            table.report-table {
                page-break-inside: auto;
            }

            table.report-table thead {
                display: table-header-group;
            }

            table.report-table tr {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="report-sheet">
        <!-- Header -->
        <div class="report-header">
            <div class="brand-section">
                <img src="/logo.jpeg" alt="Logo" class="logo" onerror="this.style.display='none'">
                <div>
                    <h1 class="company-title">CONFIKA SYSTEM</h1>
                    <div class="company-sub">Système de Caisse & Gestion des Stocks</div>
                </div>
            </div>

            <div class="meta-section">
                <div class="report-type">Rapport Journalier des Ventes</div>
                <div class="date-badge">Date : {{ \Carbon\Carbon::parse($date)->format('d/m/Y') }}</div>
                <div class="print-date">Généré le {{ now()->format('d/m/Y à H:i') }}</div>
            </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Articles Vendus</div>
                <div class="kpi-val">{{ $products_sold_count ?? 0 }}</div>
            </div>

            <div class="kpi-card kpi-card-revenue">
                <div class="kpi-label">Chiffre d'Affaires</div>
                <div class="kpi-val">{{ number_format($total_sales_revenue, 2) }} {{ $currency }}</div>
            </div>

            <div class="kpi-card kpi-card-profit">
                <div class="kpi-label">Bénéfice Net (Gain)</div>
                <div class="kpi-val">+{{ number_format($net_profit_today, 2) }} {{ $currency }}</div>
            </div>
        </div>

        <!-- Sold Products Breakdown Table (Multi-Page Capable) -->
        <div class="section-title">
            <span>Détail des Produits Vendus</span>
            <span class="section-count">{{ count($products_sold) }} Référence(s) distincte(s)</span>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th class="col-index">#</th>
                    <th>Article / Code-barres</th>
                    <th>Catégorie</th>
                    <th style="text-align: center;">Qté</th>
                    <th style="text-align: right;">Prix Unit.</th>
                    <th style="text-align: right;">Total Vente</th>
                    <th style="text-align: right;">Gain Net</th>
                </tr>
            </thead>
            <tbody>
                @forelse($products_sold as $index => $item)
                <tr>
                    <td class="col-index">{{ $index + 1 }}</td>
                    <td>
                        <div class="col-product">{{ $item['name'] }}</div>
                        <div class="col-barcode">{{ $item['barcode'] }} {{ $item['brand'] ? '• ' . $item['brand'] : '' }}</div>
                    </td>
                    <td>{{ $item['category'] }}</td>
                    <td class="col-qty">{{ $item['quantity_sold'] }}</td>
                    <td class="col-price">{{ number_format($item['unit_price'], 2) }}</td>
                    <td class="col-total">{{ number_format($item['total_revenue'], 2) }} {{ $currency }}</td>
                    <td class="col-profit">+{{ number_format($item['total_profit'], 2) }}</td>
                </tr>
                @empty
                <tr>
                    <td colspan="7" class="empty-table">
                        Aucune vente enregistrée pour cette journée.
                    </td>
                </tr>
                @endforelse
            </tbody>
            @if(count($products_sold) > 0)
            <tfoot>
                <tr class="totals-row">
                    <td colspan="3" style="text-align: right;">TOTAUX DU JOUR :</td>
                    <td class="col-qty" style="text-align: center;">{{ $products_sold_count }}</td>
                    <td></td>
                    <td class="col-total">{{ number_format($total_sales_revenue, 2) }} {{ $currency }}</td>
                    <td class="col-profit">+{{ number_format($net_profit_today, 2) }} {{ $currency }}</td>
                </tr>
            </tfoot>
            @endif
        </table>

        <!-- Signatures & Verification -->
        <div class="report-footer">
            <div>
                <div>Confika System — Document Officiel de Caisse</div>
                <div>Tous les montants sont exprimés en Dirham Marocain (MAD).</div>
            </div>

            <div class="signature-box">
                <div>Visa Responsable / Caisse</div>
                <div class="signature-line">Signature & Cachet</div>
            </div>
        </div>

        <!-- Print Trigger Button -->
        <div class="no-print">
            <button onclick="window.print()" class="btn-print">Imprimer / Exporter en PDF</button>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>

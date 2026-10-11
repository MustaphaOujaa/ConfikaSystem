<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Mensuel Financier - {{ $month_label }} - Confika System</title>
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
            gap: 10px;
            margin-bottom: 12px;
        }

        .kpi-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px 12px;
            text-align: center;
        }

        .kpi-label {
            font-size: 10.5px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 3px;
            letter-spacing: 0.3px;
        }

        .kpi-val {
            font-size: 15px;
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

        .kpi-card-rep {
            background-color: #f0f9ff;
            border-color: #bae6fd;
        }

        .kpi-card-rep .kpi-val {
            color: #0284c7;
        }

        .kpi-card-expense {
            background-color: #fef2f2;
            border-color: #fecaca;
        }

        .kpi-card-expense .kpi-val {
            color: #dc2626;
        }

        /* Section Title */
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 22px 0 10px 0;
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

        /* Data Table */
        table.report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
            margin-bottom: 22px;
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
            font-size: 10px;
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
        .col-barcode { font-family: monospace; font-size: 10px; color: #6b7280; }
        .col-qty { text-align: center; font-weight: 700; }
        .col-price { text-align: right; }
        .col-total { text-align: right; font-weight: 700; }
        .col-profit { text-align: right; font-weight: 700; color: #16a34a; }

        .empty-table {
            text-align: center;
            padding: 24px;
            color: #6b7280;
            font-style: italic;
        }

        .totals-row td {
            background-color: #f9fafb !important;
            border-top: 2px solid #111827 !important;
            border-bottom: 2px solid #111827 !important;
            font-weight: 800 !important;
            font-size: 12.5px !important;
            padding: 9px 10px !important;
        }

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
                <div class="report-type">Rapport Mensuel d'Activité</div>
                <div class="date-badge">Mois : {{ $month_label }}</div>
                <div class="print-date">Généré le {{ now()->format('d/m/Y à H:i') }}</div>
            </div>
        </div>

        <!-- KPI Summary Cards -->
        <div style="margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                1. Activité Magasin (Ventes POS)
            </div>
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Articles Vendus</div>
                    <div class="kpi-val">{{ $products_sold_count ?? 0 }} ({{ $transactions_count ?? 0 }} vent.)</div>
                </div>

                <div class="kpi-card kpi-card-revenue">
                    <div class="kpi-label">CA Ventes Net</div>
                    <div class="kpi-val">{{ number_format($total_sales_revenue, 2) }} {{ $currency }}</div>
                </div>

                <div class="kpi-card kpi-card-profit">
                    <div class="kpi-label">Bénéfice Ventes (Gain)</div>
                    <div class="kpi-val">+{{ number_format($sales_profit_month ?? $sales_profit ?? 0, 2) }} {{ $currency }}</div>
                </div>
            </div>

            <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin: 12px 0 6px 0; letter-spacing: 0.5px;">
                2. Atelier Réparations
            </div>
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Réparations Clôturées</div>
                    <div class="kpi-val">{{ $reparations_count_month ?? $reparations['count'] ?? 0 }}</div>
                </div>

                <div class="kpi-card kpi-card-rep">
                    <div class="kpi-label">CA Réparations</div>
                    <div class="kpi-val">{{ number_format($reparations_revenue_month ?? $reparations['revenue'] ?? 0, 2) }} {{ $currency }}</div>
                </div>

                <div class="kpi-card kpi-card-profit">
                    <div class="kpi-label">Bénéfice Réparations</div>
                    <div class="kpi-val">+{{ number_format($reparations_profit_month ?? $reparations['profit'] ?? 0, 2) }} {{ $currency }}</div>
                </div>
            </div>

            <div style="font-size: 11px; font-weight: 700; color: #7e22ce; text-transform: uppercase; margin: 12px 0 6px 0; letter-spacing: 0.5px;">
                3. Bilan Consolidé & 4 Indicateurs Clés du Mois
            </div>
            <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="kpi-card kpi-card-revenue">
                    <div class="kpi-label">1. Combien Vendu (CA Total)</div>
                    <div class="kpi-val" style="font-size: 14.5px;">{{ number_format($how_much_sold ?? $grand_total_revenue, 2) }} {{ $currency }}</div>
                </div>

                <div class="kpi-card kpi-card-profit">
                    <div class="kpi-label">2. Combien Gagné (Marge Brute)</div>
                    <div class="kpi-val" style="font-size: 14.5px;">+{{ number_format($how_much_earned ?? $grand_total_gross_profit, 2) }} {{ $currency }}</div>
                </div>

                <div class="kpi-card kpi-card-expense">
                    <div class="kpi-label" style="color: #dc2626;">3. Combien Dépensé (Charges)</div>
                    <div class="kpi-val" style="color: #dc2626; font-size: 14.5px;">-{{ number_format($how_much_spent ?? $total_expenses_month ?? 0, 2) }} {{ $currency }}</div>
                </div>

                <div class="kpi-card kpi-card-profit" style="border-width: 2px; border-color: #16a34a; background-color: #dcfce7;">
                    <div class="kpi-label" style="color: #15803d; font-weight: 800;">4. Gain Réel Fin de Mois</div>
                    <div class="kpi-val" style="color: #15803d; font-size: 15.5px;">+{{ number_format($how_much_gained ?? $grand_total_profit, 2) }} {{ $currency }}</div>
                </div>
            </div>
        </div>

        <!-- 4. Daily Breakdown Calendar Table for the Month -->
        @if(!empty($daily_breakdown))
        <div class="section-title">
            <span>Évolution Quotidienne du Mois (Jour par Jour)</span>
            <span class="section-count">{{ count($daily_breakdown) }} Jours</span>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">Jour</th>
                    <th>Date</th>
                    <th style="text-align: right;">CA Ventes</th>
                    <th style="text-align: right;">CA Rép.</th>
                    <th style="text-align: right;">CA Total</th>
                    <th style="text-align: right;">Marge Brute</th>
                    <th style="text-align: right; color: #dc2626;">Dépenses</th>
                    <th style="text-align: right; color: #16a34a;">Bénéfice Net</th>
                </tr>
            </thead>
            <tbody>
                @foreach($daily_breakdown as $row)
                @if(!$row['is_future'])
                <tr style="{{ $row['is_today'] ? 'background-color: #fefce8; font-weight: 600;' : '' }}">
                    <td style="text-align: center; color: #6b7280;">{{ $row['day'] }}</td>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('d/m/Y') }} ({{ $row['day_name'] }})</td>
                    <td style="text-align: right;">{{ number_format($row['sales_revenue'], 2) }}</td>
                    <td style="text-align: right; color: #0284c7;">{{ number_format($row['reparations_revenue'], 2) }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ number_format($row['combined_revenue'], 2) }}</td>
                    <td style="text-align: right; font-weight: 700;">+{{ number_format($row['gross_profit'], 2) }}</td>
                    <td style="text-align: right; color: #dc2626;">{{ $row['expenses'] > 0 ? '-' . number_format($row['expenses'], 2) : '0.00' }}</td>
                    <td style="text-align: right; font-weight: 800; color: {{ $row['net_profit'] >= 0 ? '#16a34a' : '#dc2626' }};">
                        {{ $row['net_profit'] >= 0 ? '+' : '' }}{{ number_format($row['net_profit'], 2) }}
                    </td>
                </tr>
                @endif
                @endforeach
            </tbody>
            <tfoot>
                <tr class="totals-row">
                    <td colspan="2" style="text-align: right;">TOTAL MOIS :</td>
                    <td style="text-align: right;">{{ number_format($total_sales_revenue, 2) }}</td>
                    <td style="text-align: right; color: #0284c7;">{{ number_format($reparations_revenue_month ?? $reparations['revenue'], 2) }}</td>
                    <td style="text-align: right;">{{ number_format($how_much_sold ?? $grand_total_revenue, 2) }}</td>
                    <td style="text-align: right; color: #2563eb;">+{{ number_format($how_much_earned ?? $grand_total_gross_profit, 2) }}</td>
                    <td style="text-align: right; color: #dc2626;">-{{ number_format($how_much_spent ?? $total_expenses_month, 2) }}</td>
                    <td style="text-align: right; color: #16a34a;">+{{ number_format($how_much_gained ?? $grand_total_profit, 2) }}</td>
                </tr>
            </tfoot>
        </table>
        @endif

        <!-- Sold Products Table -->
        <div class="section-title">
            <span>Détail des Produits Vendus (Magasin)</span>
            <span class="section-count">{{ count($products_sold) }} Référence(s)</span>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th class="col-index">#</th>
                    <th>Article / Code-barres</th>
                    <th>Catégorie</th>
                    <th style="text-align: center;">Qté</th>
                    <th style="text-align: right;">Prix Moyen</th>
                    <th style="text-align: right;">Total Vente (CA)</th>
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
                    <td colspan="7" class="empty-table">Aucune vente enregistrée pour ce mois.</td>
                </tr>
                @endforelse
            </tbody>
            @if(count($products_sold) > 0)
            <tfoot>
                <tr class="totals-row">
                    <td colspan="3" style="text-align: right;">TOTAL VENTES MOIS :</td>
                    <td class="col-qty">{{ $products_sold_count }}</td>
                    <td></td>
                    <td class="col-total">{{ number_format($total_sales_revenue, 2) }} {{ $currency }}</td>
                    <td class="col-profit">+{{ number_format($sales_profit_month ?? $sales_profit ?? 0, 2) }} {{ $currency }}</td>
                </tr>
            </tfoot>
            @endif
        </table>

        <!-- Monthly Reparations -->
        @if(!empty($reparations['items']) && count($reparations['items']) > 0)
        <div class="section-title" style="color: #0284c7; border-top: 1px dashed #d1d5db; padding-top: 16px; margin-top: 24px;">
            <span>Atelier Réparations du Mois ({{ count($reparations['items']) }})</span>
            <span class="section-count" style="color: #0284c7; font-weight: bold;">
                CA : {{ number_format($reparations_revenue_month ?? $reparations['revenue'], 2) }} {{ $currency }} • Gain : +{{ number_format($reparations_profit_month ?? $reparations['profit'], 2) }} {{ $currency }}
            </span>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th class="col-index">#</th>
                    <th>N° Bon</th>
                    <th>Date</th>
                    <th>Client / Téléphone</th>
                    <th>Appareil</th>
                    <th style="text-align: right;">Coût Pièces</th>
                    <th style="text-align: right;">Tarif (CA)</th>
                    <th style="text-align: right;">Gain Net</th>
                </tr>
            </thead>
            <tbody>
                @foreach($reparations['items'] as $idx => $rep)
                <tr>
                    <td class="col-index">{{ $idx + 1 }}</td>
                    <td style="font-weight: 700; color: #0284c7;">{{ $rep['ticket_number'] ?? ('REP-' . $rep['id']) }}</td>
                    <td>{{ $rep['date'] }}</td>
                    <td>
                        <div style="font-weight: 600;">{{ $rep['client_name'] }}</div>
                        <div style="font-size: 10px; color: #6b7280;">{{ $rep['client_phone'] }}</div>
                    </td>
                    <td>{{ $rep['device'] ?: '—' }}</td>
                    <td style="text-align: right; color: #dc2626;">{{ number_format($rep['cout_pieces'], 2) }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ number_format($rep['total_price'], 2) }} {{ $currency }}</td>
                    <td style="text-align: right; font-weight: 700; color: #16a34a;">+{{ number_format($rep['gain'], 2) }} {{ $currency }}</td>
                </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr class="totals-row">
                    <td colspan="5" style="text-align: right;">TOTAL RÉPARATIONS DU MOIS :</td>
                    <td style="text-align: right; color: #dc2626;">{{ number_format($reparations_cost_month ?? $reparations['cost'], 2) }}</td>
                    <td style="text-align: right;">{{ number_format($reparations_revenue_month ?? $reparations['revenue'], 2) }} {{ $currency }}</td>
                    <td style="text-align: right; color: #16a34a;">+{{ number_format($reparations_profit_month ?? $reparations['profit'], 2) }} {{ $currency }}</td>
                </tr>
            </tfoot>
        </table>
        @endif

        <!-- Monthly Expenses / Charges -->
        @if(!empty($expenses['items']) && count($expenses['items']) > 0)
        <div class="section-title" style="color: #dc2626; border-top: 1px dashed #d1d5db; padding-top: 16px; margin-top: 24px;">
            <span>Dépenses & Sorties de Caisse du Mois ({{ count($expenses['items']) }})</span>
            <span class="section-count" style="color: #dc2626; font-weight: bold;">Total Sorties : -{{ number_format($total_expenses_month, 2) }} {{ $currency }}</span>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th class="col-index">#</th>
                    <th>Date & Heure</th>
                    <th>Employé / Bénéficiaire</th>
                    <th>Motif / Justification</th>
                    <th>Enregistré Par</th>
                    <th style="text-align: right;">Montant Retiré</th>
                </tr>
            </thead>
            <tbody>
                @foreach($expenses['items'] as $idx => $exp)
                <tr>
                    <td class="col-index">{{ $idx + 1 }}</td>
                    <td>{{ $exp['date'] }} à {{ $exp['time'] }}</td>
                    <td style="font-weight: 700; color: #111827;">{{ $exp['worker_name'] }}</td>
                    <td>{{ $exp['reason'] }}</td>
                    <td><span style="font-size: 10.5px; color: #6b7280;">{{ $exp['user_name'] }}</span></td>
                    <td style="text-align: right; font-weight: 700; color: #dc2626;">-{{ number_format($exp['amount'], 2) }} {{ $currency }}</td>
                </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr class="totals-row">
                    <td colspan="5" style="text-align: right;">TOTAL DÉPENSES DU MOIS :</td>
                    <td style="text-align: right; color: #dc2626;">-{{ number_format($total_expenses_month, 2) }} {{ $currency }}</td>
                </tr>
            </tfoot>
        </table>
        @endif

        <!-- Returns Section -->
        @if(!empty($returns_summary) && count($returns_summary) > 0)
        <div class="section-title" style="color: #dc2626; border-top: 1px dashed #d1d5db; padding-top: 14px; margin-top: 20px;">
            <span>Retours Produits Enregistrés dans le Mois ({{ count($returns_summary) }})</span>
            <span class="section-count" style="color: #dc2626; font-weight: bold;">Remboursements : -{{ number_format($total_refunds_month, 2) }} {{ $currency }}</span>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th class="col-index">#</th>
                    <th>N° Retour</th>
                    <th>Date</th>
                    <th>Vente d'Origine</th>
                    <th>Motif</th>
                    <th style="text-align: right;">Montant Remboursé</th>
                </tr>
            </thead>
            <tbody>
                @foreach($returns_summary as $idx => $ret)
                <tr>
                    <td class="col-index">{{ $idx + 1 }}</td>
                    <td style="font-weight: bold; color: #111827;">#RET-{{ $ret['id'] }}</td>
                    <td>{{ $ret['date'] }} à {{ $ret['time'] }}</td>
                    <td>#TX-{{ $ret['transaction_id'] }}</td>
                    <td>{{ $ret['reason'] ?? 'Retour standard' }}</td>
                    <td style="text-align: right; font-weight: bold; color: #dc2626;">-{{ number_format($ret['refund_amount'], 2) }} {{ $currency }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- Global Consolidated Financial Recap -->
        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin-top: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <div>
                <strong style="text-transform: uppercase; color: #1e293b; font-size: 11.5px; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">RÉCAPITULATIF FINANCIER GLOBAL DU MOIS ({{ $month_label }})</strong>
                <span style="color: #64748b;">
                    1. Ventes Magasin : CA {{ number_format($total_sales_revenue, 2) }} {{ $currency }} (Gain : +{{ number_format($sales_profit_month ?? $sales_profit ?? 0, 2) }} {{ $currency }})
                    <br>
                    2. Atelier Réparations : CA {{ number_format($reparations_revenue_month ?? $reparations['revenue'] ?? 0, 2) }} {{ $currency }} (Gain : +{{ number_format($reparations_profit_month ?? $reparations['profit'] ?? 0, 2) }} {{ $currency }})
                    <br>
                    3. Sorties de Caisse & Dépenses : <strong style="color: #dc2626;">-{{ number_format($total_expenses_month, 2) }} {{ $currency }}</strong>
                </span>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 15px; font-weight: 800; color: #1e293b;">
                    CA Vendu : {{ number_format($how_much_sold ?? $grand_total_revenue, 2) }} {{ $currency }}
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #2563eb; margin-top: 2px;">
                    Gain Brut : +{{ number_format($how_much_earned ?? $grand_total_gross_profit, 2) }} {{ $currency }}
                </div>
                <div style="font-size: 16px; font-weight: 900; color: #16a34a; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
                    Gain Net Réel : +{{ number_format($how_much_gained ?? $grand_total_profit, 2) }} {{ $currency }}
                </div>
            </div>
        </div>

        <!-- Signatures & Verification -->
        <div class="report-footer">
            <div>
                <div>Confika System — Document Officiel de Caisse & Bilan Mensuel</div>
                <div>Tous les montants sont exprimés en Dirham Marocain (MAD).</div>
            </div>

            <div class="signature-box">
                <div>Visa Direction / Administration</div>
                <div class="signature-line">Signature & Cachet</div>
            </div>
        </div>

        <!-- Print Trigger Button -->
        <div class="no-print">
            <button onclick="window.print()" class="btn-print">Imprimer / Exporter le Rapport Mensuel en PDF</button>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>

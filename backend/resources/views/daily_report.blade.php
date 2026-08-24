<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Journalier - {{ $date }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f9fafb;
            color: #111827;
            padding: 30px;
            margin: 0;
            display: flex;
            justify-content: center;
        }
        .report-card {
            width: 100%;
            max-width: 600px;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .logo { max-height: 55px; margin-bottom: 8px; }
        .title { font-size: 20px; font-weight: bold; color: #dc2626; margin: 0; }
        .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
        .date-badge {
            display: inline-block;
            background-color: #fef2f2;
            color: #dc2626;
            border: 1px solid #fca5a5;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: bold;
            margin-top: 8px;
        }
        .metric-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        .metric-table th {
            text-align: left;
            padding: 10px 14px;
            background-color: #f9fafb;
            color: #4b5563;
            font-size: 12px;
            text-transform: uppercase;
            border-bottom: 1px solid #e5e7eb;
        }
        .metric-table td {
            padding: 14px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
        }
        .val-bold { font-weight: bold; font-size: 16px; }
        .profit-row {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
        }
        .profit-row td {
            color: #15803d;
            font-size: 18px;
            font-weight: bold;
        }
        .no-print { text-align: center; margin-top: 24px; }
        .btn-print {
            padding: 12px 24px;
            background-color: #dc2626;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
        }
        @media print {
            body { background: none; padding: 0; }
            .report-card { border: none; box-shadow: none; width: 100%; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="report-card">
        <div class="header">
            <img src="/logo.jpeg" alt="Logo" class="logo" onerror="this.style.display='none'">
            <h1 class="title">CONFIKA SYSTEM</h1>
            <div class="subtitle">Rapport Journalier des Ventes & Bénéfices</div>
            <div class="date-badge">Date: {{ $date }}</div>
        </div>

        <table class="metric-table">
            <thead>
                <tr>
                    <th>Indicateur Clé</th>
                    <th style="text-align: right;">Valeur (MAD)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Articles Vendus Aujourd'hui</td>
                    <td style="text-align: right;" class="val-bold">{{ $products_sold_count }} Unités</td>
                </tr>
                <tr>
                    <td>Chiffre d'Affaires du Jour (Ventes Brut)</td>
                    <td style="text-align: right;" class="val-bold">{{ number_format($total_sales_revenue, 2) }} MAD</td>
                </tr>
                <tr>
                    <td>Coût Total des Marchandises Vendues</td>
                    <td style="text-align: right;">{{ number_format($total_cost_of_goods_sold, 2) }} MAD</td>
                </tr>
                <tr class="profit-row">
                    <td>BÉNÉFICE NET DU JOUR (GAIN)</td>
                    <td style="text-align: right;">+{{ number_format($net_profit_today, 2) }} MAD</td>
                </tr>
            </tbody>
        </table>

        <div class="no-print">
            <button onclick="window.print()" class="btn-print">Imprimer le Rapport</button>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>

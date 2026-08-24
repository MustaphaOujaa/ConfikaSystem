<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket #{{ $transaction->id }} - Confika System</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            background-color: #f9fafb;
            color: #111827;
            padding: 20px;
            margin: 0;
            display: flex;
            justify-content: center;
        }
        .receipt-card {
            width: 320px;
            background-color: #ffffff;
            padding: 20px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .text-center { text-align: center; }
        .logo { max-height: 50px; margin-bottom: 8px; }
        .title { font-size: 16px; font-weight: bold; margin: 4px 0; color: #dc2626; }
        .subtitle { font-size: 11px; color: #6b7280; margin-bottom: 12px; }
        .divider { border-top: 1px dashed #9ca3af; margin: 12px 0; }
        .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
        table { width: 100%; font-size: 12px; border-collapse: collapse; margin: 10px 0; }
        th { text-align: left; border-bottom: 1px solid #111827; padding-bottom: 4px; }
        td { padding: 4px 0; }
        .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #dc2626; margin-top: 8px; }
        .no-print { margin-top: 20px; }
        .btn-print { width: 100%; padding: 10px; background-color: #dc2626; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
        @media print {
            body { background: none; padding: 0; }
            .receipt-card { border: none; box-shadow: none; width: 100%; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="receipt-card">
        <div class="text-center">
            <img src="/logo.jpeg" alt="Logo" class="logo" onerror="this.style.display='none'">
            <div class="title">CONFIKA SYSTEM</div>
            <div class="subtitle">Ticket de Caisse / Facture</div>
        </div>

        <div class="divider"></div>

        <div class="meta-row">
            <span>N° Ticket:</span>
            <strong>#{{ $transaction->id }}</strong>
        </div>
        <div class="meta-row">
            <span>Type:</span>
            <strong style="text-transform: uppercase;">{{ $transaction->type === 'sale' ? 'VENTE' : 'ACHAT' }}</strong>
        </div>
        <div class="meta-row">
            <span>Date:</span>
            <span>{{ \Carbon\Carbon::parse($transaction->transaction_date)->format('d/m/Y H:i') }}</span>
        </div>

        <div class="divider"></div>

        <table>
            <thead>
                <tr>
                    <th>Article</th>
                    <th style="text-align: center;">Qté</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($transaction->items as $item)
                <tr>
                    <td>{{ $item->product ? $item->product->name : 'Produit #'.$item->product_id }}</td>
                    <td style="text-align: center;">{{ $item->quantity }}</td>
                    <td style="text-align: right;">{{ number_format($item->quantity * $item->unit_price, 2) }} MAD</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="divider"></div>

        <div class="total-row">
            <span>TOTAL À PAYER:</span>
            <span>{{ number_format($transaction->total_amount, 2) }} MAD</span>
        </div>

        <div class="divider"></div>

        <div class="text-center subtitle">
            Merci pour votre visite ! À bientôt !
        </div>

        <div class="no-print">
            <button onclick="window.print()" class="btn-print">Imprimer le Ticket</button>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>

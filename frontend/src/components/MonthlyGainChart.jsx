import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, Calendar } from 'lucide-react';
import { useGetMonthlyReportQuery } from '../api/apiSlice';

export default function MonthlyGainChart() {
  const currentYear = new Date().getFullYear();
  const startYear = 2026;
  const endYear = Math.max(startYear, currentYear) + 1;

  // Build dynamic list of years starting from 2026 up to endYear
  const yearOptions = [];
  for (let yr = endYear; yr >= startYear; yr--) {
    yearOptions.push(yr);
  }

  const [selectedYear, setSelectedYear] = useState(Math.max(startYear, currentYear));

  const { data: reportData, isLoading, isError, refetch } = useGetMonthlyReportQuery(selectedYear);

  const monthlyList = reportData?.monthly || [];
  const summary = reportData?.summary || {};

  // Compute best performing month (highest net profit)
  const bestMonth = monthlyList.reduce((best, curr) => {
    return (curr.net_profit > (best?.net_profit || 0)) ? curr : best;
  }, null);

  const averageMonthlyProfit = summary.total_profit ? (summary.total_profit / 12) : 0;

  // Helper to format financial gains with clear spacing after + or -
  const formatGain = (amount, decimals = 2) => {
    const num = Number(amount || 0);
    if (num > 0) {
      return `+ ${num.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} MAD`;
    } else if (num < 0) {
      return `- ${Math.abs(num).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} MAD`;
    } else {
      return `0.00 MAD`;
    }
  };

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const margin = data.total_sold > 0 
        ? ((data.net_profit / data.total_sold) * 100).toFixed(1) 
        : 0;

      return (
        <div style={styles.tooltipContainer}>
          <div style={styles.tooltipHeader}>{data.month_label}</div>
          <div style={styles.tooltipRow('#2563eb')}>
            <span>Total Vendu (CA):</span>
            <strong>{Number(data.total_sold).toFixed(2)} MAD</strong>
          </div>
          <div style={styles.tooltipRow(data.net_profit >= 0 ? '#16a34a' : '#dc2626')}>
            <span>Gain Net (Bénéfice):</span>
            <strong>{formatGain(data.net_profit, 2)}</strong>
          </div>
          <div style={styles.tooltipRow('#6b7280')}>
            <span>Marge Nette:</span>
            <strong>{margin}%</strong>
          </div>
          <div style={styles.tooltipRow('#6b7280')}>
            <span>Articles Vendus:</span>
            <strong>{data.items_sold_count} unités ({data.transactions_count} vent.)</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <div style={styles.titleWrapper}>
          <BarChart3 size={20} style={{ color: '#dc2626', marginRight: '8px' }} />
          <div>
            <h3 style={styles.title}>Évolution Mensuelle : Ventes & Gains Nets</h3>
            <p style={styles.subtitle}>Graphique comparatif des Ventes Totales vs Bénéfice Net (Réservé Admin)</p>
          </div>
        </div>

        {/* Year Selector Dropdown */}
        <div style={styles.controls}>
          <div style={styles.yearSelectWrapper}>
            <Calendar size={15} style={{ color: '#4b5563', marginRight: '6px' }} />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={styles.yearSelect}
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  Année {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiBox('#f0f9ff', '#0284c7')}>
          <div style={styles.kpiLabel}>Total Ventes ({selectedYear})</div>
          <div style={styles.kpiValue('#0369a1')}>
            {isLoading ? '...' : `${Number(summary.total_sales || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`}
          </div>
          <div style={styles.kpiSub}>{summary.total_transactions || 0} transactions au total</div>
        </div>

        <div style={styles.kpiBox('#f0fdf4', '#16a34a')}>
          <div style={styles.kpiLabel}>Gain Net Total ({selectedYear})</div>
          <div style={styles.kpiValue('#15803d')}>
            {isLoading ? '...' : formatGain(summary.total_profit, 2)}
          </div>
          <div style={styles.kpiSub}>Bénéfice accumulé sur l'année</div>
        </div>

        <div style={styles.kpiBox('#fefce8', '#ca8a04')}>
          <div style={styles.kpiLabel}>Moyenne de Gain Mensuel</div>
          <div style={styles.kpiValue('#a16207')}>
            {isLoading ? '...' : `~ ${formatGain(averageMonthlyProfit, 2)} / mois`}
          </div>
          <div style={styles.kpiSub}>Moyenne calculée sur 12 mois</div>
        </div>

        <div style={styles.kpiBox('#faf5ff', '#9333ea')}>
          <div style={styles.kpiLabel}>Meilleur Mois</div>
          <div style={styles.kpiValue('#7e22ce')}>
            {isLoading ? '...' : bestMonth && bestMonth.net_profit > 0 ? `${bestMonth.month_name} (${formatGain(bestMonth.net_profit, 0)})` : '-'}
          </div>
          <div style={styles.kpiSub}>Record de profit de l'année</div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div style={styles.chartContainer}>
        {isLoading ? (
          <div style={styles.statusState}>Chargement du graphique financier...</div>
        ) : isError ? (
          <div style={styles.statusState}>
            Une erreur est survenue lors du chargement des données.
            <button onClick={() => refetch()} style={styles.retryBtn}>Réessayer</button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyList} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month_name" stroke="#6b7280" fontSize={12} tickLine={false} />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12} 
                tickLine={false}
                tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(value) => (
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    {value === 'total_sold' ? 'Total Vendu (Ventes CA)' : 'Gain Net (Bénéfice)'}
                  </span>
                )}
              />
              <Bar 
                dataKey="total_sold" 
                name="total_sold" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={45} 
              />
              <Bar 
                dataKey="net_profit" 
                name="net_profit" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={45} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderTop: '4px solid #dc2626',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#6b7280',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  yearSelectWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '4px 10px',
  },
  yearSelect: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
    outline: 'none',
    cursor: 'pointer',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  kpiBox: (bg, border) => ({
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: '6px',
    padding: '12px 14px',
  }),
  kpiLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  kpiValue: (color) => ({
    fontSize: '17px',
    fontWeight: '800',
    color: color,
    marginTop: '4px',
  }),
  kpiSub: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
  },
  chartContainer: {
    width: '100%',
    minHeight: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    paddingTop: '10px',
  },
  statusState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '250px',
    color: '#6b7280',
    fontSize: '14px',
  },
  retryBtn: {
    marginTop: '10px',
    padding: '6px 14px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  tooltipContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '10px 14px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    minWidth: '180px',
  },
  tooltipHeader: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '6px',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '4px',
  },
  tooltipRow: (color) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: color,
    marginTop: '4px',
    gap: '12px',
  }),
};

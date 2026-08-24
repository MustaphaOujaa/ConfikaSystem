import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  AlertTriangle, 
  Tags, 
  Receipt, 
  ArrowRight, 
  ShoppingCart,
  TrendingUp,
  Printer,
  Calendar
} from 'lucide-react';
import { 
  useGetProductsQuery, 
  useGetLowStockAlertsQuery, 
  useGetCategoriesQuery, 
  useGetTransactionsQuery,
  useGetDailyReportQuery
} from '../api/apiSlice';

export default function DashboardPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const { data: productsData, isLoading: loadingProducts } = useGetProductsQuery({ page: 1 });
  const { data: lowStockData, isLoading: loadingLowStock } = useGetLowStockAlertsQuery();
  const { data: categoriesData, isLoading: loadingCategories } = useGetCategoriesQuery({ page: 1 });
  const { data: transactionsData, isLoading: loadingTransactions } = useGetTransactionsQuery({ page: 1 });
  const { data: dailyReport, isLoading: loadingDaily } = useGetDailyReportQuery(selectedDate, {
    pollingInterval: selectedDate === todayStr ? 15000 : undefined,
  });

  const totalProducts = productsData?.total || productsData?.data?.length || 0;
  const lowStockCount = lowStockData?.count || 0;
  const totalCategories = categoriesData?.total || categoriesData?.data?.length || 0;
  const recentTransactions = transactionsData?.data || [];
  const totalTransactions = transactionsData?.total || recentTransactions.length || 0;

  const handlePrintDailyBlade = () => {
    window.open(`/reports/daily/print?date=${selectedDate}`, '_blank', 'width=700,height=800');
  };

  const setToday = () => {
    setSelectedDate(todayStr);
  };

  return (
    <div style={styles.container}>
      {/* Top Banner / Quick Actions */}
      <div style={styles.banner}>
        <div>
          <h2 style={styles.bannerTitle}>Bienvenue sur Confika System</h2>
          <p style={styles.bannerSubtitle}>Gestion d'inventaire et Caisse enregistreuse POS</p>
        </div>
        <Link to="/pos" style={styles.bannerBtn}>
          <ShoppingCart size={18} style={{ marginRight: '8px' }} />
          <span>Accéder à la Caisse</span>
        </Link>
      </div>

      {/* Daily Operations & History Report Box */}
      <div style={styles.dailyReportCard}>
        <div style={styles.dailyHeader}>
          <div style={styles.dailyTitle}>
            <Calendar size={20} style={{ color: '#dc2626', marginRight: '8px' }} />
            <span>Rapport Journalier des Ventes & Bénéfices</span>
          </div>

          <div style={styles.dailyControls}>
            {/* Aujourd'hui quick button */}
            <button
              onClick={setToday}
              style={{
                ...styles.dateQuickBtn,
                ...(selectedDate === todayStr ? styles.dateQuickActive : {}),
              }}
            >
              Aujourd'hui
            </button>

            {/* Date Picker Input — max=today, past dates only */}
            <div style={styles.dateInputWrapper}>
              <Calendar size={14} style={styles.datePickerIcon} />
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => {
                  if (e.target.value <= todayStr) setSelectedDate(e.target.value);
                }}
                style={styles.dateInput}
              />
            </div>

            {/* Printable Blade Report Button */}
            <button onClick={handlePrintDailyBlade} style={styles.printBladeReportBtn}>
              <Printer size={15} style={{ marginRight: '6px' }} />
              <span>Imprimer le Rapport</span>
            </button>
          </div>
        </div>

        <div style={styles.dailyGrid}>
          <div style={styles.dailyItem}>
            <div style={styles.dailyLabel}>Produits Vendus le {selectedDate}</div>
            <div style={styles.dailyVal('#111827')}>
              {loadingDaily ? '...' : `${dailyReport?.products_sold_count || 0} Unités`}
            </div>
            <div style={styles.dailySub}>Nombre d'articles encaissés cette journée</div>
          </div>

          <div style={styles.dailyItem}>
            <div style={styles.dailyLabel}>Chiffre d'Affaires du {selectedDate}</div>
            <div style={styles.dailyVal('#16a34a')}>
              {loadingDaily ? '...' : `${Number(dailyReport?.total_sales_revenue || 0).toFixed(2)} MAD`}
            </div>
            <div style={styles.dailySub}>Revenu brut des ventes enregistrées</div>
          </div>

          <div style={styles.dailyItem}>
            <div style={styles.dailyLabel}>Bénéfice Net du {selectedDate} (Gain)</div>
            <div style={styles.dailyVal('#dc2626')}>
              {loadingDaily ? '...' : `+${Number(dailyReport?.net_profit_today || 0).toFixed(2)} MAD`}
            </div>
            <div style={styles.dailySub}>Ventes moins Coût des Marchandises</div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper('#eff6ff', '#2563eb')}>
            <Package size={22} />
          </div>
          <div>
            <div style={styles.statLabel}>Total Produits</div>
            <div style={styles.statValue}>{loadingProducts ? '...' : totalProducts}</div>
          </div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: lowStockCount > 0 ? '4px solid #dc2626' : '1px solid #e5e7eb' }}>
          <div style={styles.statIconWrapper('#fef2f2', '#dc2626')}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={styles.statLabel}>Alertes Stock Bas</div>
            <div style={{ ...styles.statValue, color: lowStockCount > 0 ? '#dc2626' : '#111827' }}>
              {loadingLowStock ? '...' : lowStockCount}
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrapper('#f3e8ff', '#9333ea')}>
            <Tags size={22} />
          </div>
          <div>
            <div style={styles.statLabel}>Catégories</div>
            <div style={styles.statValue}>{loadingCategories ? '...' : totalCategories}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrapper('#f0fdf4', '#16a34a')}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={styles.statLabel}>Total Transactions</div>
            <div style={styles.statValue}>{loadingTransactions ? '...' : totalTransactions}</div>
          </div>
        </div>
      </div>

      {/* Content Split: Low Stock Alerts & Recent Activity */}
      <div style={styles.gridSplit}>
        {/* Low Stock Alerts Section */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <AlertTriangle size={18} style={{ color: '#dc2626', marginRight: '8px' }} />
              <span>Alertes de Stock Bas</span>
            </div>
            <Link to="/products" style={styles.cardLink}>
              Voir Tout <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </Link>
          </div>

          <div style={styles.cardBody}>
            {loadingLowStock ? (
              <div style={styles.loading}>Chargement des alertes...</div>
            ) : lowStockData?.items?.length === 0 ? (
              <div style={styles.emptyState}>
                ✅ Tous les produits sont suffisamment alimentés en stock.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nom du Produit</th>
                    <th style={styles.th}>Code-barres</th>
                    <th style={styles.th}>Prix de Vente</th>
                    <th style={styles.th}>Stock Restant</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockData?.items?.slice(0, 5).map((prod) => (
                    <tr key={prod.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '600', color: '#111827' }}>{prod.name}</td>
                      <td style={styles.td}>{prod.barcode}</td>
                      <td style={styles.td}>{Number(prod.price).toFixed(2)} MAD</td>
                      <td style={styles.td}>
                        <span style={styles.lowStockBadge}>
                          {prod.quantity} Restants
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Transactions Section */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <TrendingUp size={18} style={{ color: '#2563eb', marginRight: '8px' }} />
              <span>Dernières Transactions</span>
            </div>
            <Link to="/transactions" style={styles.cardLink}>
              Historique <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </Link>
          </div>

          <div style={styles.cardBody}>
            {loadingTransactions ? (
              <div style={styles.loading}>Chargement des transactions...</div>
            ) : recentTransactions.length === 0 ? (
              <div style={styles.emptyState}>Aucune transaction enregistrée.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Articles</th>
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.slice(0, 5).map((tx) => (
                    <tr key={tx.id} style={styles.tr}>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.typeBadge,
                            backgroundColor: tx.type === 'sale' ? '#ecfdf5' : '#eff6ff',
                            color: tx.type === 'sale' ? '#059669' : '#2563eb',
                            borderColor: tx.type === 'sale' ? '#a7f3d0' : '#bfdbfe',
                          }}
                        >
                          {tx.type === 'sale' ? 'VENTE' : 'ACHAT'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {new Date(tx.transaction_date || tx.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={styles.td}>{tx.items?.length || 0} articles</td>
                      <td style={{ ...styles.td, fontWeight: '700', color: '#dc2626' }}>
                        {Number(tx.total_amount).toFixed(2)} MAD
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  banner: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderLeft: '5px solid #dc2626',
    borderRadius: '8px',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  bannerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
  },
  bannerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  bannerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
  },
  dailyReportCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderTop: '4px solid #dc2626',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  dailyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6',
    flexWrap: 'wrap',
    gap: '12px',
  },
  dailyTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
  },
  dailyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  dateQuickGroup: {
    display: 'flex',
    backgroundColor: '#e5e7eb',
    padding: '2px',
    borderRadius: '6px',
  },
  dateQuickBtn: {
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dateQuickActive: {
    backgroundColor: '#ffffff',
    color: '#dc2626',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  dateInputWrapper: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  datePickerIcon: {
    position: 'absolute',
    left: '10px',
    color: '#dc2626',
    pointerEvents: 'none',
  },
  dateInput: {
    padding: '5px 10px 5px 30px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  printBladeReportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dailyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  dailyItem: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '14px 16px',
  },
  dailyLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  dailyVal: (color) => ({
    fontSize: '20px',
    fontWeight: '800',
    color: color,
  }),
  dailySub: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  statIconWrapper: (bg, color) => ({
    width: '46px',
    height: '46px',
    borderRadius: '8px',
    backgroundColor: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#111827',
    marginTop: '2px',
  },
  gridSplit: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '15px',
    fontWeight: '700',
    color: '#111827',
  },
  cardLink: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: '600',
    color: '#dc2626',
    textDecoration: 'none',
  },
  cardBody: {
    padding: '0',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#374151',
  },
  lowStockBadge: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
  },
  typeBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: '700',
  },
};

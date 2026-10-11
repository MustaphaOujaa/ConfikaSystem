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
  Calendar,
  Search,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Wrench,
  WalletCards,
  BarChart2
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { 
  useGetProductsQuery, 
  useGetLowStockAlertsQuery, 
  useGetCategoriesQuery, 
  useGetTransactionsQuery,
  useGetDailyReportQuery,
  useGetMonthlyDetailReportQuery
} from '../api/apiSlice';
import { selectCurrentUser } from '../store/authSlice';
import MonthlyGainChart from '../components/MonthlyGainChart';

export default function DashboardPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [soldSearch, setSoldSearch] = useState('');
  const [showSoldTable, setShowSoldTable] = useState(true);
  const [showReparationsTable, setShowReparationsTable] = useState(true);

  const { data: productsData, isLoading: loadingProducts } = useGetProductsQuery({ page: 1 });
  const { data: lowStockData, isLoading: loadingLowStock } = useGetLowStockAlertsQuery();
  const { data: categoriesData, isLoading: loadingCategories } = useGetCategoriesQuery({ page: 1 });
  const { data: transactionsData, isLoading: loadingTransactions } = useGetTransactionsQuery({ page: 1 });
  const { data: dailyReport, isLoading: loadingDaily } = useGetDailyReportQuery(selectedDate, {
    skip: !isAdmin,
    pollingInterval: selectedDate === todayStr && isAdmin ? 15000 : undefined,
  });
  const { data: monthlyDetail, isLoading: loadingMonthly } = useGetMonthlyDetailReportQuery(selectedMonth, {
    skip: !isAdmin || !showMonthlyReport,
  });

  const productsSoldList = dailyReport?.products_sold || [];
  const filteredSoldProducts = productsSoldList.filter((item) => {
    if (!soldSearch.trim()) return true;
    const q = soldSearch.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  const totalProducts = productsData?.total || productsData?.data?.length || 0;
  const lowStockCount = lowStockData?.count || 0;
  const totalCategories = categoriesData?.total || categoriesData?.data?.length || 0;
  const recentTransactions = transactionsData?.data || [];
  const dailyTransactionsCount = dailyReport?.transactions_count || 0;

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

      {/* Daily Operations & Financial Report Box (Visible exclusively to Admin) */}
      {isAdmin && (
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
            {/* 1. Magasin: CA Ventes */}
            <div style={styles.dailyItem}>
              <div style={styles.dailyLabel}>CA Ventes Magasin ({selectedDate})</div>
              <div style={styles.dailyVal('#2563eb')}>
                {loadingDaily ? '...' : `${Number(dailyReport?.total_sales_revenue || 0).toFixed(2)} MAD`}
              </div>
              <div style={styles.dailySub}>
                {dailyReport?.products_sold_count || 0} article{(dailyReport?.products_sold_count || 0) > 1 ? 's' : ''} encaissé{(dailyReport?.products_sold_count || 0) > 1 ? 's' : ''} ({dailyReport?.transactions_count || 0} vent.)
              </div>
            </div>

            {/* 1. Magasin: Bénéfice Ventes */}
            <div style={styles.dailyItem}>
              <div style={styles.dailyLabel}>Bénéfice Ventes Magasin</div>
              <div style={styles.dailyVal('#16a34a')}>
                {loadingDaily ? '...' : `+ ${Number(dailyReport?.sales_profit_today ?? dailyReport?.sales_profit ?? 0).toFixed(2)} MAD`}
              </div>
              <div style={styles.dailySub}>Ventes nettes moins coût marchandises</div>
            </div>

            {/* 2. Atelier: CA Réparations */}
            <div style={styles.dailyItem}>
              <div style={styles.dailyLabel}>CA Atelier Réparations</div>
              <div style={styles.dailyVal('#0284c7')}>
                {loadingDaily ? '...' : `${Number(dailyReport?.reparations_revenue_today ?? dailyReport?.reparations?.revenue ?? 0).toFixed(2)} MAD`}
              </div>
              <div style={styles.dailySub}>
                {dailyReport?.reparations_count_today ?? dailyReport?.reparations?.count ?? 0} réparation{(dailyReport?.reparations_count_today ?? dailyReport?.reparations?.count ?? 0) > 1 ? 's' : ''} clôturée{(dailyReport?.reparations_count_today ?? dailyReport?.reparations?.count ?? 0) > 1 ? 's' : ''}
              </div>
            </div>

            {/* 2. Atelier: Bénéfice Réparations */}
            <div style={styles.dailyItem}>
              <div style={styles.dailyLabel}>Bénéfice Réparations (Gain)</div>
              <div style={styles.dailyVal('#16a34a')}>
                {loadingDaily ? '...' : `+ ${Number(dailyReport?.reparations_profit_today ?? dailyReport?.reparations?.profit ?? 0).toFixed(2)} MAD`}
              </div>
              <div style={styles.dailySub}>
                Coût pièces : {Number(dailyReport?.reparations_cost_today ?? dailyReport?.reparations?.cost ?? 0).toFixed(2)} MAD
              </div>
            </div>

            {/* 3. Sorties de Caisse (Expenses) — RED */}
            <div style={{ ...styles.dailyItem, backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}>
              <div style={{ ...styles.dailyLabel, color: '#be123c' }}>
                <WalletCards size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Sorties de Caisse
              </div>
              <div style={styles.dailyVal('#be123c')}>
                {loadingDaily ? '...' : `- ${Number(dailyReport?.how_much_spent || dailyReport?.total_expenses_today || 0).toFixed(2)} MAD`}
              </div>
              <div style={styles.dailySub}>
                {dailyReport?.expenses_count || 0} sortie{(dailyReport?.expenses_count || 0) > 1 ? 's' : ''} déclarée{(dailyReport?.expenses_count || 0) > 1 ? 's' : ''}
              </div>
            </div>

            {/* 4. Consolidé: CA Total */}
            <div style={{ ...styles.dailyItem, backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
              <div style={{ ...styles.dailyLabel, color: '#0369a1' }}>CA Total Global (Journée)</div>
              <div style={styles.dailyVal('#0369a1')}>
                {loadingDaily ? '...' : `${Number(dailyReport?.how_much_sold || dailyReport?.grand_total_revenue || 0).toFixed(2)} MAD`}
              </div>
              <div style={styles.dailySub}>Ventes magasin + Atelier réparations</div>
            </div>

            {/* 5. Consolidé: Gain Net Réel */}
            <div style={{ ...styles.dailyItem, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <div style={{ ...styles.dailyLabel, color: '#15803d' }}>Gain Net Réel (après dépenses)</div>
              <div style={styles.dailyVal('#15803d')}>
                {loadingDaily ? '...' : `+ ${Number(dailyReport?.how_much_gained ?? dailyReport?.grand_total_profit ?? 0).toFixed(2)} MAD`}
              </div>
              <div style={styles.dailySub}>Gain brut − Sorties de caisse</div>
            </div>
          </div>

          {/* Detailed Sold Products Table Section */}
          <div style={styles.soldSection}>
            <div style={styles.soldSectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} style={{ color: '#dc2626' }} />
                <span style={styles.soldSectionTitle}>
                  Détail des Produits Vendus ({productsSoldList.length} Référence{productsSoldList.length > 1 ? 's' : ''})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {productsSoldList.length > 0 && (
                  <div style={styles.soldSearchWrapper}>
                    <Search size={14} style={styles.soldSearchIcon} />
                    <input
                      type="text"
                      placeholder="Filtrer par nom ou code..."
                      value={soldSearch}
                      onChange={(e) => setSoldSearch(e.target.value)}
                      style={styles.soldSearchInput}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowSoldTable(!showSoldTable)}
                  style={styles.toggleTableBtn}
                  title={showSoldTable ? "Masquer le tableau" : "Afficher le tableau"}
                >
                  {showSoldTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {showSoldTable && (
              loadingDaily ? (
                <div style={styles.loading}>Chargement des ventes détaillées...</div>
              ) : productsSoldList.length === 0 ? (
                <div style={styles.emptySoldState}>
                  Aucun produit vendu enregistré pour la date du {selectedDate}.
                </div>
              ) : (
                <div style={styles.soldTableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, width: '30px' }}>#</th>
                        <th style={styles.th}>Article</th>
                        <th style={styles.th}>Code-barres</th>
                        <th style={styles.th}>Catégorie</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Qté Vendue</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Prix Unit.</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Total Vente</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Gain Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSoldProducts.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ ...styles.td, textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                            Aucun produit correspondant au filtre "{soldSearch}".
                          </td>
                        </tr>
                      ) : (
                        filteredSoldProducts.map((item, idx) => (
                          <tr key={item.product_id} style={styles.tr}>
                            <td style={{ ...styles.td, color: '#9ca3af', width: '30px' }}>{idx + 1}</td>
                            <td style={{ ...styles.td, fontWeight: '600', color: '#111827' }}>
                              {item.name}
                              {item.brand && <span style={styles.brandBadge}>{item.brand}</span>}
                            </td>
                            <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px' }}>{item.barcode}</td>
                            <td style={styles.td}>{item.category}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <span style={styles.qtyBadge}>{item.quantity_sold}</span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right' }}>{Number(item.unit_price).toFixed(2)} MAD</td>
                            <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                              {Number(item.total_revenue).toFixed(2)} MAD
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                              + {Number(item.total_profit).toFixed(2)} MAD
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {productsSoldList.length > 0 && (
                      <tfoot>
                        <tr style={styles.tfootRow}>
                          <td colSpan="4" style={{ ...styles.td, fontWeight: '800', textAlign: 'right' }}>TOTAL VENTES DU JOUR :</td>
                          <td style={{ ...styles.td, textAlign: 'center', fontWeight: '800' }}>{dailyReport?.products_sold_count || 0}</td>
                          <td style={styles.td}></td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800' }}>{Number(dailyReport?.total_sales_revenue || 0).toFixed(2)} MAD</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>+ {Number(dailyReport?.sales_profit_today ?? dailyReport?.sales_profit ?? 0).toFixed(2)} MAD</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )
            )}
          </div>

          {/* Detailed Reparations Section for the selected date */}
          <div style={{ ...styles.soldSection, marginTop: '20px' }}>
            <div style={styles.soldSectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={18} style={{ color: '#0284c7' }} />
                <span style={styles.soldSectionTitle}>
                  Atelier Réparations du {selectedDate} ({dailyReport?.reparations?.count || 0} opération{(dailyReport?.reparations?.count || 0) > 1 ? 's' : ''})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReparationsTable(!showReparationsTable)}
                  style={styles.toggleTableBtn}
                  title={showReparationsTable ? "Masquer le tableau" : "Afficher le tableau"}
                >
                  {showReparationsTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {/* Reparations KPI grid for this day */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', padding: '12px 16px', backgroundColor: '#f0f9ff', borderBottom: '1px solid #e0f2fe' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>Recettes Réparations</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7' }}>
                  {Number(dailyReport?.reparations?.revenue || 0).toFixed(2)} MAD
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '700' }}>Coût des Pièces</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626' }}>
                  {Number(dailyReport?.reparations?.cost || 0).toFixed(2)} MAD
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '700' }}>Bénéfice Net Réparations</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>
                  + {Number(dailyReport?.reparations?.profit || 0).toFixed(2)} MAD
                </div>
              </div>
            </div>

            {showReparationsTable && (
              !dailyReport?.reparations?.items || dailyReport.reparations.items.length === 0 ? (
                <div style={styles.emptySoldState}>
                  Aucune opération de réparation enregistrée pour la date du {selectedDate}.
                </div>
              ) : (
                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>N° Bon</th>
                        <th style={styles.th}>Client</th>
                        <th style={styles.th}>Appareil</th>
                        <th style={styles.th}>Statut</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Tarif (MAD)</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Coût Pièces (MAD)</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Gain Net (MAD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReport.reparations.items.map((r) => (
                        <tr key={r.id} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: '700', color: '#0284c7' }}>
                            {r.ticket_number || `REP-${r.id}`}
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '600' }}>{r.client_name}</div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{r.client_phone}</div>
                          </td>
                          <td style={styles.td}>{r.device || '—'}</td>
                          <td style={styles.td}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: r.status === 'livre' ? '#dcfce7' : '#fef3c7', color: r.status === 'livre' ? '#15803d' : '#b45309', fontWeight: '600' }}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700' }}>
                            {Number(r.total_price || 0).toFixed(2)}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626' }}>
                            {Number(r.cout_pieces || 0).toFixed(2)}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                            + {Number(r.gain || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Consolidated Daily Total Summary Bar — 4 Metrics */}
          <div style={{ marginTop: '20px', padding: '18px 22px', backgroundColor: '#0f172a', borderRadius: '10px', color: '#ffffff' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '14px' }}>
              📊 Bilan Financier de la Journée — {selectedDate}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {/* How much sold */}
              <div style={{ background: 'rgba(37,99,235,0.15)', borderRadius: '8px', padding: '12px 14px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '11px', color: '#93c5fd', fontWeight: '600', marginBottom: '4px' }}>💰 CE QU'ON A VENDU</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#dbeafe' }}>
                  {Number(dailyReport?.how_much_sold || dailyReport?.grand_total_revenue || 0).toFixed(2)}
                  <span style={{ fontSize: '12px', marginLeft: '4px', color: '#93c5fd' }}>MAD</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>CA total (magasin + atelier)</div>
              </div>
              {/* How much earned */}
              <div style={{ background: 'rgba(22,163,74,0.15)', borderRadius: '8px', padding: '12px 14px', borderLeft: '3px solid #22c55e' }}>
                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: '600', marginBottom: '4px' }}>📈 CE QU'ON A GAGNÉ (BRUT)</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#dcfce7' }}>
                  +{Number(dailyReport?.how_much_earned || 0).toFixed(2)}
                  <span style={{ fontSize: '12px', marginLeft: '4px', color: '#86efac' }}>MAD</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Marge brute (avant dépenses)</div>
              </div>
              {/* How much spent */}
              <div style={{ background: 'rgba(190,18,60,0.15)', borderRadius: '8px', padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '600', marginBottom: '4px' }}>🧾 CE QU'ON A DÉPENSÉ</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#fee2e2' }}>
                  -{Number(dailyReport?.how_much_spent || dailyReport?.total_expenses_today || 0).toFixed(2)}
                  <span style={{ fontSize: '12px', marginLeft: '4px', color: '#fca5a5' }}>MAD</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Sorties de caisse déclarées</div>
              </div>
              {/* How much gained net */}
              <div style={{ background: 'rgba(16,185,129,0.2)', borderRadius: '8px', padding: '12px 14px', borderLeft: '4px solid #10b981', boxShadow: '0 0 12px rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: '700', marginBottom: '4px' }}>✅ GAIN NET RÉEL (FIN DE JOURNÉE)</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#d1fae5' }}>
                  +{Number(dailyReport?.how_much_gained ?? dailyReport?.grand_total_profit ?? 0).toFixed(2)}
                  <span style={{ fontSize: '13px', marginLeft: '4px', color: '#6ee7b7' }}>MAD</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Gagné brut − Sorties de caisse</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report Section (Admin Only) */}
      {isAdmin && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Header / Toggle */}
          <div
            onClick={() => setShowMonthlyReport(!showMonthlyReport)}
            style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: showMonthlyReport ? '1px solid #e5e7eb' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart2 size={20} style={{ color: '#7c3aed' }} />
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>Rapport Mensuel Détaillé</span>
              {showMonthlyReport && selectedMonth && (
                <span style={{ fontSize: '12px', color: '#7c3aed', backgroundColor: '#ede9fe', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                  {selectedMonth}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {showMonthlyReport && (
                <input
                  type="month"
                  value={selectedMonth}
                  max={currentMonthStr}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { if (e.target.value <= currentMonthStr) setSelectedMonth(e.target.value); }}
                  style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', color: '#374151', outline: 'none' }}
                />
              )}
              {showMonthlyReport && (
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(`/reports/monthly/print?month=${selectedMonth}`, '_blank', 'width=800,height=900'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Printer size={13} /> Imprimer
                </button>
              )}
              {showMonthlyReport ? <ChevronUp size={18} style={{ color: '#64748b' }} /> : <ChevronDown size={18} style={{ color: '#64748b' }} />}
            </div>
          </div>

          {/* Monthly Report Content */}
          {showMonthlyReport && (
            <div style={{ padding: '20px' }}>
              {loadingMonthly ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>Chargement du rapport mensuel...</div>
              ) : !monthlyDetail ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>Aucune donnée pour ce mois.</div>
              ) : (
                <>
                  {/* 4-Metric KPI Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '22px' }}>
                    <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '14px 16px', borderLeft: '4px solid #2563eb' }}>
                      <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>💰 Total Vendu</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#1d4ed8' }}>{Number(monthlyDetail?.how_much_sold || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>MAD — CA total du mois</div>
                    </div>
                    <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '14px 16px', borderLeft: '4px solid #16a34a' }}>
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>📈 Gagné (Brut)</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803d' }}>+{Number(monthlyDetail?.how_much_earned || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>MAD — Marge brute mensuelle</div>
                    </div>
                    <div style={{ backgroundColor: '#fff1f2', borderRadius: '8px', padding: '14px 16px', borderLeft: '4px solid #dc2626' }}>
                      <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>🧾 Dépensé</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#be123c' }}>-{Number(monthlyDetail?.how_much_spent || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>MAD — Sorties de caisse</div>
                    </div>
                    <div style={{ backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '14px 16px', borderLeft: '4px solid #10b981', boxShadow: '0 0 10px rgba(16,185,129,0.12)' }}>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>✅ Gain Net Réel</div>
                      <div style={{ fontSize: '26px', fontWeight: '900', color: '#065f46' }}>+{Number(monthlyDetail?.how_much_gained || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>MAD — Bénéfice net du mois</div>
                    </div>
                  </div>

                  {/* Day-by-Day Breakdown Table */}
                  {monthlyDetail?.daily_breakdown?.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={15} style={{ color: '#7c3aed' }} /> Détail Jour par Jour
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              <th style={{ ...styles.th, textAlign: 'left' }}>Date</th>
                              <th style={{ ...styles.th, textAlign: 'right' }}>CA Vendu</th>
                              <th style={{ ...styles.th, textAlign: 'right', color: '#16a34a' }}>Gagné Brut</th>
                              <th style={{ ...styles.th, textAlign: 'right', color: '#dc2626' }}>Dépenses</th>
                              <th style={{ ...styles.th, textAlign: 'right', color: '#065f46' }}>Gain Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyDetail.daily_breakdown.map((day, idx) => (
                              <tr key={day.date} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ ...styles.td, fontWeight: '600' }}>
                                  {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                </td>
                                <td style={{ ...styles.td, textAlign: 'right', color: '#1d4ed8' }}>{Number(day.combined_revenue || 0).toFixed(2)}</td>
                                <td style={{ ...styles.td, textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>+{Number(day.gross_profit || 0).toFixed(2)}</td>
                                <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626' }}>
                                  {Number(day.expenses || 0) > 0 ? `-${Number(day.expenses).toFixed(2)}` : '—'}
                                </td>
                                <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: Number(day.net_profit || 0) >= 0 ? '#065f46' : '#dc2626' }}>
                                  {Number(day.net_profit || 0) >= 0 ? '+' : ''}{Number(day.net_profit || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ backgroundColor: '#f0fdf4', fontWeight: '700', borderTop: '2px solid #bbf7d0' }}>
                              <td style={{ ...styles.td }}>TOTAL MOIS</td>
                              <td style={{ ...styles.td, textAlign: 'right', color: '#1d4ed8' }}>{Number(monthlyDetail?.how_much_sold || 0).toFixed(2)}</td>
                              <td style={{ ...styles.td, textAlign: 'right', color: '#16a34a' }}>+{Number(monthlyDetail?.how_much_earned || 0).toFixed(2)}</td>
                              <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626' }}>-{Number(monthlyDetail?.how_much_spent || 0).toFixed(2)}</td>
                              <td style={{ ...styles.td, textAlign: 'right', color: '#065f46', fontSize: '14px' }}>+{Number(monthlyDetail?.how_much_gained || 0).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Expenses of the month */}
                  {monthlyDetail?.expenses?.items?.length > 0 && (
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#be123c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <WalletCards size={15} /> Sorties de Caisse du Mois ({monthlyDetail.expenses.items.length})
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#fff1f2' }}>
                            <th style={{ ...styles.th, textAlign: 'left' }}>Date</th>
                            <th style={{ ...styles.th, textAlign: 'left' }}>Déclaré par</th>
                            <th style={{ ...styles.th, textAlign: 'left' }}>Motif</th>
                            <th style={{ ...styles.th, textAlign: 'right', color: '#dc2626' }}>Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyDetail.expenses.items.map((exp, idx) => (
                            <tr key={exp.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fff7f7', borderBottom: '1px solid #fecdd3' }}>
                              <td style={styles.td}>{new Date(exp.expense_date || exp.created_at).toLocaleDateString('fr-FR')}</td>
                              <td style={{ ...styles.td, fontWeight: '600' }}>{exp.worker_name}</td>
                              <td style={styles.td}>{exp.reason}</td>
                              <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: '#be123c' }}>-{Number(exp.amount).toFixed(2)} MAD</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monthly Sales & Gain Visual Graph (Visible exclusively to Admin) */}
      {isAdmin && <MonthlyGainChart />}

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
            <div style={styles.statLabel}>Transactions du Jour</div>
            <div style={styles.statValue}>{loadingDaily ? '...' : dailyTransactionsCount}</div>
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
                      <td style={styles.td}>{tx.items?.length || 0} article{tx.items?.length > 1 ? 's' : ''}</td>
                      <td style={{ ...styles.td, fontWeight: '700', color: tx.type === 'sale' ? '#16a34a' : '#2563eb' }}>
                        {tx.type === 'sale' ? (
                          `${Number(tx.total_amount).toFixed(2)} MAD`
                        ) : isAdmin ? (
                          `${Number(tx.total_amount).toFixed(2)} MAD`
                        ) : (
                          <span style={{ color: '#16a34a', fontWeight: '600' }}>
                            +{tx.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0} Unités
                          </span>
                        )}
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
  soldSection: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  soldSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  soldSectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827',
  },
  soldSearchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  soldSearchIcon: {
    position: 'absolute',
    left: '8px',
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  soldSearchInput: {
    padding: '5px 10px 5px 28px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    width: '180px',
    backgroundColor: '#ffffff',
  },
  toggleTableBtn: {
    padding: '5px 8px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
  },
  emptySoldState: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '13px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px dashed #d1d5db',
  },
  soldTableWrapper: {
    overflowX: 'auto',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  brandBadge: {
    marginLeft: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  qtyBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#111827',
  },
  tfootRow: {
    backgroundColor: '#f9fafb',
    borderTop: '2px solid #e5e7eb',
  },
};

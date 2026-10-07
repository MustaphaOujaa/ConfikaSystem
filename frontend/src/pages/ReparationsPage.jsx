import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Printer, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Phone,
  DollarSign,
  TrendingUp,
  Package,
  Check,
  Calendar,
  X
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import {
  useGetReparationsQuery,
  useGetReparationStatsQuery,
  useUpdateReparationStatusMutation,
  useDeleteReparationMutation,
} from '../api/apiSlice';
import ReparationModal from '../components/reparations/ReparationModal';
import PrintableBonReparation from '../components/reparations/PrintableBonReparation';
import Pagination from '../components/common/Pagination';
import ReparationInventoryView from '../components/reparations/ReparationInventoryView';

export default function ReparationsPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('bons');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReparation, setEditingReparation] = useState(null);
  const [printingReparation, setPrintingReparation] = useState(null);

  // Debounce search to query backend with delay and avoid race conditions
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Queries - Backend handles search, status, date, and pagination
  const { data: reparationsData, isLoading, isFetching, refetch } = useGetReparationsQuery({
    page,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    date: dateFilter || undefined,
    per_page: 15,
  });

  const { data: statsData } = useGetReparationStatsQuery(undefined, {
    pollingInterval: 25000,
  });

  const [updateStatus] = useUpdateReparationStatusMutation();
  const [deleteReparation] = useDeleteReparationMutation();

  const reparationsList = reparationsData?.data || [];
  const totalPages = reparationsData?.last_page || 1;
  const totalItems = reparationsData?.total || 0;

  const handleOpenCreate = () => {
    setEditingReparation(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingReparation(item);
    setIsModalOpen(true);
  };

  const handlePrint = (item) => {
    setPrintingReparation(item);
  };

  const handleStatusChange = async (id, newStatus, currentItem) => {
    try {
      let markAsPaid = false;
      if (newStatus === 'livre' && parseFloat(currentItem.reste) > 0) {
        markAsPaid = window.confirm(
          `L'appareil est marqué comme livré. Le reste à payer est de ${currentItem.reste} DH.\nLe client a-t-il réglé ce solde en totalité ?\n\n(Cliquez OK pour marquer le solde comme réglé, ou Annuler pour conserver le solde impayé)`
        );
      }
      await updateStatus({
        id,
        status: newStatus,
        mark_as_paid: markAsPaid,
      }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce bon de réparation ?')) {
      try {
        await deleteReparation(id).unwrap();
      } catch (err) {
        alert(err?.data?.message || 'Erreur lors de la suppression.');
      }
    }
  };

  const handleWhatsApp = (item) => {
    const rawPhone = (item.client_phone || '').replace(/\D/g, '');
    let formattedPhone = rawPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '212' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('212')) {
      formattedPhone = '212' + formattedPhone;
    }

    const deviceName = `${item.brand || ''} ${item.model || ''}`.trim() || 'votre appareil';
    const resteMsg = parseFloat(item.reste) > 0 ? ` Reste à payer : ${item.reste} DH.` : '';
    const message = encodeURIComponent(
      `Bonjour ${item.client_name}, votre appareil (${deviceName}) est prêt chez Confika !${resteMsg} Merci de votre confiance.`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  return (
    <div style={styles.container}>
      {/* Page Title & Main Action */}
      <div style={styles.topHeader}>
        <div>
          <h1 style={styles.pageTitle}>Atelier de Réparation</h1>
          <p style={styles.pageSubtitle}>Gestion des bons de réparation, diagnostic, pièces et suivi financier</p>
        </div>
        <button onClick={handleOpenCreate} style={styles.primaryBtn} type="button">
          <Plus size={18} style={{ marginRight: '6px' }} />
          Nouveau Bon de Réparation
        </button>
      </div>

      {/* Tab Switcher */}
      <div style={styles.tabBar}>
        <button
          type="button"
          onClick={() => setActiveTab('bons')}
          style={{ ...styles.tabBtn, ...(activeTab === 'bons' ? styles.tabBtnActive : {}) }}
        >
          <Wrench size={15} style={{ marginRight: '6px' }} />
          Bons de Réparation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          style={{ ...styles.tabBtn, ...(activeTab === 'stock' ? styles.tabBtnActive : {}) }}
        >
          <Package size={15} style={{ marginRight: '6px' }} />
          Stock des Pièces Détachées
        </button>
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && <ReparationInventoryView isAdmin={isAdmin} />}

      {/* Bons Tab */}
      {activeTab === 'bons' && (<>

      {/* KPI Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Total Réparations</span>
            <Wrench size={18} color="#0284c7" />
          </div>
          <div style={styles.cardValue}>{statsData?.total || 0}</div>
          <div style={styles.cardSub}>Toutes opérations confondues</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>En attente / Reçus</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ ...styles.cardValue, color: '#d97706' }}>{statsData?.recu || 0}</div>
          <div style={styles.cardSub}>Appareils déposés</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>En cours</span>
            <Package size={18} color="#0284c7" />
          </div>
          <div style={{ ...styles.cardValue, color: '#0284c7' }}>{statsData?.en_cours || 0}</div>
          <div style={styles.cardSub}>Sur l'établi</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Prêts pour retrait</span>
            <CheckCircle size={18} color="#16a34a" />
          </div>
          <div style={{ ...styles.cardValue, color: '#16a34a' }}>{statsData?.pret || 0}</div>
          <div style={styles.cardSub}>En attente du client</div>
        </div>

        {/* Admin Financial Stats Cards */}
        {isAdmin && statsData?.financials && (
          <>
            <div style={{ ...styles.card, borderLeft: '4px solid #0284c7' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Chiffre d'Affaires</span>
                <DollarSign size={18} color="#0284c7" />
              </div>
              <div style={styles.cardValue}>{statsData.financials.total_revenue} DH</div>
              <div style={styles.cardSub}>Facturation réparations</div>
            </div>

            <div style={{ ...styles.card, borderLeft: '4px solid #ef4444' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Coût des Pièces</span>
                <Wrench size={18} color="#ef4444" />
              </div>
              <div style={{ ...styles.cardValue, color: '#dc2626' }}>{statsData.financials.total_cost} DH</div>
              <div style={styles.cardSub}>Achat pièces de rechange</div>
            </div>

            <div style={{ ...styles.card, borderLeft: '4px solid #16a34a' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Gain Net Réparations</span>
                <TrendingUp size={18} color="#16a34a" />
              </div>
              <div style={{ ...styles.cardValue, color: '#16a34a' }}>{statsData.financials.total_profit} DH</div>
              <div style={styles.cardSub}>Bénéfice net d'atelier</div>
            </div>
          </>
        )}
      </div>

      {/* Filter & Search Bar - Handled on Backend */}
      <div style={styles.filterSection}>
        <div style={styles.searchBox}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Rechercher par N° Bon, client, téléphone, IMEI, modèle, panne..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={styles.clearSearchBtn}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Date Picker Filter */}
          <div style={styles.dateFilterWrapper}>
            <Calendar size={14} color="#6b7280" style={{ marginRight: '6px' }} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              style={styles.dateFilterInput}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('');
                  setPage(1);
                }}
                style={styles.clearDateBtn}
                title="Effacer la date"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div style={styles.filterTabs}>
            {[
              { id: 'all', label: 'Tous' },
              { id: 'recu', label: 'Reçus' },
              { id: 'en_cours', label: 'En cours' },
              { id: 'pret', label: 'Prêts' },
              { id: 'livre', label: 'Livrés' },
              { id: 'annule', label: 'Annulés' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                style={{
                  ...styles.filterTabBtn,
                  ...(statusFilter === tab.id ? styles.filterTabBtnActive : {}),
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reparations Table */}
      <div style={styles.tableCard}>
        {isLoading || isFetching ? (
          <div style={styles.loadingBox}>Chargement des réparations...</div>
        ) : reparationsList.length === 0 ? (
          <div style={styles.emptyBox}>
            <Wrench size={40} color="#9ca3af" style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0, fontWeight: '600', color: '#4b5563' }}>Aucune réparation trouvée</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
              {searchTerm || dateFilter || statusFilter !== 'all'
                ? 'Aucun résultat pour les critères de recherche actuels.'
                : 'Enregistrez un nouvel appareil pour générer un Bon de Réparation.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>N° Bon</th>
                  <th style={styles.th}>Date Dépôt</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Appareil</th>
                  <th style={styles.th}>Panne / Diagnostic</th>
                  <th style={styles.th}>Tarif & Règlement</th>
                  {isAdmin && <th style={styles.th}>Coût / Gain</th>}
                  <th style={styles.th}>Statut</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reparationsList.map((rep) => {
                  const reste = parseFloat(rep.reste || 0);
                  const isPaid = reste <= 0;
                  return (
                    <tr key={rep.id} style={styles.tr}>
                      {/* Ticket Number */}
                      <td style={styles.td}>
                        <div style={styles.ticketBadge}>
                          {rep.ticket_number || `REP-${rep.id}`}
                        </div>
                        {rep.user?.name && (
                          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                            Par: {rep.user.name}
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td style={styles.td}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>
                          {rep.date_depot ? new Date(rep.date_depot).toLocaleDateString('fr-FR') : '—'}
                        </div>
                        {rep.date_prevue && (
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            Prévu: {new Date(rep.date_prevue).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>

                      {/* Client */}
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{rep.client_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#0284c7' }}>
                          <Phone size={11} />
                          <span>{rep.client_phone}</span>
                        </div>
                      </td>

                      {/* Device */}
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {rep.brand} {rep.model}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {rep.imei_serial && `IMEI: ${rep.imei_serial}`}
                          {rep.color && ` • ${rep.color}`}
                        </div>
                      </td>

                      {/* Issue */}
                      <td style={{ ...styles.td, maxWidth: '200px' }}>
                        <div style={{ fontSize: '12px', color: '#374151' }}>
                          {rep.description_panne || rep.panne_autre || 'Non spécifié'}
                        </div>
                        {rep.parts && rep.parts.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>
                            {rep.parts.length} pièce(s) : {rep.parts.map(p => p.name).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Financials */}
                      <td style={styles.td}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                          {parseFloat(rep.total_price || 0).toFixed(2)} DH
                        </div>
                        <div style={{ fontSize: '11px', color: '#16a34a' }}>
                          Acompte: {parseFloat(rep.acompte || 0).toFixed(2)} DH
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: isPaid ? '#16a34a' : '#dc2626' }}>
                          {isPaid ? 'Soldé' : `Reste: ${reste.toFixed(2)} DH`}
                        </div>
                      </td>

                      {/* Admin Profit column */}
                      {isAdmin && (
                        <td style={styles.td}>
                          <div style={{ fontSize: '11px', color: '#dc2626' }}>
                            Coût: {parseFloat(rep.cout_pieces || 0).toFixed(2)} DH
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a' }}>
                            Gain: {parseFloat(rep.gain || 0).toFixed(2)} DH
                          </div>
                        </td>
                      )}

                      {/* Status Dropdown */}
                      <td style={styles.td}>
                        <select
                          value={rep.status}
                          onChange={(e) => handleStatusChange(rep.id, e.target.value, rep)}
                          style={{
                            ...styles.statusSelect,
                            backgroundColor:
                              rep.status === 'pret'
                                ? '#dcfce7'
                                : rep.status === 'en_cours'
                                ? '#e0f2fe'
                                : rep.status === 'recu'
                                ? '#fef3c7'
                                : '#f3f4f6',
                          }}
                        >
                          <option value="recu">Reçu</option>
                          <option value="en_cours">En cours</option>
                          <option value="pret">Prêt</option>
                          <option value="livre">Livré</option>
                          <option value="annule">Annulé</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={styles.actionsGroup}>
                          {/* Print Bon */}
                          <button
                            type="button"
                            title="Imprimer le Bon de réparation"
                            onClick={() => handlePrint(rep)}
                            style={styles.actionBtn}
                          >
                            <Printer size={15} color="#0284c7" />
                          </button>

                          {/* WhatsApp alert */}
                          <button
                            type="button"
                            title="Avertir le client via WhatsApp"
                            onClick={() => handleWhatsApp(rep)}
                            style={{ ...styles.actionBtn, backgroundColor: '#ecfdf5' }}
                          >
                            <MessageSquare size={15} color="#16a34a" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            title="Modifier"
                            onClick={() => handleOpenEdit(rep)}
                            style={styles.actionBtn}
                          >
                            <Edit3 size={15} color="#4b5563" />
                          </button>

                          {/* Delete (Admin) */}
                          {isAdmin && (
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => handleDelete(rep.id)}
                              style={{ ...styles.actionBtn, backgroundColor: '#fef2f2' }}
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Backend Paginated Controls */}
        <Pagination
          currentPage={page}
          lastPage={totalPages}
          total={totalItems}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <ReparationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingReparation(null);
            refetch();
          }}
          initialData={editingReparation}
          isAdmin={isAdmin}
        />
      )}

      {/* Printable Bon Modal */}
      {printingReparation && (
        <PrintableBonReparation
          reparation={printingReparation}
          onClose={() => setPrintingReparation(null)}
        />
      )}
      </>)}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1300px',
    margin: '0 auto',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '0',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '9px 18px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    borderRadius: '0',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabBtnActive: {
    color: '#0284c7',
    borderBottomColor: '#0284c7',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '800',
    color: '#111827',
  },
  pageSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
  },
  cardValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#111827',
  },
  cardSub: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  filterSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 14px',
    width: '100%',
    maxWidth: '420px',
    gap: '8px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  dateFilterWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '6px 10px',
  },
  dateFilterInput: {
    border: 'none',
    outline: 'none',
    fontSize: '12px',
    color: '#374151',
    fontWeight: '500',
  },
  clearDateBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    marginLeft: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  filterTabs: {
    display: 'flex',
    gap: '6px',
    backgroundColor: '#f3f4f6',
    padding: '4px',
    borderRadius: '8px',
  },
  filterTabBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
  },
  filterTabBtnActive: {
    backgroundColor: '#ffffff',
    color: '#0284c7',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    fontSize: '12px',
    fontWeight: '700',
    color: '#4b5563',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    verticalAlign: 'middle',
  },
  ticketBadge: {
    display: 'inline-block',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontWeight: '700',
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  statusSelect: {
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    outline: 'none',
  },
  actionsGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '6px',
  },
  actionBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  loadingBox: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  emptyBox: {
    padding: '50px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

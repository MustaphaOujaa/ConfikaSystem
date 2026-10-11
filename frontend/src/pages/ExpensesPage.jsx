import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  WalletCards, 
  Plus, 
  Calendar, 
  Search, 
  Trash2, 
  User, 
  Clock, 
  FileText, 
  AlertCircle,
  CheckCircle,
  X,
  Filter,
  DollarSign
} from 'lucide-react';
import { 
  useGetExpensesQuery, 
  useCreateExpenseMutation, 
  useDeleteExpenseMutation 
} from '../api/apiSlice';
import { selectCurrentUser } from '../store/authSlice';

export default function ExpensesPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Filters state
  const [filterMode, setFilterMode] = useState('all'); // 'today' | 'month' | 'date' | 'all'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(thisMonthStr);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [workerName, setWorkerName] = useState(user?.name || '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete confirm state
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // Compute query params based on filterMode
  const queryParams = {};
  if (filterMode === 'today') {
    queryParams.date = todayStr;
  } else if (filterMode === 'date') {
    queryParams.date = selectedDate;
  } else if (filterMode === 'month') {
    queryParams.month = selectedMonth;
  }
  if (searchTerm.trim()) {
    queryParams.search = searchTerm.trim();
  }

  const { data: expensesData, isLoading, isFetching, refetch } = useGetExpensesQuery(queryParams);
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();

  const expensesList = expensesData?.data || [];
  const stats = expensesData?.stats || {};

  // Preset reason suggestions
  const presetReasons = [
    'Paiement livreur',
    'Achat café / Eau',
    'Transport / Déplacement',
    'Fournitures magasin',
    'Matériel / Pièces urgentes',
    'Autre charge magasin',
  ];

  const handleOpenModal = () => {
    setWorkerName(user?.name || '');
    setAmount('');
    setReason('');
    setExpenseDate(todayStr);
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!workerName.trim()) {
      setFormError('Veuillez indiquer le nom du travailleur.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Veuillez saisir un montant valide (supérieur à 0 MAD).');
      return;
    }

    if (!reason.trim()) {
      setFormError('Veuillez indiquer le motif ou pour quoi cet argent a été pris.');
      return;
    }

    try {
      await createExpense({
        worker_name: workerName.trim(),
        amount: numAmount,
        reason: reason.trim(),
        expense_date: expenseDate || todayStr,
      }).unwrap();

      setSuccessMsg('Sortie de caisse déclarée avec succès !');
      setTimeout(() => setSuccessMsg(''), 4000);
      handleCloseModal();
    } catch (err) {
      setFormError(err?.data?.message || "Erreur lors de l'enregistrement de la dépense.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id).unwrap();
      setExpenseToDelete(null);
      setSuccessMsg('Sortie de caisse supprimée.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  // Group expenses by date for clean day-by-day display
  const groupedByDay = expensesList.reduce((acc, item) => {
    const d = item.expense_date || (item.created_at ? item.created_at.split('T')[0] : 'Inconnue');
    if (!acc[d]) {
      acc[d] = {
        date: d,
        items: [],
        dayTotal: 0,
      };
    }
    acc[d].items.push(item);
    acc[d].dayTotal += parseFloat(item.amount || 0);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedByDay).sort((a, b) => (a < b ? 1 : -1));

  const formatDayTitle = (dateStr) => {
    if (!dateStr || dateStr === 'Inconnue') return 'Date non spécifiée';
    if (dateStr === todayStr) return "Aujourd'hui (" + formatDateFr(dateStr) + ')';
    
    const d = new Date(dateStr + 'T00:00:00');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Hier (' + formatDateFr(dateStr) + ')';
    }

    return formatDateFr(dateStr);
  };

  const formatDateFr = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const formatTimeFr = (dateStr) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerContent}>
          <div style={styles.bannerIconWrapper}>
            <WalletCards size={26} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <h1 style={styles.bannerTitle}>Sorties de Caisse & Dépenses</h1>
            <p style={styles.bannerSubtitle}>
              Déclaration de tout retrait d'argent liquide du magasin (livreurs, fournitures, frais divers).
              Historique complet visible par tous les employés et ordonné par jour.
            </p>
          </div>
        </div>

        <button onClick={handleOpenModal} style={styles.primaryBtn}>
          <Plus size={18} style={{ marginRight: '6px' }} />
          <span>Déclarer une Sortie d'Argent</span>
        </button>
      </div>

      {/* Success notification banner */}
      {successMsg && (
        <div style={styles.alertSuccess}>
          <CheckCircle size={18} style={{ marginRight: '8px', color: '#16a34a' }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard('#fef2f2', '#fecaca')}>
          <div style={styles.statLabel('#dc2626')}>Total Sorties Aujourd'hui</div>
          <div style={styles.statVal('#dc2626')}>
            - {Number(stats.today_total || 0).toFixed(2)} MAD
          </div>
          <div style={styles.statSub}>Retraits effectués en caisse aujourd'hui</div>
        </div>

        <div style={styles.statCard('#fff7ed', '#fed7aa')}>
          <div style={styles.statLabel('#ea580c')}>Total Sorties Ce Mois</div>
          <div style={styles.statVal('#ea580c')}>
            - {Number(stats.month_total || 0).toFixed(2)} MAD
          </div>
          <div style={styles.statSub}>Charges cumulées sur le mois en cours</div>
        </div>

        <div style={styles.statCard('#f0f9ff', '#bae6fd')}>
          <div style={styles.statLabel('#0369a1')}>Opérations Filtrées</div>
          <div style={styles.statVal('#0284c7')}>
            {stats.filtered_count || expensesList.length} retrait{(stats.filtered_count || expensesList.length) > 1 ? 's' : ''}
          </div>
          <div style={styles.statSub}>Nombre d'enregistrements correspondants</div>
        </div>

        <div style={styles.statCard('#f9fafb', '#e5e7eb')}>
          <div style={styles.statLabel('#4b5563')}>Montant Total Filtré</div>
          <div style={styles.statVal('#111827')}>
            - {Number(stats.filtered_total || 0).toFixed(2)} MAD
          </div>
          <div style={styles.statSub}>Total des dépenses affichées ci-dessous</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={styles.filterCard}>
        <div style={styles.filterLeft}>
          <span style={styles.filterHeading}>
            <Filter size={16} style={{ marginRight: '6px', color: '#6b7280' }} />
            Filtres :
          </span>

          <div style={styles.pillGroup}>
            <button
              onClick={() => setFilterMode('today')}
              style={{
                ...styles.pillBtn,
                ...(filterMode === 'today' ? styles.pillBtnActive : {}),
              }}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setFilterMode('month')}
              style={{
                ...styles.pillBtn,
                ...(filterMode === 'month' ? styles.pillBtnActive : {}),
              }}
            >
              Ce Mois
            </button>
            <button
              onClick={() => setFilterMode('date')}
              style={{
                ...styles.pillBtn,
                ...(filterMode === 'date' ? styles.pillBtnActive : {}),
              }}
            >
              Par Jour
            </button>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                ...styles.pillBtn,
                ...(filterMode === 'all' ? styles.pillBtnActive : {}),
              }}
            >
              Tous
            </button>
          </div>

          {filterMode === 'date' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.filterDateInput}
            />
          )}

          {filterMode === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={styles.filterDateInput}
            />
          )}
        </div>

        <div style={styles.filterRight}>
          <div style={styles.searchWrapper}>
            <Search size={15} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher employé ou motif..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={styles.searchClearBtn}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List / Grouped Table of Expenses Ordered by Day */}
      {isLoading ? (
        <div style={styles.loadingBox}>Chargement de l'historique des sorties de caisse...</div>
      ) : sortedDays.length === 0 ? (
        <div style={styles.emptyBox}>
          <WalletCards size={48} style={{ color: '#d1d5db', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', color: '#374151', fontSize: '16px' }}>
            Aucune sortie de caisse enregistrée
          </h3>
          <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '13px' }}>
            {searchTerm || filterMode !== 'all'
              ? 'Aucun résultat ne correspond aux filtres appliqués.'
              : "Aucune dépense n'a encore été déclarée. Cliquez sur le bouton pour en ajouter une."}
          </p>
          <button onClick={handleOpenModal} style={styles.primaryBtn}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            <span>Déclarer une Sortie de Caisse</span>
          </button>
        </div>
      ) : (
        <div style={styles.daysList}>
          {sortedDays.map((dayKey) => {
            const dayGroup = groupedByDay[dayKey];
            return (
              <div key={dayKey} style={styles.dayCard}>
                {/* Day Header */}
                <div style={styles.dayHeader}>
                  <div style={styles.dayHeaderTitle}>
                    <Calendar size={18} style={{ color: '#dc2626', marginRight: '8px' }} />
                    <span style={styles.dayHeaderText}>{formatDayTitle(dayKey)}</span>
                    <span style={styles.dayCountBadge}>
                      {dayGroup.items.length} retrait{dayGroup.items.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={styles.dayHeaderTotal}>
                    Total Journée :{' '}
                    <strong style={{ color: '#dc2626', fontSize: '16px', marginLeft: '6px' }}>
                      - {dayGroup.dayTotal.toFixed(2)} MAD
                    </strong>
                  </div>
                </div>

                {/* Day Table */}
                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, width: '40px' }}>#</th>
                        <th style={styles.th}>Travailleur / Employé</th>
                        <th style={styles.th}>Motif / Pour quoi ?</th>
                        <th style={styles.th}>Heure</th>
                        <th style={styles.th}>Enregistré Par</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Montant Retiré</th>
                        {(isAdmin || true) && (
                          <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {dayGroup.items.map((exp, idx) => (
                        <tr key={exp.id} style={styles.tr}>
                          <td style={{ ...styles.td, color: '#9ca3af' }}>{idx + 1}</td>
                          <td style={styles.td}>
                            <div style={styles.workerBadge}>
                              <User size={14} style={{ marginRight: '6px', color: '#4b5563' }} />
                              <span style={{ fontWeight: '700', color: '#111827' }}>
                                {exp.worker_name}
                              </span>
                            </div>
                          </td>
                          <td style={{ ...styles.td, color: '#374151' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <FileText size={14} style={{ marginRight: '6px', color: '#9ca3af', flexShrink: 0 }} />
                              <span>{exp.reason}</span>
                            </div>
                          </td>
                          <td style={{ ...styles.td, color: '#6b7280', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <Clock size={13} style={{ marginRight: '4px' }} />
                              <span>{formatTimeFr(exp.created_at)}</span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.userRoleTag(exp.user?.role)}>
                              {exp.user?.name || 'Système'}
                              {exp.user?.role ? ` (${exp.user.role})` : ''}
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <span style={styles.amountBadge}>
                              - {Number(exp.amount).toFixed(2)} MAD
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            {(isAdmin || exp.user_id === user?.id) && (
                              <button
                                onClick={() => setExpenseToDelete(exp)}
                                style={styles.deleteBtn}
                                title="Supprimer cette sortie"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Déclarer une Sortie d'Argent */}
      {showModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WalletCards size={22} style={{ color: '#dc2626' }} />
                <h3 style={styles.modalTitle}>Déclarer une Sortie de Caisse</h3>
              </div>
              <button onClick={handleCloseModal} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.modalBody}>
              {formError && (
                <div style={styles.alertError}>
                  <AlertCircle size={16} style={{ marginRight: '6px', flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Worker Name Field */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Nom du Travailleur / Employé qui prend l'argent <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={styles.inputIconWrapper}>
                  <User size={16} style={styles.fieldIcon} />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mohammed, Karim, Youssef..."
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    style={styles.inputWithIcon}
                  />
                </div>
                <div style={styles.fieldHelp}>
                  Indiquez le nom de la personne qui a retiré l'argent de la caisse.
                </div>
              </div>

              {/* Amount Field */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Montant Retiré (MAD) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={styles.inputIconWrapper}>
                  <DollarSign size={16} style={styles.fieldIcon} />
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    placeholder="Ex: 50.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ ...styles.inputWithIcon, fontWeight: '700', fontSize: '16px', color: '#dc2626' }}
                  />
                </div>

                {/* Quick amount pills */}
                <div style={styles.quickPillsRow}>
                  {[10, 20, 50, 100, 200].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      style={styles.quickPill}
                    >
                      +{v} MAD
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason / Purpose Field */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Motif / Pour quoi faire ? <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: Paiement du livreur pour les commandes, achat café, essence..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={styles.textarea}
                />

                {/* Preset Suggestions */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                    Suggestions rapides :
                  </div>
                  <div style={styles.quickPillsRow}>
                    {presetReasons.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        style={styles.quickPill}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date Field */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Date de l'opération</label>
                <div style={styles.inputIconWrapper}>
                  <Calendar size={16} style={styles.fieldIcon} />
                  <input
                    type="date"
                    value={expenseDate}
                    max={todayStr}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={handleCloseModal} style={styles.cancelBtn}>
                  Annuler
                </button>
                <button type="submit" disabled={isCreating} style={styles.submitBtn}>
                  {isCreating ? 'Enregistrement...' : 'Enregistrer la Sortie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {expenseToDelete && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: '440px' }}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: '#dc2626' }}>Confirmer la Suppression</h3>
              <button onClick={() => setExpenseToDelete(null)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>
                Êtes-vous sûr de vouloir supprimer cette sortie de caisse ?
              </p>
              <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                <div><strong>Employé :</strong> {expenseToDelete.worker_name}</div>
                <div><strong>Motif :</strong> {expenseToDelete.reason}</div>
                <div><strong>Montant :</strong> <span style={{ color: '#dc2626', fontWeight: '700' }}>- {Number(expenseToDelete.amount).toFixed(2)} MAD</span></div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                style={styles.cancelBtn}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(expenseToDelete.id)}
                style={{ ...styles.submitBtn, backgroundColor: '#dc2626' }}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
    flexWrap: 'wrap',
    gap: '14px',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  bannerIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    maxWidth: '700px',
    lineHeight: '1.4',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)',
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    color: '#15803d',
    fontSize: '13px',
    fontWeight: '600',
  },
  alertError: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '13px',
    marginBottom: '14px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  statCard: (bg, border) => ({
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  }),
  statLabel: (color) => ({
    fontSize: '11.5px',
    fontWeight: '700',
    color: color,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: '4px',
  }),
  statVal: (color) => ({
    fontSize: '20px',
    fontWeight: '800',
    color: color,
  }),
  statSub: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '4px',
  },
  filterCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  filterLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterHeading: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
  },
  pillGroup: {
    display: 'flex',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    padding: '2px',
  },
  pillBtn: {
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  pillBtnActive: {
    backgroundColor: '#ffffff',
    color: '#dc2626',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  filterDateInput: {
    padding: '5px 10px',
    fontSize: '12.5px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
  },
  filterRight: {
    display: 'flex',
    alignItems: 'center',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  searchInput: {
    padding: '6px 30px 6px 32px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    width: '240px',
  },
  searchClearBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  daysList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  dayCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  dayHeader: {
    backgroundColor: '#f9fafb',
    padding: '12px 18px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
  },
  dayHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827',
  },
  dayCountBadge: {
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: '8px',
  },
  dayHeaderTotal: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 16px',
    color: '#1f2937',
  },
  workerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: '3px 10px',
    borderRadius: '6px',
  },
  amountBadge: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#dc2626',
  },
  userRoleTag: (role) => ({
    display: 'inline-block',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: role === 'admin' ? '#fef2f2' : '#eff6ff',
    color: role === 'admin' ? '#dc2626' : '#2563eb',
    fontWeight: '600',
  }),
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.15s ease',
  },
  loadingBox: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  emptyBox: {
    padding: '50px 20px',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '20px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  inputIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: '10px',
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  inputWithIcon: {
    width: '100%',
    padding: '9px 12px 9px 34px',
    fontSize: '13.5px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '13.5px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  fieldHelp: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '4px',
  },
  quickPillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '6px',
  },
  quickPill: {
    fontSize: '11.5px',
    padding: '3px 8px',
    borderRadius: '12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    marginTop: '10px',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 20px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
};

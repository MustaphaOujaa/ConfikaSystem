import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Check, 
  X, 
  AlertCircle, 
  User as UserIcon, 
  Mail, 
  Key, 
  ShieldAlert 
} from 'lucide-react';
import { 
  useGetCashiersQuery, 
  useCreateCashierMutation, 
  useUpdateCashierMutation, 
  useDeleteCashierMutation 
} from '../api/apiSlice';

export default function CashiersPage() {
  const { data: cashiers = [], isLoading, isError } = useGetCashiersQuery();
  const [createCashier, { isLoading: isCreating }] = useCreateCashierMutation();
  const [updateCashier, { isLoading: isUpdating }] = useUpdateCashierMutation();
  const [deleteCashier, { isLoading: isDeleting }] = useDeleteCashierMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState(null);
  const [deletingCashier, setDeletingCashier] = useState(null);

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [pageNotification, setPageNotification] = useState('');

  const filteredCashiers = cashiers.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setFormError('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    resetForm();
    setEditingCashier(c);
    setName(c.name);
    setEmail(c.email);
    setPassword('');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await createCashier({ name, email, password }).unwrap();
      setIsAddModalOpen(false);
      resetForm();
      setPageNotification('Nouveau compte caissier créé avec succès !');
      setTimeout(() => setPageNotification(''), 4000);
    } catch (err) {
      setFormError(err?.data?.errors?.email?.[0] || err?.data?.message || 'Erreur lors de la création du compte.');
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = { id: editingCashier.id, name, email };
      if (password.trim()) {
        payload.password = password;
      }
      await updateCashier(payload).unwrap();
      setEditingCashier(null);
      resetForm();
      setPageNotification('Identifiants du caissier mis à jour avec succès !');
      setTimeout(() => setPageNotification(''), 4000);
    } catch (err) {
      setFormError(err?.data?.errors?.email?.[0] || err?.data?.message || 'Erreur lors de la mise à jour.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingCashier) return;
    try {
      await deleteCashier(deletingCashier.id).unwrap();
      setPageNotification(`Compte caissier "${deletingCashier.name}" supprimé avec succès.`);
      setDeletingCashier(null);
      setTimeout(() => setPageNotification(''), 4000);
    } catch (err) {
      alert(err?.data?.message || 'Erreur lors de la suppression.');
      setDeletingCashier(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Banner */}
      <div style={styles.banner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.bannerIconBox}>
            <Users size={26} color="#dc2626" />
          </div>
          <div>
            <h2 style={styles.bannerTitle}>Gestion des Caissiers</h2>
            <p style={styles.bannerSubtitle}>
              Gérez les accès aux postes d'encaissement et POS (création & mise à jour sans OTP)
            </p>
          </div>
        </div>

        <button 
          onClick={handleOpenAddModal}
          style={styles.primaryBtn}
          type="button"
        >
          <UserPlus size={17} style={{ marginRight: '8px' }} />
          <span>Nouveau Caissier</span>
        </button>
      </div>

      {/* Page Notification Banner */}
      {pageNotification && (
        <div style={styles.notificationBanner}>
          <Check size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
          <span>{pageNotification}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div style={styles.card}>
        {/* Search Bar & Stats */}
        <div style={styles.toolbar}>
          <div style={styles.searchWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.countBadge}>
            <strong>{filteredCashiers.length}</strong> caissier{filteredCashiers.length > 1 ? 's' : ''}
          </div>
        </div>

        {isLoading ? (
          <div style={styles.loading}>Chargement des caissiers...</div>
        ) : isError ? (
          <div style={styles.error}>Erreur lors du chargement des données.</div>
        ) : filteredCashiers.length === 0 ? (
          <div style={styles.emptyState}>
            <Users size={40} color="#9ca3af" style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
              {searchTerm ? 'Aucun caissier ne correspond à votre recherche.' : 'Aucun compte caissier configuré.'}
            </p>
            <p style={{ margin: '4px 0 16px', fontSize: '13px', color: '#9ca3af' }}>
              {searchTerm ? 'Essayez un autre mot-clé.' : 'Créez un premier caissier pour lui donner accès au module de caisse.'}
            </p>
            {!searchTerm && (
              <button onClick={handleOpenAddModal} style={styles.primaryBtn}>
                <UserPlus size={16} style={{ marginRight: '6px' }} />
                Nouveau Caissier
              </button>
            )}
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Caissier</th>
                  <th style={styles.th}>Email de Connexion</th>
                  <th style={styles.th}>Rôle Système</th>
                  <th style={styles.th}>Créé le</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCashiers.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={styles.avatar}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>ID: #{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.emailBadge}>{c.email}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.roleBadge}>Caissier</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }) : '—'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          style={styles.actionBtnEdit}
                          title="Modifier les identifiants"
                        >
                          <Edit size={14} style={{ marginRight: '4px' }} />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCashier(c)}
                          style={styles.actionBtnDelete}
                          title="Supprimer ce compte"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {(isAddModalOpen || editingCashier) && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={styles.modalIconBox}>
                  <UserPlus size={20} color="#dc2626" />
                </div>
                <div>
                  <h4 style={styles.modalTitle}>
                    {editingCashier ? `Modifier le caissier : ${editingCashier.name}` : 'Ajouter un Nouveau Caissier'}
                  </h4>
                  <p style={styles.modalSubtitle}>
                    {editingCashier 
                      ? 'Modifiez les informations d\'accès sans code OTP' 
                      : 'Définissez les identifiants de connexion de l\'opérateur'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCashier(null);
                  resetForm();
                }}
                style={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={styles.errorBanner}>
                <AlertCircle size={15} style={{ marginRight: '6px', flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={editingCashier ? handleUpdateSubmit : handleCreateSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nom complet de l'opérateur</label>
                <div style={styles.inputWrapper}>
                  <UserIcon size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Caissier 1"
                    required
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Adresse Email (pour se connecter)</label>
                <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.inputIcon} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: caissier@email.com"
                    required
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Mot de passe {editingCashier ? '(laisser vide pour conserver l\'actuel)' : ''}
                </label>
                <div style={styles.inputWrapper}>
                  <Key size={16} style={styles.inputIcon} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingCashier ? '•••••••• (inchangé)' : 'Au moins 4 caractères'}
                    required={!editingCashier}
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCashier(null);
                    resetForm();
                  }}
                  style={styles.cancelBtn}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  style={styles.primaryBtn}
                >
                  {isCreating || isUpdating 
                    ? 'Enregistrement...' 
                    : editingCashier 
                      ? 'Enregistrer les modifications' 
                      : 'Créer le compte caissier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (NO BROWSER ALERT) */}
      {deletingCashier && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ ...styles.modalIconBox, backgroundColor: '#fef2f2' }}>
                  <ShieldAlert size={22} color="#dc2626" />
                </div>
                <h4 style={styles.modalTitle}>Confirmer la suppression</h4>
              </div>
              <button
                type="button"
                onClick={() => setDeletingCashier(null)}
                style={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5', margin: '0 0 20px' }}>
              Êtes-vous sûr de vouloir supprimer définitivement le compte caissier de <strong>{deletingCashier.name}</strong> (<code>{deletingCashier.email}</code>) ? Cette action est irréversible.
            </p>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setDeletingCashier(null)}
                style={styles.cancelBtn}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{ ...styles.primaryBtn, backgroundColor: '#dc2626' }}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer le compte'}
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
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  banner: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px 24px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  bannerIconBox: {
    width: '46px',
    height: '46px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  bannerSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '4px 0 0',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  notificationBanner: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    padding: '20px 24px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '360px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px 9px 36px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
  },
  countBadge: {
    fontSize: '13px',
    color: '#6b7280',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  error: {
    padding: '30px',
    textAlign: 'center',
    color: '#dc2626',
    fontSize: '13px',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
    margin: '10px 0',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  theadRow: {
    borderBottom: '2px solid #f3f4f6',
  },
  th: {
    padding: '12px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.1s ease',
  },
  td: {
    padding: '14px',
    fontSize: '14px',
    verticalAlign: 'middle',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
    flexShrink: 0,
  },
  emailBadge: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actionBtnEdit: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnDelete: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '20px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  modalIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0 0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#9ca3af',
  },
  inputWithIcon: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
  },
  cancelBtn: {
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Sliders, 
  MapPin, 
  X, 
  Check, 
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/authSlice';
import {
  useGetReparationInventoryPartsQuery,
  useCreateReparationInventoryPartMutation,
  useUpdateReparationInventoryPartMutation,
  useAdjustReparationInventoryPartStockMutation,
  useDeleteReparationInventoryPartMutation,
} from '../../api/apiSlice';
import Pagination from '../common/Pagination';

export default function ReparationInventoryView() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals state
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingPart, setAdjustingPart] = useState(null);
  const [adjustType, setAdjustType] = useState('add'); // 'add', 'subtract', 'set'
  const [adjustAmount, setAdjustAmount] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query
  const { data: responseData, isLoading, isFetching } = useGetReparationInventoryPartsQuery({
    page,
    search: debouncedSearch.trim() || undefined,
    brand: brandFilter !== 'all' ? brandFilter : undefined,
    low_stock: lowStockFilter ? true : undefined,
    per_page: 15,
  });

  const [createPart, { isLoading: isCreating }] = useCreateReparationInventoryPartMutation();
  const [updatePart, { isLoading: isUpdating }] = useUpdateReparationInventoryPartMutation();
  const [adjustStock, { isLoading: isAdjusting }] = useAdjustReparationInventoryPartStockMutation();
  const [deletePart] = useDeleteReparationInventoryPartMutation();

  const partsList = responseData?.paginated?.data || [];
  const totalPages = responseData?.paginated?.last_page || 1;
  const totalItems = responseData?.paginated?.total || 0;
  const stats = responseData?.stats || {};

  // Form state for Create / Edit
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    compatible_model: '',
    quantity: 0,
    cost_price: '',
    min_stock_alert: 2,
    location: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const handleOpenCreate = () => {
    setEditingPart(null);
    setFormData({
      name: '',
      brand: '',
      compatible_model: '',
      quantity: 0,
      cost_price: '',
      min_stock_alert: 2,
      location: '',
      notes: '',
    });
    setFormError('');
    setIsPartModalOpen(true);
  };

  const handleOpenEdit = (part) => {
    setEditingPart(part);
    setFormData({
      name: part.name || '',
      brand: part.brand || '',
      compatible_model: part.compatible_model || '',
      quantity: part.quantity || 0,
      cost_price: part.cost_price !== undefined ? part.cost_price : '',
      min_stock_alert: part.min_stock_alert !== undefined ? part.min_stock_alert : 2,
      location: part.location || '',
      notes: part.notes || '',
    });
    setFormError('');
    setIsPartModalOpen(true);
  };

  const handleOpenAdjust = (part) => {
    setAdjustingPart(part);
    setAdjustType('add');
    setAdjustAmount(1);
    setIsAdjustModalOpen(true);
  };

  const handleSavePart = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Le nom de la pièce est obligatoire.');
      return;
    }

    const payload = {
      ...formData,
      quantity: parseInt(formData.quantity, 10) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
      min_stock_alert: parseInt(formData.min_stock_alert, 10) || 0,
    };

    try {
      if (editingPart?.id) {
        await updatePart({ id: editingPart.id, ...payload }).unwrap();
      } else {
        await createPart(payload).unwrap();
      }
      setIsPartModalOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || 'Erreur lors de l\'enregistrement.');
    }
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (!adjustingPart) return;

    try {
      await adjustStock({
        id: adjustingPart.id,
        type: adjustType,
        amount: parseInt(adjustAmount, 10) || 0,
      }).unwrap();
      setIsAdjustModalOpen(false);
    } catch (err) {
      alert(err?.data?.message || 'Erreur lors de l\'ajustement.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer définitivement cette pièce du stock ?')) {
      try {
        await deletePart(id).unwrap();
      } catch (err) {
        alert(err?.data?.message || 'Erreur lors de la suppression.');
      }
    }
  };

  return (
    <div>
      {/* Top Controls & Action */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.sectionHeading}>Stock des Pièces Détachées de l'Atelier</h2>
          <p style={styles.sectionSub}>Gérez vos écrans, batteries, connecteurs et pièces de rechange</p>
        </div>
        <button onClick={handleOpenCreate} style={styles.addBtn} type="button">
          <Plus size={16} style={{ marginRight: '6px' }} />
          Ajouter une Pièce au Stock
        </button>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Références</span>
            <Layers size={18} color="#0284c7" />
          </div>
          <div style={styles.kpiVal}>{stats.total_references || 0}</div>
          <div style={styles.kpiSub}>Types de pièces cataloguées</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Unités en Stock</span>
            <Package size={18} color="#16a34a" />
          </div>
          <div style={{ ...styles.kpiVal, color: '#16a34a' }}>{stats.total_units || 0}</div>
          <div style={styles.kpiSub}>Pièces physiques disponibles</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: (stats.low_stock_count || 0) > 0 ? '4px solid #ef4444' : '1px solid #e5e7eb' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Alertes Stock Bas</span>
            <AlertTriangle size={18} color={(stats.low_stock_count || 0) > 0 ? '#ef4444' : '#9ca3af'} />
          </div>
          <div style={{ ...styles.kpiVal, color: (stats.low_stock_count || 0) > 0 ? '#dc2626' : '#111827' }}>
            {stats.low_stock_count || 0}
          </div>
          <div style={styles.kpiSub}>Pièces à réapprovisionner</div>
        </div>

        {isAdmin && stats.total_inventory_value !== undefined && (
          <div style={{ ...styles.kpiCard, borderLeft: '4px solid #0284c7' }}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiTitle}>Valeur Marchande du Stock</span>
              <DollarSign size={18} color="#0284c7" />
            </div>
            <div style={{ ...styles.kpiVal, color: '#0284c7' }}>{stats.total_inventory_value} DH</div>
            <div style={styles.kpiSub}>Coût total immobilisé</div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            placeholder="Rechercher par pièce, marque, modèle compatible, emplacement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} style={styles.clearBtn}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setLowStockFilter(!lowStockFilter);
              setPage(1);
            }}
            style={{
              ...styles.filterBtn,
              backgroundColor: lowStockFilter ? '#fee2e2' : '#ffffff',
              color: lowStockFilter ? '#b91c1c' : '#4b5563',
              border: lowStockFilter ? '1px solid #f87171' : '1px solid #d1d5db',
            }}
          >
            <AlertTriangle size={14} style={{ marginRight: '6px' }} />
            Stock Bas Uniquement
          </button>
        </div>
      </div>

      {/* Parts Table */}
      <div style={styles.tableCard}>
        {isLoading || isFetching ? (
          <div style={styles.loadingBox}>Chargement des pièces détachées...</div>
        ) : partsList.length === 0 ? (
          <div style={styles.emptyBox}>
            <Package size={36} color="#9ca3af" style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontWeight: '600', color: '#4b5563' }}>Aucune pièce en stock</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Ajoutez vos écrans, batteries ou connecteurs pour pouvoir les sélectionner facilement lors des réparations.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nom de la Pièce</th>
                  <th style={styles.th}>Marque & Modèle Compatible</th>
                  <th style={styles.th}>Emplacement</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Quantité en Stock</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Coût d'Achat (DH)</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {partsList.map((part) => {
                  const isLow = part.quantity <= part.min_stock_alert;
                  return (
                    <tr key={part.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '700', color: '#111827' }}>{part.name}</div>
                        {part.notes && (
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{part.notes}</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {part.brand || 'Toutes marques'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#0284c7' }}>
                          {part.compatible_model || 'Universel'}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {part.location ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4b5563' }}>
                            <MapPin size={12} color="#6b7280" />
                            <span>{part.location}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: '800',
                          backgroundColor: isLow ? '#fee2e2' : '#dcfce7',
                          color: isLow ? '#b91c1c' : '#15803d',
                        }}>
                          {isLow && <AlertTriangle size={12} />}
                          {part.quantity} unité{part.quantity > 1 ? 's' : ''}
                        </span>
                        {isLow && (
                          <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '2px' }}>
                            (Seuil alerte: {part.min_stock_alert})
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                        {parseFloat(part.cost_price || 0).toFixed(2)} DH
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={styles.actions}>
                          <button
                            type="button"
                            title="Ajuster le stock (+ / -)"
                            onClick={() => handleOpenAdjust(part)}
                            style={{ ...styles.actionBtn, backgroundColor: '#f0f9ff' }}
                          >
                            <Sliders size={14} color="#0284c7" />
                          </button>
                          <button
                            type="button"
                            title="Modifier"
                            onClick={() => handleOpenEdit(part)}
                            style={styles.actionBtn}
                          >
                            <Edit3 size={14} color="#4b5563" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() => handleDelete(part.id)}
                              style={{ ...styles.actionBtn, backgroundColor: '#fef2f2' }}
                            >
                              <Trash2 size={14} color="#ef4444" />
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

        <Pagination
          currentPage={page}
          lastPage={totalPages}
          total={totalItems}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* CREATE / EDIT MODAL */}
      {isPartModalOpen && (
        <div style={styles.backdrop}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingPart ? 'Modifier la Pièce de Rechange' : 'Ajouter une Pièce au Stock'}
              </h3>
              <button type="button" onClick={() => setIsPartModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={styles.modalError}>{formError}</div>
            )}

            <form onSubmit={handleSavePart} style={styles.modalForm}>
              <div>
                <label style={styles.inputLabel}>Nom de la pièce *</label>
                <input
                  type="text"
                  placeholder="Ex: Écran OLED, Batterie 4500mAh, Port de charge Type-C"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={styles.inputLabel}>Marque (ex: Apple, Samsung)</label>
                  <input
                    type="text"
                    placeholder="Ex: Samsung"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.inputLabel}>Modèle Compatible</label>
                  <input
                    type="text"
                    placeholder="Ex: Galaxy A54 5G, iPhone 13"
                    value={formData.compatible_model}
                    onChange={(e) => setFormData({ ...formData, compatible_model: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.grid3}>
                <div>
                  <label style={styles.inputLabel}>Quantité en stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.inputLabel}>Coût d'achat magasin (DH) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.inputLabel}>Seuil d'alerte stock bas</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.grid2}>
                <div>
                  <label style={styles.inputLabel}>Emplacement atelier</label>
                  <input
                    type="text"
                    placeholder="Ex: Tiroir B-2, Boîte Écrans"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.inputLabel}>Notes / Fournisseur</label>
                  <input
                    type="text"
                    placeholder="Ex: Qualité Service Pack originale"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsPartModalOpen(false)} style={styles.cancelBtn}>
                  Annuler
                </button>
                <button type="submit" disabled={isCreating || isUpdating} style={styles.saveBtn}>
                  {isCreating || isUpdating ? 'Enregistrement...' : 'Enregistrer la Pièce'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {isAdjustModalOpen && adjustingPart && (
        <div style={styles.backdrop}>
          <div style={{ ...styles.modalBox, maxWidth: '440px' }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Ajuster le Stock : {adjustingPart.name}</h3>
              <button type="button" onClick={() => setIsAdjustModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} style={styles.modalForm}>
              <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '8px' }}>
                Stock actuel : <strong style={{ color: '#0284c7' }}>{adjustingPart.quantity} unité(s)</strong>
              </div>

              <div>
                <label style={styles.inputLabel}>Action</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    style={{
                      ...styles.typeBtn,
                      backgroundColor: adjustType === 'add' ? '#dcfce7' : '#ffffff',
                      borderColor: adjustType === 'add' ? '#16a34a' : '#d1d5db',
                      color: adjustType === 'add' ? '#15803d' : '#374151',
                    }}
                  >
                    + Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('subtract')}
                    style={{
                      ...styles.typeBtn,
                      backgroundColor: adjustType === 'subtract' ? '#fee2e2' : '#ffffff',
                      borderColor: adjustType === 'subtract' ? '#dc2626' : '#d1d5db',
                      color: adjustType === 'subtract' ? '#b91c1c' : '#374151',
                    }}
                  >
                    - Retirer
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('set')}
                    style={{
                      ...styles.typeBtn,
                      backgroundColor: adjustType === 'set' ? '#e0f2fe' : '#ffffff',
                      borderColor: adjustType === 'set' ? '#0284c7' : '#d1d5db',
                      color: adjustType === 'set' ? '#0369a1' : '#374151',
                    }}
                  >
                    = Définir
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={styles.inputLabel}>
                  {adjustType === 'add' ? 'Quantité reçue / ajoutée' : adjustType === 'subtract' ? 'Quantité retirée' : 'Nouveau stock exact'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} style={styles.cancelBtn}>
                  Annuler
                </button>
                <button type="submit" disabled={isAdjusting} style={styles.saveBtn}>
                  {isAdjusting ? 'Mise à jour...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionHeading: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: '#111827',
  },
  sectionSub: {
    margin: '3px 0 0 0',
    fontSize: '12px',
    color: '#6b7280',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(2, 132, 199, 0.3)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '18px',
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  kpiTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#111827',
  },
  kpiSub: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '3px',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '7px 12px',
    width: '100%',
    maxWidth: '440px',
    gap: '8px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  filterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '11px 14px',
    backgroundColor: '#f9fafb',
    fontSize: '12px',
    fontWeight: '700',
    color: '#4b5563',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '11px 14px',
    fontSize: '13px',
    verticalAlign: 'middle',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  actionBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  loadingBox: {
    padding: '35px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '13px',
  },
  emptyBox: {
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '16px',
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
  },
  modalError: {
    margin: '12px 20px 0 20px',
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '6px',
    fontSize: '12px',
  },
  modalForm: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  typeBtn: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 18px',
    backgroundColor: '#0284c7',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
};

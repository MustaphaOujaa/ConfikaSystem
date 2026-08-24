import React, { useState } from 'react';
import { Plus, Edit, Trash2, Tags, Bookmark } from 'lucide-react';
import { useSelector } from 'react-redux';
import { 
  useGetCategoriesQuery, 
  useCreateCategoryMutation, 
  useUpdateCategoryMutation, 
  useDeleteCategoryMutation,
  useGetBrandsQuery,
  useCreateBrandMutation
} from '../api/apiSlice';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import { selectCurrentUser } from '../store/authSlice';

export default function CategoriesPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'brands'

  // Modals state
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [isEditCatOpen, setIsEditCatOpen] = useState(false);
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);

  // Forms
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [formError, setFormError] = useState('');

  // RTK Query
  const { data: categoriesData, isLoading: loadingCategories } = useGetCategoriesQuery({ page });
  const { data: brandsData, isLoading: loadingBrands } = useGetBrandsQuery();

  const [createCategory, { isLoading: creatingCat }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updatingCat }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const [createBrand, { isLoading: creatingBrand }] = useCreateBrandMutation();

  const categories = categoriesData?.data || [];
  const brands = brandsData || [];
  const catPagination = categoriesData ? {
    currentPage: categoriesData.current_page || 1,
    lastPage: categoriesData.last_page || 1,
    total: categoriesData.total || categories.length,
  } : { currentPage: 1, lastPage: 1, total: 0 };

  const handleOpenAddCat = () => {
    setCatName('');
    setCatDesc('');
    setFormError('');
    setIsAddCatOpen(true);
  };

  const handleOpenEditCat = (cat) => {
    setEditingCat(cat);
    setCatName(cat.name || '');
    setCatDesc(cat.description || '');
    setFormError('');
    setIsEditCatOpen(true);
  };

  const handleCreateCatSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await createCategory({ name: catName, description: catDesc }).unwrap();
      setIsAddCatOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de la création de la catégorie.');
    }
  };

  const handleEditCatSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await updateCategory({ id: editingCat.id, name: catName, description: catDesc }).unwrap();
      setIsEditCatOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de la mise à jour de la catégorie.');
    }
  };

  const handleDeleteCat = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette catégorie ?')) {
      try {
        await deleteCategory(id).unwrap();
      } catch (err) {
        console.error(err);
        alert('Échec de la suppression de la catégorie.');
      }
    }
  };

  const handleCreateBrandSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await createBrand({ name: brandName }).unwrap();
      setBrandName('');
      setIsAddBrandOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de la création de la marque.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Tab Switcher & Action Header */}
      <div className="responsive-toolbar" style={styles.toolbar}>
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('categories')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'categories' ? styles.tabBtnActive : {}),
            }}
          >
            <Tags size={16} style={{ marginRight: '6px' }} />
            <span>Catégories</span>
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'brands' ? styles.tabBtnActive : {}),
            }}
          >
            <Bookmark size={16} style={{ marginRight: '6px' }} />
            <span>Marques</span>
          </button>
        </div>

        {activeTab === 'categories' ? (
          <button onClick={handleOpenAddCat} style={styles.addBtn}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            <span>Nouvelle Catégorie</span>
          </button>
        ) : (
          <button onClick={() => { setBrandName(''); setFormError(''); setIsAddBrandOpen(true); }} style={styles.addBtn}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            <span>Nouvelle Marque</span>
          </button>
        )}
      </div>

      {/* Tab Content: Categories */}
      {activeTab === 'categories' && (
        <div className="responsive-table-container" style={styles.card}>
          {loadingCategories ? (
            <div style={styles.loading}>Chargement des catégories...</div>
          ) : categories.length === 0 ? (
            <div style={styles.emptyState}>Aucune catégorie trouvée. Créez-en une pour organiser vos produits.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nom de la Catégorie</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Total Produits</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '600', color: '#111827' }}>{c.name}</td>
                    <td style={styles.td}>{c.description || '—'}</td>
                    <td style={styles.td}>
                      <span style={styles.countBadge}>
                        {c.products_count ?? 0} Produits
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => handleOpenEditCat(c)} style={styles.iconBtn} title="Modifier">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteCat(c.id)} style={styles.deleteIconBtn} title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <Pagination
            currentPage={catPagination.currentPage}
            lastPage={catPagination.lastPage}
            total={catPagination.total}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Tab Content: Brands */}
      {activeTab === 'brands' && (
        <div style={styles.card}>
          {loadingBrands ? (
            <div style={styles.loading}>Chargement des marques...</div>
          ) : brands.length === 0 ? (
            <div style={styles.emptyState}>Aucune marque ajoutée.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nom de la Marque</th>
                  <th style={styles.th}>Date de Création</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => (
                  <tr key={b.id} style={styles.tr}>
                    <td style={styles.td}>#{b.id}</td>
                    <td style={{ ...styles.td, fontWeight: '600', color: '#111827' }}>{b.name}</td>
                    <td style={styles.td}>{b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      <Modal isOpen={isAddCatOpen} onClose={() => setIsAddCatOpen(false)} title="Ajouter une Catégorie">
        {formError && <div style={styles.formError}>{formError}</div>}
        <form onSubmit={handleCreateCatSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom de la catégorie *</label>
            <input
              type="text"
              required
              placeholder="ex: Électronique"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              rows="3"
              placeholder="Détails de la catégorie..."
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              style={styles.textarea}
            />
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={() => setIsAddCatOpen(false)} style={styles.cancelBtn}>Annuler</button>
            <button type="submit" disabled={creatingCat} style={styles.saveBtn}>
              {creatingCat ? 'Enregistrement...' : 'Créer la Catégorie'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal isOpen={isEditCatOpen} onClose={() => setIsEditCatOpen(false)} title="Modifier la Catégorie">
        {formError && <div style={styles.formError}>{formError}</div>}
        <form onSubmit={handleEditCatSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom de la catégorie *</label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              rows="3"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              style={styles.textarea}
            />
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={() => setIsEditCatOpen(false)} style={styles.cancelBtn}>Annuler</button>
            <button type="submit" disabled={updatingCat} style={styles.saveBtn}>
              {updatingCat ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Brand Modal */}
      <Modal isOpen={isAddBrandOpen} onClose={() => setIsAddBrandOpen(false)} title="Ajouter une Marque">
        {formError && <div style={styles.formError}>{formError}</div>}
        <form onSubmit={handleCreateBrandSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom de la marque *</label>
            <input
              type="text"
              required
              placeholder="ex: Logitech"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={() => setIsAddBrandOpen(false)} style={styles.cancelBtn}>Annuler</button>
            <button type="submit" disabled={creatingBrand} style={styles.saveBtn}>
              {creatingBrand ? 'Enregistrement...' : 'Créer la Marque'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabs: {
    display: 'flex',
    backgroundColor: '#e5e7eb',
    padding: '3px',
    borderRadius: '6px',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    color: '#dc2626',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '9px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  loading: {
    padding: '30px',
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyState: {
    padding: '30px',
    textAlign: 'center',
    color: '#6b7280',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#4b5563',
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
  countBadge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  iconBtn: {
    padding: '6px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    color: '#4b5563',
    cursor: 'pointer',
  },
  deleteIconBtn: {
    padding: '6px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '4px',
    color: '#dc2626',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formError: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '9px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
  },
  textarea: {
    padding: '9px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  cancelBtn: {
    padding: '9px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 16px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
};

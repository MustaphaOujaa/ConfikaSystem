import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  TrendingUp 
} from 'lucide-react';
import { 
  useGetProductsQuery, 
  useGetCategoriesQuery, 
  useGetBrandsQuery,
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useDeleteProductMutation 
} from '../api/apiSlice';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states
  const emptyForm = { 
    name: '', 
    category_id: '', 
    brand_id: '',
    barcode: '', 
    cost_price: '', 
    price: '', 
    quantity: '', 
    description: '' 
  };
  const [formData, setFormData] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');

  // RTK Query hooks
  const { data: productsData, isLoading: loadingProducts, error: fetchError } = useGetProductsQuery({ page });
  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: brandsData } = useGetBrandsQuery();
  
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const categories = categoriesData?.data || categoriesData || [];
  const brands = brandsData?.data || brandsData || [];
  const products = productsData?.data || [];
  const pagination = productsData ? {
    currentPage: productsData.current_page || 1,
    lastPage: productsData.last_page || 1,
    total: productsData.total || products.length,
  } : { currentPage: 1, lastPage: 1, total: 0 };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || String(p.category_id) === String(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      ...emptyForm,
      category_id: categories.length > 0 ? categories[0].id : '',
    });
    setImageFile(null);
    setImagePreview(null);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      barcode: product.barcode || '',
      cost_price: product.cost_price || '',
      price: product.price || '',
      quantity: product.quantity || '',
      description: product.description || '',
    });
    setImageFile(null);
    const existingImg = product.images && product.images.length > 0 ? product.images[0].path : null;
    setImagePreview(existingImg);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('category_id', formData.category_id);
    if (formData.brand_id) payload.append('brand_id', formData.brand_id);
    payload.append('barcode', formData.barcode);
    payload.append('cost_price', formData.cost_price || 0);
    payload.append('price', formData.price);
    payload.append('quantity', formData.quantity);
    if (formData.description) payload.append('description', formData.description);
    if (imageFile) payload.append('image', imageFile);

    try {
      await createProduct(payload).unwrap();
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de la création du produit. Vérifiez l\'unicité du code-barres.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = new FormData();
    payload.append('_method', 'PUT');
    payload.append('name', formData.name);
    payload.append('category_id', formData.category_id);
    if (formData.brand_id) payload.append('brand_id', formData.brand_id);
    payload.append('barcode', formData.barcode);
    payload.append('cost_price', formData.cost_price || 0);
    payload.append('price', formData.price);
    payload.append('quantity', formData.quantity);
    if (formData.description) payload.append('description', formData.description);
    if (imageFile) payload.append('image', imageFile);

    try {
      await updateProduct({ id: editingProduct.id, formData: payload }).unwrap();
      setIsEditModalOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de la mise à jour du produit.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      try {
        await deleteProduct(id).unwrap();
      } catch (err) {
        console.error(err);
        alert('Échec de la suppression du produit.');
      }
    }
  };

  const calculateGain = (price, cost) => {
    const p = parseFloat(price) || 0;
    const c = parseFloat(cost) || 0;
    return p - c;
  };

  return (
    <div style={styles.container}>
      {/* Top Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchGroup}>
          <div style={styles.inputWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher par nom ou code-barres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button onClick={handleOpenAdd} style={styles.addBtn}>
          <Plus size={16} style={{ marginRight: '6px' }} />
          <span>Nouveau Produit</span>
        </button>
      </div>

      {/* Products Table */}
      <div style={styles.tableCard}>
        {loadingProducts ? (
          <div style={styles.loading}>Chargement de l'inventaire...</div>
        ) : fetchError ? (
          <div style={styles.errorState}>Erreur lors du chargement des produits. Vérifiez le serveur API.</div>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.emptyState}>Aucun produit trouvé. Ajoutez votre premier produit.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Image</th>
                <th style={styles.th}>Détails Produit</th>
                <th style={styles.th}>Code-barres</th>
                <th style={styles.th}>Catégorie</th>
                <th style={styles.th}>Marque</th>
                <th style={styles.th}>Prix d'Achat</th>
                <th style={styles.th}>Prix de Vente</th>
                <th style={styles.th}>Bénéfice Unitaire</th>
                <th style={styles.th}>Stock</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const primaryImage = p.images && p.images.length > 0 ? p.images[0].path : null;
                const isLowStock = p.quantity <= 5;
                const gain = calculateGain(p.price, p.cost_price);
                return (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                      {primaryImage ? (
                        <img 
                          src={primaryImage} 
                          alt={p.name} 
                          style={styles.productThumb} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/icon.jpeg';
                          }}
                        />
                      ) : (
                        <div style={styles.noThumb}>
                          <Package size={18} />
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.productName}>{p.name}</div>
                      {p.description && <div style={styles.productDesc}>{p.description}</div>}
                    </td>
                    <td style={styles.td}>
                      <code style={styles.barcodeCode}>{p.barcode}</code>
                    </td>
                    <td style={styles.td}>{p.category?.name || '—'}</td>
                    <td style={styles.td}>{p.brand?.name || '—'}</td>
                    <td style={styles.td}>{Number(p.cost_price || 0).toFixed(2)} MAD</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: '#111827' }}>
                      {Number(p.price).toFixed(2)} MAD
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.gainBadge, backgroundColor: gain >= 0 ? '#ecfdf5' : '#fef2f2', color: gain >= 0 ? '#059669' : '#dc2626' }}>
                        <TrendingUp size={12} style={{ marginRight: '3px' }} />
                        +{gain.toFixed(2)} MAD
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={isLowStock ? styles.stockBadgeLow : styles.stockBadgeNormal}>
                        {isLowStock && <AlertTriangle size={12} style={{ marginRight: '4px' }} />}
                        {p.quantity} Unités
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionGroup}>
                        <button onClick={() => handleOpenEdit(p)} style={styles.iconBtn} title="Modifier le produit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} style={styles.deleteIconBtn} title="Supprimer le produit">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination
          currentPage={pagination.currentPage}
          lastPage={pagination.lastPage}
          total={pagination.total}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Enregistrer un Nouveau Produit">
        {formError && <div style={styles.formError}>{formError}</div>}
        <form onSubmit={handleCreateSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom du produit *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Souris Sans Fil"
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Code-barres / SKU *</label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="ex: 123456789"
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Catégorie *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                style={styles.input}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marque selector (optional) */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Marque (optionnel)</label>
            <select
              value={formData.brand_id}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              style={styles.input}
            >
              <option value="">— Aucune marque —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Prix d'Achat (Original Cost) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="ex: 150.00"
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Prix de Vente *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="ex: 250.00"
                style={styles.input}
              />
            </div>
          </div>

          {/* Unit Gain Preview */}
          <div style={styles.gainCalcBox}>
            Bénéfice Unitaire Estimé (Gain):{' '}
            <strong style={{ color: '#059669' }}>
              +{calculateGain(formData.price, formData.cost_price).toFixed(2)} MAD
            </strong>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Quantité Stock Initial *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="50"
                style={styles.input}
              />
            </div>
          </div>

          {/* Direct File Image Selector */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Image du produit (Import direct optionnel)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
            {imagePreview && (
              <div style={styles.previewBox}>
                <img src={imagePreview} alt="Aperçu" style={styles.previewImg} />
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails du produit..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.modalActions}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={styles.cancelBtn}>Annuler</button>
            <button type="submit" disabled={creating} style={styles.saveBtn}>
              {creating ? 'Enregistrement...' : 'Enregistrer le Produit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier le Produit">
        {formError && <div style={styles.formError}>{formError}</div>}
        <form onSubmit={handleEditSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom du produit *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Code-barres *</label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Catégorie *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                style={styles.input}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marque selector (optional) */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Marque (optionnel)</label>
            <select
              value={formData.brand_id}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              style={styles.input}
            >
              <option value="">— Aucune marque —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Prix d'Achat (Original Cost) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Prix de Vente *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.gainCalcBox}>
            Bénéfice Unitaire Estimé (Gain):{' '}
            <strong style={{ color: '#059669' }}>
              +{calculateGain(formData.price, formData.cost_price).toFixed(2)} MAD
            </strong>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Quantité en Stock *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          {/* Direct File Image Selector */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Changer l'image du produit (Import direct optionnel)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
            {imagePreview && (
              <div style={styles.previewBox}>
                <img src={imagePreview} alt="Aperçu" style={styles.previewImg} />
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={styles.textarea}
            />
          </div>

          <div style={styles.modalActions}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={styles.cancelBtn}>Annuler</button>
            <button type="submit" disabled={updating} style={styles.saveBtn}>
              {updating ? 'Mise à jour...' : 'Mettre à jour'}
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
    gap: '16px',
    flexWrap: 'wrap',
  },
  searchGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexGrow: 1,
  },
  inputWrapper: {
    position: 'relative',
    flexGrow: 1,
    maxWidth: '360px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px 9px 36px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  selectFilter: {
    padding: '9px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#374151',
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
  tableCard: {
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
  errorState: {
    padding: '30px',
    textAlign: 'center',
    color: '#dc2626',
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
    verticalAlign: 'middle',
  },
  productThumb: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  noThumb: {
    width: '40px',
    height: '40px',
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontWeight: '600',
    color: '#111827',
  },
  productDesc: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  barcodeCode: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  gainBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
  },
  stockBadgeNormal: {
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
  },
  stockBadgeLow: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
  },
  actionGroup: {
    display: 'inline-flex',
    gap: '6px',
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
  formRow: {
    display: 'flex',
    gap: '12px',
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
  fileInput: {
    padding: '6px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fafafa',
  },
  previewBox: {
    marginTop: '6px',
  },
  previewImg: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  gainCalcBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#065f46',
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

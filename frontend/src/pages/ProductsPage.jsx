import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Layers,
  Check,
  X,
  Barcode as BarcodeIcon,
  LayoutGrid,
  List
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { 
  useGetProductsQuery, 
  useLazyGetProductsQuery,
  useGetCategoriesQuery, 
  useGetBrandsQuery,
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useDeleteProductMutation,
  useRestockProductMutation,
  useUpdateProductStockMutation,
  useDeleteProductStockMutation 
} from '../api/apiSlice';
import Modal from '../components/common/Modal';
import BarcodeLabelModal from '../components/common/BarcodeLabelModal';
import { playSuccessBeep } from '../utils/audio';
import { selectCurrentUser } from '../store/authSlice';
import { decodeScannerKey, normalizeBarcode, isAzertyBarcode } from '../utils/barcode';

export default function ProductsPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  // Debounce search input to avoid querying on every single keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination to page 1 whenever filters or sorting changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, selectedBrand, sortBy]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedLabelProduct, setSelectedLabelProduct] = useState(null);

  // Restock / Multi-Batch modal state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProductTarget, setRestockProductTarget] = useState(null);
  const [restockMode, setRestockMode] = useState('existing'); // 'existing' | 'new'
  const [selectedStockId, setSelectedStockId] = useState('');
  const [restockForm, setRestockForm] = useState({
    quantity: '',
    cost_price: '',
    price: '',
    batch_number: '',
  });
  const [restockError, setRestockError] = useState('');
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editingBatchName, setEditingBatchName] = useState('');

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

  const [productsList, setProductsList] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('confika_products_view_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const productsObserverTarget = useRef(null);

  // RTK Query hooks - backend handles filtering, search, sorting and pagination
  const [fetchProductsTrigger, { isLoading: loadingInitial, error: fetchError }] = useLazyGetProductsQuery();
  const { data: categoriesData } = useGetCategoriesQuery({ all: true });
  const { data: brandsData } = useGetBrandsQuery();
  
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [restockProduct, { isLoading: restocking }] = useRestockProductMutation();
  const [updateProductStock, { isLoading: updatingStock }] = useUpdateProductStockMutation();
  const [deleteProductStock, { isLoading: deletingStock }] = useDeleteProductStockMutation();

  // Load page 1 whenever filters or sorting changes
  useEffect(() => {
    let isCancelled = false;
    setPage(1);
    setHasMore(true);

    fetchProductsTrigger({
      page: 1,
      per_page: 36,
      category_id: selectedCategory,
      brand_id: selectedBrand,
      search: debouncedSearch,
      sort_by: sortBy,
    }, false)
      .unwrap()
      .then((res) => {
        if (isCancelled) return;
        const items = res?.data || [];
        setProductsList(items);
        setTotalCount(res?.total ?? items.length);
        setHasMore(res?.current_page < res?.last_page);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, selectedCategory, selectedBrand, sortBy, fetchProductsTrigger]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || loadingInitial) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetchProductsTrigger({
        page: nextPage,
        per_page: 36,
        category_id: selectedCategory,
        brand_id: selectedBrand,
        search: debouncedSearch,
        sort_by: sortBy,
      }, false).unwrap();

      const newItems = res?.data || [];
      setProductsList((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        newItems.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      setPage(nextPage);
      setTotalCount(res?.total ?? 0);
      setHasMore(res?.current_page < res?.last_page);
    } catch (err) {
      console.error('Failed to load more products:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!productsObserverTarget.current || !hasMore || loadingMore || loadingInitial) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loadingInitial) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentEl = productsObserverTarget.current;
    observer.observe(currentEl);
    return () => {
      if (currentEl) observer.unobserve(currentEl);
      observer.disconnect();
    };
  }, [hasMore, loadingMore, loadingInitial, page, debouncedSearch, selectedCategory, selectedBrand, sortBy]);

  const refreshProducts = async () => {
    try {
      const res = await fetchProductsTrigger({
        page: 1,
        per_page: Math.max(36, productsList.length),
        category_id: selectedCategory,
        brand_id: selectedBrand,
        search: debouncedSearch,
        sort_by: sortBy,
      }, false).unwrap();
      const items = res?.data || [];
      setProductsList(items);
      setTotalCount(res?.total ?? items.length);
      setHasMore(res?.current_page < res?.last_page);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('confika_products_view_mode', mode);
    } catch (e) {
      // ignore
    }
  };

  const categories = categoriesData?.data || categoriesData || [];
  const brands = brandsData?.data || brandsData || [];
  const products = productsList;
  const loadingProducts = loadingInitial;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // USB Barcode Scanner keystroke capture when Add or Edit modal is open
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleScannerKeyDown = (e) => {
      const currentTime = Date.now();
      const interval = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (interval > 120) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const rawCode = buffer.trim();
        const code = normalizeBarcode(rawCode);
        if (code.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          setFormData((prev) => ({ ...prev, barcode: code }));
          playSuccessBeep();
          buffer = '';
        }
      } else {
        const decodedChar = decodeScannerKey(e);
        if (decodedChar) {
          buffer += decodedChar;
        }
      }
    };

    window.addEventListener('keydown', handleScannerKeyDown, true);
    return () => window.removeEventListener('keydown', handleScannerKeyDown, true);
  }, [isAddModalOpen, isEditModalOpen]);

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

  const handleOpenBarcodeLabel = (product) => {
    setSelectedLabelProduct(product);
    setIsLabelModalOpen(true);
  };

  const handleOpenRestock = (product) => {
    setRestockProductTarget(product);
    const activeStocks = product.active_stocks || product.stocks || [];
    const firstStock = activeStocks[0];
    
    // Default to existing if there is an active stock, or new if none
    if (firstStock) {
      setRestockMode('existing');
      setSelectedStockId(firstStock.id);
      setRestockForm({
        quantity: '',
        cost_price: firstStock.cost_price || product.cost_price || '',
        price: firstStock.price || product.price || '',
        batch_number: '',
      });
    } else {
      setRestockMode('new');
      setSelectedStockId('');
      setRestockForm({
        quantity: '',
        cost_price: product.cost_price || '',
        price: product.price || '',
        batch_number: '',
      });
    }
    setRestockError('');
    setIsRestockModalOpen(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockProductTarget) return;
    setRestockError('');

    const qty = parseInt(restockForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setRestockError('Veuillez spécifier une quantité valide (au moins 1).');
      return;
    }

    const payload = {
      id: restockProductTarget.id,
      quantity: qty,
      cost_price: restockForm.cost_price !== '' ? parseFloat(restockForm.cost_price) : undefined,
      price: restockForm.price !== '' ? parseFloat(restockForm.price) : undefined,
    };

    if (restockMode === 'existing') {
      if (!selectedStockId) {
        setRestockError('Veuillez sélectionner un lot existant.');
        return;
      }
      payload.stock_id = selectedStockId;
    } else {
      if (restockForm.batch_number.trim()) {
        payload.batch_number = restockForm.batch_number.trim();
      }
    }

    try {
      await restockProduct(payload).unwrap();
      setIsRestockModalOpen(false);
      setRestockProductTarget(null);
      refreshProducts();
    } catch (err) {
      setRestockError(err?.data?.message || 'Échec du réapprovisionnement.');
    }
  };

  const handleStartEditBatchName = (stock) => {
    setEditingBatchId(stock.id);
    setEditingBatchName(stock.batch_number || '');
    setRestockError('');
  };

  const handleCancelEditBatchName = () => {
    setEditingBatchId(null);
    setEditingBatchName('');
  };

  const handleSaveBatchName = async (stockId) => {
    if (!restockProductTarget) return;
    setRestockError('');
    try {
      const updatedProduct = await updateProductStock({
        productId: restockProductTarget.id,
        stockId,
        batch_number: editingBatchName.trim() || `Lot #${stockId}`,
      }).unwrap();
      setRestockProductTarget(updatedProduct);
      setEditingBatchId(null);
      setEditingBatchName('');
      refreshProducts();
    } catch (err) {
      setRestockError(err?.data?.message || 'Échec de la modification du nom du lot.');
    }
  };

  const handleDeleteBatch = async (stockId) => {
    if (!restockProductTarget) return;
    if (!window.confirm('Voulez-vous vraiment supprimer ce lot de stock ?')) return;
    setRestockError('');
    try {
      const updatedProduct = await deleteProductStock({
        productId: restockProductTarget.id,
        stockId,
      }).unwrap();
      setRestockProductTarget(updatedProduct);
      // If deleted stock was selected, switch to first available stock
      const remaining = updatedProduct.stocks || [];
      if (selectedStockId === stockId) {
        setSelectedStockId(remaining[0]?.id || '');
      }
      refreshProducts();
    } catch (err) {
      setRestockError(err?.data?.message || 'Échec de la suppression du lot.');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Check if barcode already exists in loaded products to help admin avoid duplicate error
    const inputBarcode = formData.barcode ? formData.barcode.trim() : '';
    if (inputBarcode) {
      const existingProduct = products.find((p) => p.barcode === inputBarcode);
      if (existingProduct) {
        if (window.confirm(`Le produit "${existingProduct.name}" utilise déjà ce code-barres (${inputBarcode}). Voulez-vous ouvrir la fenêtre de Réapprovisionnement / Nouveau Lot pour ce produit ?`)) {
          setIsAddModalOpen(false);
          handleOpenRestock(existingProduct);
          return;
        }
      }
    }

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('category_id', formData.category_id);
    if (formData.brand_id) payload.append('brand_id', formData.brand_id);
    payload.append('barcode', formData.barcode ? formData.barcode.trim() : '');
    payload.append('cost_price', formData.cost_price || 0);
    payload.append('price', formData.price);
    payload.append('quantity', formData.quantity);
    if (formData.description) payload.append('description', formData.description);
    if (imageFile) payload.append('image', imageFile);

    try {
      await createProduct(payload).unwrap();
      setIsAddModalOpen(false);
      refreshProducts();
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de la création du produit.');
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
    payload.append('barcode', formData.barcode ? formData.barcode.trim() : '');
    payload.append('quantity', formData.quantity);
    if (formData.description) payload.append('description', formData.description);
    if (imageFile) payload.append('image', imageFile);
    // Prices are only sent by admin — caissier cannot change them
    if (isAdmin) {
      payload.append('cost_price', formData.cost_price || 0);
      payload.append('price', formData.price);
    }

    try {
      await updateProduct({ id: editingProduct.id, formData: payload }).unwrap();
      setIsEditModalOpen(false);
      refreshProducts();
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de la mise à jour du produit.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      try {
        await deleteProduct(id).unwrap();
        setProductsList((prev) => prev.filter((p) => p.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
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
      <div className="responsive-toolbar" style={styles.toolbar}>
        <div className="responsive-search-group" style={styles.searchGroup}>
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
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">Toutes les marques</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="latest">Trier : Plus récents</option>
            <option value="oldest">Trier : Plus anciens</option>
            <option value="name_asc">Nom (A - Z)</option>
            <option value="name_desc">Nom (Z - A)</option>
            <option value="price_asc">Prix (Croissant)</option>
            <option value="price_desc">Prix (Décroissant)</option>
            <option value="stock_asc">Stock (Croissant)</option>
            <option value="stock_desc">Stock (Décroissant)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Switcher (Table vs Cards Grid) */}
          <div style={styles.viewToggleGroup}>
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              style={{
                ...styles.viewToggleBtn,
                backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#111827' : '#6b7280',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              title="Affichage Tableau"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              style={{
                ...styles.viewToggleBtn,
                backgroundColor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#111827' : '#6b7280',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              title="Affichage Grille (Cartes)"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {isAdmin && (
            <button onClick={handleOpenAdd} style={styles.addBtn}>
              <Plus size={16} style={{ marginRight: '6px' }} />
              <span>Nouveau Produit</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Display (Table or Grid Cards) */}
      {loadingProducts && products.length === 0 ? (
        <div style={styles.tableCard}>
          <div style={styles.loading}>
            <span className="spinner-spin" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Chargement de l'inventaire...
          </div>
        </div>
      ) : fetchError ? (
        <div style={styles.tableCard}>
          <div style={styles.errorState}>Erreur lors du chargement des produits. Vérifiez le serveur API.</div>
        </div>
      ) : products.length === 0 ? (
        <div style={styles.tableCard}>
          <div style={styles.emptyState}>Aucun produit trouvé.</div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div style={styles.productsGrid}>
          {products.map((p) => {
            const primaryImage = p.images && p.images.length > 0 ? p.images[0].path : null;
            const isLowStock = p.quantity <= 5;
            const gain = calculateGain(p.price, p.cost_price);

            return (
              <div key={p.id} className="product-management-card" style={styles.productCard}>
                {/* Product Card Image & Badges */}
                <div style={styles.productCardImgWrapper}>
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={p.name}
                      style={styles.productCardImg}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/icon.jpeg';
                      }}
                    />
                  ) : (
                    <div style={styles.productCardNoImg}>
                      <Package size={36} style={{ color: '#94a3b8' }} />
                    </div>
                  )}

                  {/* Stock Badge */}
                  <div
                    style={{
                      ...styles.productCardStockBadge,
                      backgroundColor: p.quantity <= 0 ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981',
                    }}
                  >
                    {p.quantity <= 0 ? 'Rupture' : `${p.quantity} Unités`}
                  </div>

                  {/* Barcode Tag */}
                  {p.barcode && (
                    <div style={styles.productCardBarcodeBadge} title={`Code-barres: ${p.barcode}`}>
                      {p.barcode}
                    </div>
                  )}
                </div>

                {/* Product Card Content */}
                <div style={styles.productCardBody}>
                  <div>
                    <div style={styles.productCardTitle} title={p.name}>
                      {p.name}
                    </div>
                    <div style={styles.productCardCategoryRow}>
                      <span>{p.category?.name || 'Général'}</span>
                      {p.brand?.name && <span style={{ color: '#94a3b8' }}>• {p.brand.name}</span>}
                    </div>
                  </div>

                  {/* Prices & Gain */}
                  <div style={styles.productCardPricesRow}>
                    <div>
                      <span style={styles.productCardPriceLabel}>Prix Vente</span>
                      <div style={styles.productCardPrice}>
                        {Number(p.price).toFixed(2)} <span style={{ fontSize: '11px', color: '#64748b' }}>MAD</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={styles.productCardPriceLabel}>Bénéfice</span>
                        <div
                          style={{
                            ...styles.gainBadge,
                            backgroundColor: gain >= 0 ? '#ecfdf5' : '#fef2f2',
                            color: gain >= 0 ? '#059669' : '#dc2626',
                            fontSize: '11.5px',
                          }}
                        >
                          <TrendingUp size={11} style={{ marginRight: '3px' }} />
                          +{gain.toFixed(2)} MAD
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div style={styles.productCardActions}>
                    {p.barcode && (
                      <button onClick={() => handleOpenBarcodeLabel(p)} style={styles.iconBtn} title="Imprimer l'étiquette code-barres">
                        <BarcodeIcon size={15} color="#4f46e5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleOpenRestock(p)} style={{ ...styles.iconBtn, color: '#059669', borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }} title="Réapprovisionner / Lots">
                        <Layers size={15} />
                      </button>
                    )}
                    <button onClick={() => handleOpenEdit(p)} style={styles.iconBtn} title="Modifier le produit">
                      <Edit size={15} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(p.id)} style={styles.deleteIconBtn} title="Supprimer">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="responsive-table-container" style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Image</th>
                <th style={styles.th}>Détails Produit</th>
                <th style={styles.th}>Code-barres</th>
                <th style={styles.th}>Catégorie</th>
                <th style={styles.th}>Marque</th>
                {isAdmin && <th style={styles.th}>Prix d'Achat</th>}
                <th style={styles.th}>Prix de Vente</th>
                {isAdmin && <th style={styles.th}>Bénéfice Unitaire</th>}
                <th style={styles.th}>Stock</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
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
                      {p.barcode ? (
                        <code style={styles.barcodeCode}>{p.barcode}</code>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>{p.category?.name || '—'}</td>
                    <td style={styles.td}>{p.brand?.name || '—'}</td>
                    {isAdmin && <td style={styles.td}>{Number(p.cost_price || 0).toFixed(2)} MAD</td>}
                    <td style={{ ...styles.td, fontWeight: '700', color: '#111827' }}>
                      {Number(p.price).toFixed(2)} MAD
                    </td>
                    {isAdmin && (
                      <td style={styles.td}>
                        <span style={{ ...styles.gainBadge, backgroundColor: gain >= 0 ? '#ecfdf5' : '#fef2f2', color: gain >= 0 ? '#059669' : '#dc2626' }}>
                          <TrendingUp size={12} style={{ marginRight: '3px' }} />
                          +{gain.toFixed(2)} MAD
                        </span>
                      </td>
                    )}
                    <td style={styles.td}>
                      <span style={isLowStock ? styles.stockBadgeLow : styles.stockBadgeNormal}>
                        {isLowStock && <AlertTriangle size={12} style={{ marginRight: '4px' }} />}
                        {p.quantity} Unités
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionGroup}>
                        {/* Barcode label: visible only when product has barcode */}
                        {p.barcode && (
                          <button onClick={() => handleOpenBarcodeLabel(p)} style={styles.iconBtn} title="Imprimer l'étiquette code-barres">
                            <BarcodeIcon size={16} color="#4f46e5" />
                          </button>
                        )}
                        {/* Restock / Lots: admin only */}
                        {isAdmin && (
                          <button onClick={() => handleOpenRestock(p)} style={{ ...styles.iconBtn, color: '#059669', borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }} title="Réapprovisionner / Gérer les Lots de Stock">
                            <Layers size={16} />
                          </button>
                        )}
                        {/* Edit */}
                        <button onClick={() => handleOpenEdit(p)} style={styles.iconBtn} title="Modifier le produit">
                          <Edit size={16} />
                        </button>
                        {/* Delete: admin only */}
                        {isAdmin && (
                          <button onClick={() => handleDelete(p.id)} style={styles.deleteIconBtn} title="Supprimer le produit">
                            <Trash2 size={16} />
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

      {/* Infinite Scroll Sentinel & Loader */}
      <div
        ref={productsObserverTarget}
        style={{
          padding: '20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {loadingMore && (
          <div style={styles.infiniteLoading}>
            <span className="spinner-spin" />
            Chargement de plus de produits...
          </div>
        )}
        {!hasMore && products.length > 0 && (
          <div style={styles.infiniteEnded}>
            Tous les produits sont affichés ({products.length} sur {totalCount} au total)
          </div>
        )}
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

          <div className="responsive-form-row" style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Code-barres / SKU (optionnel) (Scanner USB actif)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, barcode: isAzertyBarcode(val) ? normalizeBarcode(val) : val });
                }}
                onBlur={(e) => {
                  setFormData({ ...formData, barcode: normalizeBarcode(e.target.value) });
                }}
                placeholder="ex: 123456789 (optionnel)"
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

          <div className="responsive-form-row" style={styles.formRow}>
            {isAdmin && (
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Prix d'Achat (Coût) *</label>
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
            )}
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

          {/* Unit Gain Preview for Admin */}
          {isAdmin && (
            <div style={styles.gainCalcBox}>
              Bénéfice Unitaire Estimé (Gain):{' '}
              <strong style={{ color: '#059669' }}>
                +{calculateGain(formData.price, formData.cost_price).toFixed(2)} MAD
              </strong>
            </div>
          )}

          <div className="responsive-form-row" style={styles.formRow}>
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
            <label style={styles.label}>Photo du produit (Appareil photo ou Galerie)</label>
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

          <div className="responsive-form-row" style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Code-barres / SKU (optionnel) (Scanner USB actif)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, barcode: isAzertyBarcode(val) ? normalizeBarcode(val) : val });
                }}
                onBlur={(e) => {
                  setFormData({ ...formData, barcode: normalizeBarcode(e.target.value) });
                }}
                placeholder="ex: 123456789 (optionnel)"
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

          {isAdmin ? (
            <>
              <div className="responsive-form-row" style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Prix d'Achat (Coût) *</label>
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
            </>
          ) : (
            /* Caissier: show selling price as read-only info — cannot change it */
            <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Prix de vente (non modifiable) : </span>
              <strong style={{ color: '#111827', fontSize: '14px' }}>
                {Number(formData.price || 0).toFixed(2)} MAD
              </strong>
            </div>
          )}

          {/* Image upload: available for both admin and caissier */}
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

          <div className="responsive-form-row" style={styles.formRow}>
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


      {/* Restock & Batch Management Modal */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setRestockProductTarget(null);
        }}
        title={`Réapprovisionnement — ${restockProductTarget?.name || ''}`}
      >
        {restockError && <div style={styles.formError}>{restockError}</div>}
        
        {restockProductTarget && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Code-barres: <strong>{restockProductTarget.barcode || 'Sans code'}</strong></span>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Stock total actuel: <strong style={{ color: '#059669' }}>{restockProductTarget.quantity} unités</strong></span>
            </div>

            {/* List of existing batches */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase' }}>Lots existants :</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {(restockProductTarget.stocks || []).map((s, idx) => (
                  <div 
                    key={s.id} 
                    style={{ 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      backgroundColor: s.quantity > 0 ? '#ffffff' : '#f3f4f6', 
                      border: s.id === selectedStockId && restockMode === 'existing' ? '2px solid #059669' : '1px solid #e5e7eb',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingBatchId === s.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={editingBatchName}
                            onChange={(e) => setEditingBatchName(e.target.value)}
                            placeholder="Nom du lot"
                            style={{
                              padding: '3px 6px',
                              fontSize: '12px',
                              border: '1px solid #2563eb',
                              borderRadius: '4px',
                              outline: 'none',
                              flex: 1,
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveBatchName(s.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEditBatchName();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBatchName(s.id)}
                            disabled={updatingStock}
                            style={{ padding: '3px 6px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            title="Valider"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditBatchName}
                            style={{ padding: '3px 6px', backgroundColor: '#9ca3af', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            title="Annuler"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong>{s.batch_number || `Lot #${idx + 1}`}</strong>
                          <button
                            type="button"
                            onClick={() => handleStartEditBatchName(s)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', color: '#4b5563' }}
                            title="Modifier le nom de ce lot"
                          >
                            <Edit size={13} />
                          </button>
                          <span style={{ color: '#6b7280' }}>
                            Coût: {Number(s.cost_price).toFixed(2)} MAD | Vente: {Number(s.price).toFixed(2)} MAD
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ 
                        fontWeight: '700', 
                        color: s.quantity > 0 ? '#059669' : '#9ca3af',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: s.quantity > 0 ? '#ecfdf5' : '#e5e7eb',
                        whiteSpace: 'nowrap',
                      }}>
                        {s.quantity} en stock
                      </span>

                      {/* Delete batch button (only if more than 1 batch exists) */}
                      {(restockProductTarget.stocks || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(s.id)}
                          disabled={deletingStock}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: '2px 4px',
                            borderRadius: '3px',
                          }}
                          title="Supprimer ce lot"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector: Add to existing batch vs Create new batch */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setRestockMode('existing')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: restockMode === 'existing' ? '2px solid #059669' : '1px solid #d1d5db',
              backgroundColor: restockMode === 'existing' ? '#ecfdf5' : '#ffffff',
              color: restockMode === 'existing' ? '#059669' : '#374151',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            1. Ajouter à un lot existant
          </button>
          <button
            type="button"
            onClick={() => setRestockMode('new')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: restockMode === 'new' ? '2px solid #2563eb' : '1px solid #d1d5db',
              backgroundColor: restockMode === 'new' ? '#eff6ff' : '#ffffff',
              color: restockMode === 'new' ? '#2563eb' : '#374151',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            2. Créer un NOUVEAU lot (Nouveau Prix)
          </button>
        </div>

        <form onSubmit={handleRestockSubmit} style={styles.form}>
          {restockMode === 'existing' ? (
            <div style={styles.formGroup}>
              <label style={styles.label}>Sélectionnez le lot à approvisionner *</label>
              <select
                required
                value={selectedStockId}
                onChange={(e) => {
                  const sId = parseInt(e.target.value, 10);
                  setSelectedStockId(sId);
                  const st = (restockProductTarget?.stocks || []).find((s) => s.id === sId);
                  if (st) {
                    setRestockForm((prev) => ({
                      ...prev,
                      cost_price: st.cost_price || '',
                      price: st.price || '',
                    }));
                  }
                }}
                style={styles.input}
              >
                {(restockProductTarget?.stocks || []).map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {s.batch_number || `Lot #${idx + 1}`} — Vente: {Number(s.price).toFixed(2)} MAD (Reste: {s.quantity})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={styles.formGroup}>
              <label style={styles.label}>Numéro / Nom du nouveau lot (optionnel)</label>
              <input
                type="text"
                value={restockForm.batch_number}
                onChange={(e) => setRestockForm({ ...restockForm, batch_number: e.target.value })}
                placeholder="ex: LOT-ARRIVAGE-OCTOBRE"
                style={styles.input}
              />
            </div>
          )}

          <div className="responsive-form-row" style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Prix d'Achat (Coût unitaire) {restockMode === 'new' ? '*' : '(optionnel)'}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={restockForm.cost_price}
                onChange={(e) => setRestockForm({ ...restockForm, cost_price: e.target.value })}
                placeholder="ex: 22.00"
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Prix de Vente {restockMode === 'new' ? '*' : '(optionnel)'}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={restockForm.price}
                onChange={(e) => setRestockForm({ ...restockForm, price: e.target.value })}
                placeholder="ex: 32.00"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Quantité à ajouter *</label>
            <input
              type="number"
              min="1"
              required
              value={restockForm.quantity}
              onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
              placeholder="ex: 20"
              style={styles.input}
            />
          </div>

          <div style={styles.modalActions}>
            <button
              type="button"
              onClick={() => {
                setIsRestockModalOpen(false);
                setRestockProductTarget(null);
              }}
              style={styles.cancelBtn}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={restocking}
              style={{
                ...styles.saveBtn,
                backgroundColor: restockMode === 'new' ? '#2563eb' : '#059669',
              }}
            >
              {restocking ? 'Enregistrement...' : restockMode === 'new' ? 'Créer le lot & Réapprovisionner' : 'Ajouter au lot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Barcode Label Printing Modal */}
      <BarcodeLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => {
          setIsLabelModalOpen(false);
          setSelectedLabelProduct(null);
        }}
        product={selectedLabelProduct}
      />

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
    height: '38px',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '160px',
    maxWidth: '220px',
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
  viewToggleGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: '3px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    gap: '2px',
  },
  viewToggleBtn: {
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
    width: '100%',
  },
  productCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    position: 'relative',
    height: '310px',
    boxSizing: 'border-box',
  },
  productCardImgWrapper: {
    position: 'relative',
    width: '100%',
    height: '140px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  productCardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  productCardNoImg: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  productCardStockBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    zIndex: 2,
    lineHeight: '1.2',
  },
  productCardBarcodeBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '2px 7px',
    borderRadius: '6px',
    fontSize: '10.5px',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: '#334155',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(226,232,240,0.8)',
    zIndex: 2,
    fontFamily: 'monospace',
    maxWidth: '130px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  productCardBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'space-between',
    boxSizing: 'border-box',
  },
  productCardTitle: {
    fontSize: '13.5px',
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: '1.35',
    height: '36px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  },
  productCardCategoryRow: {
    fontSize: '11.5px',
    color: '#64748b',
    marginTop: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  productCardPricesRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderTop: '1px solid #f1f5f9',
    borderBottom: '1px solid #f1f5f9',
    marginTop: 'auto',
  },
  productCardPriceLabel: {
    fontSize: '10.5px',
    color: '#94a3b8',
    display: 'block',
    marginBottom: '1px',
    fontWeight: '500',
  },
  productCardPrice: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#111827',
  },
  productCardActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '6px',
    paddingTop: '6px',
  },
  infiniteLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
  },
  infiniteEnded: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '12.5px',
    fontWeight: '500',
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

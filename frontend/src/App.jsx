import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

const API_BASE = 'http://localhost:8000/api';

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [brands, setBrands]           = useState([]);
  const [lowStock, setLowStock]       = useState({ count: 0, items: [] });
  const [stats, setStats]             = useState({ total: 0, lowStockCount: 0, outOfStock: 0 });
  const [loading, setLoading]         = useState(false);

  // Filters
  const [search, setSearch]             = useState('');
  const [categoryId, setCategoryId]     = useState('');
  const [brandId, setBrandId]           = useState('');
  const [minPrice, setMinPrice]         = useState('');
  const [maxPrice, setMaxPrice]         = useState('');
  const [stockStatus, setStockStatus]   = useState('');
  const [viewMode, setViewMode]         = useState('grid');

  // Modals
  const [showAlertModal, setShowAlertModal]   = useState(false);
  const [showAddModal, setShowAddModal]       = useState(false);

  const searchTimer = useRef(null);

  // New product form
  const emptyProduct = {
    name: '', sku: '', category_id: '', brand_id: '',
    quantity: 10, purchase_price: 10, selling_price: 20,
    min_stock_alert: 5, description: '',
  };
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchMeta = async () => {
    try {
      const [cats, brnds, ls] = await Promise.all([
        apiFetch('/categories'),
        apiFetch('/brands'),
        apiFetch('/products/low-stock'),
      ]);
      setCategories(cats);
      setBrands(brnds);
      setLowStock(ls);
    } catch (e) { console.error(e); }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)      params.set('search', search);
      if (categoryId)  params.set('category_id', categoryId);
      if (brandId)     params.set('brand_id', brandId);
      if (minPrice)    params.set('min_price', minPrice);
      if (maxPrice)    params.set('max_price', maxPrice);
      if (stockStatus) params.set('stock_status', stockStatus);
      params.set('per_page', 50);

      const data = await apiFetch(`/products?${params}`);
      const items = data.data || [];
      setProducts(items);
      setStats({
        total: data.total ?? items.length,
        lowStockCount: items.filter(p => p.stock_status === 'low_stock').length,
        outOfStock:    items.filter(p => p.stock_status === 'out_of_stock').length,
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, categoryId, brandId, minPrice, maxPrice, stockStatus]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchProducts, 350);
    return () => clearTimeout(searchTimer.current);
  }, [fetchProducts]);

  useEffect(() => { fetchMeta(); }, []);

  const clearFilters = () => {
    setSearch(''); setCategoryId(''); setBrandId('');
    setMinPrice(''); setMaxPrice(''); setStockStatus('');
  };

  // ── Create product ───────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      });
      setShowAddModal(false);
      setNewProduct(emptyProduct);
      fetchProducts();
      fetchMeta();
    } catch (err) {
      setError('Erreur: ' + err.message);
    }
    setSaving(false);
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* ── HEADER ── */}
      <header className="app-header">
        <div className="brand-title">
          <span className="brand-ck">CK</span>
          <div>
            <div className="brand-confika">CONFIKA</div>
            <div className="brand-tagline">Confiance · Qualité · Performance</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="notification-badge-btn" onClick={() => setShowAlertModal(true)}>
            🔔 Alertes Stock
            {lowStock.count > 0 && (
              <span className="badge-count">{lowStock.count}</span>
            )}
          </button>
          <button className="primary-btn" onClick={() => setShowAddModal(true)}>
            + Ajouter Produit
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div className="main-layout">

        {/* ── SIDEBAR FILTERS ── */}
        <aside className="sidebar">
          <h3>🔽 Filtres</h3>

          <div className="filter-group">
            <label>Catégorie</label>
            <select className="filter-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <React.Fragment key={cat.id}>
                  <option value={cat.id}>📁 {cat.name}</option>
                  {cat.children?.map(sub => (
                    <option key={sub.id} value={sub.id}>&nbsp;&nbsp;└ {sub.name}</option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Marque</label>
            <select className="filter-select" value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">Toutes les marques</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Prix (DH)</label>
            <div className="price-range">
              <input type="number" placeholder="Min" className="filter-input" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
              <input type="number" placeholder="Max" className="filter-input" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </div>
          </div>

          <div className="filter-group">
            <label>Statut Stock</label>
            <select className="filter-select" value={stockStatus} onChange={e => setStockStatus(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="in_stock">✅ En Stock</option>
              <option value="low_stock">⚠️ Stock Faible</option>
              <option value="out_of_stock">❌ Rupture Stock</option>
            </select>
          </div>

          <button className="clear-btn" onClick={clearFilters}>↺ Réinitialiser les filtres</button>
        </aside>

        {/* ── CONTENT ── */}
        <main className="content-area">

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon">📦</span>
              <div>
                <div className="stat-label">Total Produits</div>
                <div className="stat-value">{stats.total}</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⚠️</span>
              <div>
                <div className="stat-label">Stock Faible</div>
                <div className="stat-value warning">{lowStock.count}</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">❌</span>
              <div>
                <div className="stat-label">Rupture Stock</div>
                <div className="stat-value danger">{stats.outOfStock}</div>
              </div>
            </div>
          </div>

          {/* Top Bar */}
          <div className="top-bar">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Rechercher par nom ou SKU/Code barre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="view-toggle">
              <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>⊞ Grille</button>
              <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>☰ Liste</button>
            </div>
          </div>

          {/* Product Grid / List */}
          {loading ? (
            <div className="empty-state">
              <div>⏳</div>
              <p>Chargement des produits...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '3rem' }}>🔎</div>
              <p>Aucun produit trouvé. Essayez de modifier vos filtres.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'product-grid' : 'product-list'}>
              {products.map(item => (
                <ProductCard key={item.id} item={item} listMode={viewMode === 'list'} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── LOW STOCK ALERT MODAL ── */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAlertModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>⚠️ Alertes Stock Faible / Rupture</h2>
              <button className="close-btn" onClick={() => setShowAlertModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <strong style={{ color: 'var(--accent-primary)' }}>{lowStock.count} articles</strong> nécessitent un réapprovisionnement.
            </p>
            <div className="product-list">
              {lowStock.items.length === 0
                ? <p style={{ color: 'var(--accent-success)', textAlign: 'center' }}>✅ Tous les stocks sont corrects !</p>
                : lowStock.items.map(item => (
                  <div key={item.id} className="product-card list-mode">
                    <div>
                      <div className="product-title">{item.name}</div>
                      <div className="product-sku">SKU: {item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-tag ${item.stock_status}`}>
                        {item.quantity === 0 ? 'RUPTURE' : `${item.quantity} restants`}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Seuil: {item.min_stock_alert}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PRODUCT MODAL ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>➕ Nouveau Produit</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            {error && <p style={{ color: 'var(--accent-primary)', fontSize: '0.88rem' }}>{error}</p>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Nom du Produit *</label>
                <input required className="filter-input" value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>SKU / Code Barre *</label>
                <input required className="filter-input" value={newProduct.sku}
                  onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Catégorie</label>
                  <select className="filter-select" value={newProduct.category_id}
                    onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}>
                    <option value="">— Sélectionner —</option>
                    {categories.map(cat => (
                      <React.Fragment key={cat.id}>
                        <option value={cat.id}>{cat.name}</option>
                        {cat.children?.map(sub => <option key={sub.id} value={sub.id}>&nbsp; {sub.name}</option>)}
                      </React.Fragment>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Marque</label>
                  <select className="filter-select" value={newProduct.brand_id}
                    onChange={e => setNewProduct({ ...newProduct, brand_id: e.target.value })}>
                    <option value="">— Sélectionner —</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantité *</label>
                  <input required type="number" min="0" className="filter-input" value={newProduct.quantity}
                    onChange={e => setNewProduct({ ...newProduct, quantity: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Seuil Alerte Stock *</label>
                  <input required type="number" min="0" className="filter-input" value={newProduct.min_stock_alert}
                    onChange={e => setNewProduct({ ...newProduct, min_stock_alert: +e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prix Achat (DH) *</label>
                  <input required type="number" step="0.01" min="0" className="filter-input" value={newProduct.purchase_price}
                    onChange={e => setNewProduct({ ...newProduct, purchase_price: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Prix Vente (DH) *</label>
                  <input required type="number" step="0.01" min="0" className="filter-input" value={newProduct.selling_price}
                    onChange={e => setNewProduct({ ...newProduct, selling_price: +e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="filter-input" rows={2} value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>
              <button type="submit" className="primary-btn" disabled={saving} style={{ marginTop: '0.5rem' }}>
                {saving ? 'Enregistrement...' : '💾 Enregistrer le Produit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ item, listMode }) {
  const statusLabels = {
    in_stock: '✅ En Stock',
    low_stock: '⚠️ Stock Faible',
    out_of_stock: '❌ Rupture',
  };

  return (
    <div className={`product-card ${listMode ? 'list-mode' : ''}`}>
      {!listMode && (
        <span className={`status-tag ${item.stock_status}`}>
          {statusLabels[item.stock_status] || item.stock_status}
        </span>
      )}

      <div>
        <div className="product-title">{item.name}</div>
        <div className="product-sku">SKU: {item.sku}</div>
        {item.brand && <div className="product-sku">🏷️ {item.brand.name}</div>}
        {item.category && <div className="product-sku">📁 {item.category.name}</div>}
      </div>

      <div className="product-price">
        {parseFloat(item.selling_price).toLocaleString('fr-MA')} <span>DH</span>
      </div>

      <div className="product-meta">
        <span>Qté: <strong>{item.quantity}</strong></span>
        <span>Alerte: {item.min_stock_alert}</span>
        {listMode && (
          <span className={`status-tag ${item.stock_status}`}>
            {statusLabels[item.stock_status]}
          </span>
        )}
      </div>
    </div>
  );
}

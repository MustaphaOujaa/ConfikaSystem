import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  Package,
  Search,
  Printer,
  X,
  Edit3,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { 
  useGetProductsQuery, 
  useLazyGetProductsQuery,
  useLazyGetScannerProductQuery, 
  useProcessScannerSaleMutation,
  useCreateTransactionMutation 
} from '../api/apiSlice';
import Modal from '../components/common/Modal';
import { playSuccessBeep, playErrorBeep } from '../utils/audio';
import { selectCurrentUser } from '../store/authSlice';
import { decodeScannerKey, normalizeBarcode, isAzertyBarcode } from '../utils/barcode';

export default function PosPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [hasMoreCatalog, setHasMoreCatalog] = useState(true);
  const [loadingMoreCatalog, setLoadingMoreCatalog] = useState(false);
  const [totalCatalogCount, setTotalCatalogCount] = useState(0);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [transactionType, setTransactionType] = useState('sale'); // 'sale' | 'purchase'
  const [scanError, setScanError] = useState('');
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isConfirmSaleModalOpen, setIsConfirmSaleModalOpen] = useState(false);
  const [batchModalProduct, setBatchModalProduct] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const catalogObserverTarget = useRef(null);

  // Debounce search input to query DB directly from backend
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(catalogSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [catalogSearch]);

  const [fetchProductsTrigger, { isLoading: loadingInitialProducts }] = useLazyGetProductsQuery();
  const [fetchProductByBarcode, { isLoading: searchingBarcode }] = useLazyGetScannerProductQuery();
  const [processScannerSale, { isLoading: processingSale }] = useProcessScannerSaleMutation();
  const [createTransaction, { isLoading: processingTx }] = useCreateTransactionMutation();

  // Load page 1 whenever debounced search query changes
  useEffect(() => {
    let isCancelled = false;
    setCatalogPage(1);
    setHasMoreCatalog(true);

    fetchProductsTrigger({
      page: 1,
      per_page: 36,
      search: debouncedSearch,
    }, false)
      .unwrap()
      .then((res) => {
        if (isCancelled) return;
        const items = res?.data || [];
        setCatalogProducts(items);
        setTotalCatalogCount(res?.total ?? items.length);
        setHasMoreCatalog(res?.current_page < res?.last_page);
      })
      .catch((err) => {
        console.error('Failed to load products in POS:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, fetchProductsTrigger]);

  const loadMoreCatalog = async () => {
    if (!hasMoreCatalog || loadingMoreCatalog || loadingInitialProducts) return;
    setLoadingMoreCatalog(true);
    const nextPage = catalogPage + 1;
    try {
      const res = await fetchProductsTrigger({
        page: nextPage,
        per_page: 36,
        search: debouncedSearch,
      }, false).unwrap();

      const newItems = res?.data || [];
      setCatalogProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        newItems.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      setCatalogPage(nextPage);
      setTotalCatalogCount(res?.total ?? 0);
      setHasMoreCatalog(res?.current_page < res?.last_page);
    } catch (err) {
      console.error('Failed to load more products in POS:', err);
    } finally {
      setLoadingMoreCatalog(false);
    }
  };

  useEffect(() => {
    if (!catalogObserverTarget.current || !hasMoreCatalog || loadingMoreCatalog || loadingInitialProducts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreCatalog && !loadingMoreCatalog && !loadingInitialProducts) {
          loadMoreCatalog();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentEl = catalogObserverTarget.current;
    observer.observe(currentEl);
    return () => {
      if (currentEl) observer.unobserve(currentEl);
      observer.disconnect();
    };
  }, [hasMoreCatalog, loadingMoreCatalog, loadingInitialProducts, catalogPage, debouncedSearch]);

  const refreshCatalog = async () => {
    try {
      const res = await fetchProductsTrigger({
        page: 1,
        per_page: Math.max(36, catalogProducts.length),
        search: debouncedSearch,
      }, false).unwrap();
      const items = res?.data || [];
      setCatalogProducts(items);
      setTotalCatalogCount(res?.total ?? items.length);
      setHasMoreCatalog(res?.current_page < res?.last_page);
    } catch (e) {
      console.error(e);
    }
  };

  const allProducts = catalogProducts;

  // Calculate live front-end stock for any product based on current cart
  const getLiveStock = (product) => {
    const inCart = cart.find((item) => item.product.id === product.id)?.quantity || 0;
    if (transactionType === 'sale') {
      return Math.max(0, (product.quantity || 0) - inCart);
    }
    return (product.quantity || 0) + inCart;
  };

  const filteredCatalog = allProducts.filter((p) => {
    if (!catalogSearch.trim() || catalogSearch.trim() === debouncedSearch.trim()) return true;
    const query = catalogSearch.toLowerCase().trim();
    return (
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.barcode && normalizeBarcode(query) && p.barcode.toLowerCase().includes(normalizeBarcode(query).toLowerCase())) ||
      (p.category?.name && p.category.name.toLowerCase().includes(query)) ||
      (p.brand?.name && p.brand.name.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    // Global USB barcode scanner keystroke listener
    let buffer = '';
    let lastKeyTime = Date.now();
    let scannerBurstCount = 0;

    const handleGlobalKeyDown = async (e) => {
      // Don't intercept when user is typing inside modal inputs
      if (isConfirmSaleModalOpen || isReceiptOpen || isBatchModalOpen) return;

      const currentTime = Date.now();
      const interval = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Reset buffer if delay between keystrokes exceeds 120ms (manual typing vs scanner burst)
      if (interval > 120) {
        buffer = '';
        scannerBurstCount = 0;
      }

      if (e.key === 'Enter') {
        const rawCode = buffer.trim();
        const code = normalizeBarcode(rawCode);
        if (code.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          buffer = '';
          scannerBurstCount = 0;
          setScanError('');
          // Always clear search field on scan so scanner garbage never remains
          setCatalogSearch('');

          try {
            const product = await fetchProductByBarcode(code).unwrap();
            addToCart(product);
          } catch (err) {
            playErrorBeep();
            setScanError(`Code-barres "${code}" introuvable.`);
          }
        }
      } else {
        const decodedChar = decodeScannerKey(e);
        if (decodedChar) {
          buffer += decodedChar;
          scannerBurstCount++;

          // If rapid scanner burst detected (interval < 60ms) and focus is in search input,
          // clear scanner symbols from the input so it stays clean
          if (interval < 60 && scannerBurstCount >= 2) {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') {
              setCatalogSearch('');
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [fetchProductByBarcode, cart, transactionType, isConfirmSaleModalOpen, isReceiptOpen, isBatchModalOpen]);

  const handleManualSearchSubmit = async (e) => {
    e.preventDefault();
    if (!catalogSearch.trim()) return;

    setScanError('');
    const rawQuery = catalogSearch.trim();
    const normalizedQuery = normalizeBarcode(rawQuery);

    if (debouncedSearch !== rawQuery) {
      setDebouncedSearch(rawQuery);
    }

    // 1. Check loaded products first (check barcode with raw & normalized, or product name)
    const exactMatch = allProducts.find(
      (p) =>
        (p.barcode && (p.barcode === rawQuery || p.barcode === normalizedQuery)) ||
        (p.name && p.name.toLowerCase() === rawQuery.toLowerCase())
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setCatalogSearch('');
      return;
    }

    // 2. If filtered catalog has exactly 1 item
    if (filteredCatalog.length === 1) {
      addToCart(filteredCatalog[0]);
      setCatalogSearch('');
      return;
    }

    // 3. Fetch by barcode from backend (try normalized barcode if it looks like AZERTY barcode, else raw query)
    const barcodeToFetch = isAzertyBarcode(rawQuery)
      ? normalizedQuery
      : (/^\d+$/.test(normalizedQuery) && normalizedQuery.length >= 4 ? normalizedQuery : rawQuery);

    try {
      const product = await fetchProductByBarcode(barcodeToFetch).unwrap();
      addToCart(product);
      setCatalogSearch('');
    } catch (err) {
      playErrorBeep();
      setScanError(`Aucun produit trouvé pour "${rawQuery}".`);
    }
  };

  const addToCartWithStock = (product, stock = null) => {
    setScanError('');
    const stockId = stock ? stock.id : null;
    const existing = cart.find(
      (item) => item.product.id === product.id && item.product_stock_id === stockId
    );
    const currentQty = existing ? existing.quantity : 0;

    // Check stock limit
    const maxAvailable = stock ? stock.quantity : (product.quantity || 0);
    if (transactionType === 'sale' && currentQty + 1 > maxAvailable) {
      playErrorBeep();
      setScanError(`Stock insuffisant pour ce lot de "${product.name}". Disponible : ${maxAvailable}.`);
      return;
    }

    playSuccessBeep();

    setCart((prevCart) => {
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id && item.product_stock_id === stockId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          product,
          product_stock_id: stockId,
          stock_batch: stock ? (stock.batch_number || `Lot #${stock.id}`) : null,
          quantity: 1,
          unit_price: stock ? parseFloat(stock.price) : (parseFloat(product.price) || 0),
        },
      ];
    });
  };

  const addToCart = (product) => {
    setScanError('');

    // In sale mode, check if product has multiple active stocks with different prices
    if (transactionType === 'sale') {
      const activeStocks = (product.active_stocks || product.stocks || []).filter(
        (s) => (s.quantity || 0) > 0
      );

      // If more than 1 active batch exists, prompt the cashier to pick
      if (activeStocks.length > 1) {
        setBatchModalProduct({ ...product, activeStocks });
        setIsBatchModalOpen(true);
        return;
      }

      // If exactly 1 active batch exists, use it directly (no prompt!)
      if (activeStocks.length === 1) {
        addToCartWithStock(product, activeStocks[0]);
        return;
      }
    }

    // Default fallback
    addToCartWithStock(product, null);
  };

  const updateQuantity = (productId, stockId, delta) => {
    setScanError('');
    setCart((prevCart) => {
      const target = prevCart.find(
        (item) => item.product.id === productId && item.product_stock_id === stockId
      );
      if (!target) return prevCart;

      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return prevCart.filter(
          (item) => !(item.product.id === productId && item.product_stock_id === stockId)
        );
      }

      return prevCart.map((item) =>
        item.product.id === productId && item.product_stock_id === stockId
          ? { ...item, quantity: newQty }
          : item
      );
    });
  };

  const updateUnitPrice = (productId, stockId, newPrice) => {
    const parsed = Math.max(0, parseFloat(newPrice) || 0);
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId && item.product_stock_id === stockId
          ? { ...item, unit_price: parsed }
          : item
      )
    );
  };

  const removeFromCart = (productId, stockId) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => !(item.product.id === productId && item.product_stock_id === stockId)
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setScanError('');
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const handleOpenCheckoutConfirmation = () => {
    if (cart.length === 0) return;
    setScanError('');

    if (transactionType === 'sale') {
      // Open dynamic price confirmation modal to allow cashier review/edit
      setIsConfirmSaleModalOpen(true);
    } else {
      // Purchase directly proceeds
      handleExecuteCheckout();
    }
  };

  const handleExecuteCheckout = async () => {
    if (cart.length === 0) return;
    setScanError('');

    try {
      let result;
      if (transactionType === 'sale') {
        const payload = {
          items: cart.map((item) => ({
            barcode: item.product.barcode,
            product_stock_id: item.product_stock_id || undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        };
        result = await processScannerSale(payload).unwrap();
      } else {
        // Purchase (Entrée de stock)
        const payload = {
          type: 'purchase',
          items: cart.map((item) => ({
            product_id: item.product.id,
            product_stock_id: item.product_stock_id || undefined,
            quantity: item.quantity,
          })),
        };
        result = await createTransaction(payload).unwrap();
      }

      setIsConfirmSaleModalOpen(false);
      setLastCompletedTransaction(result.transaction || result);
      setIsReceiptOpen(true);
      clearCart();
      refreshCatalog();
    } catch (err) {
      playErrorBeep();
      setScanError(err?.data?.message || err?.message || 'Échec de la validation. Vérifiez le stock disponible.');
    }
  };

  const handleOpenBladeReceipt = (txId) => {
    window.open(`/receipts/${txId}`, '_blank', 'width=400,height=600');
  };

  return (
    <div className="pos-container" style={styles.container}>
      {/* Left Column: Unified Search & Visual Catalog */}
      <div className="pos-left-col" style={styles.leftCol}>
        <div style={{ ...styles.card, flexGrow: 1 }}>
          {/* Card Header */}
          <div style={styles.cardHeader}>
            <Package size={18} style={{ color: '#2563eb', marginRight: '8px' }} />
            <span style={styles.cardTitle}>
              Catalogue des Produits ({totalCatalogCount} Articles)
            </span>
          </div>

          <div style={styles.cardBody}>
            {/* Search Bar (Auto-filters + Enter to add) */}
            <form onSubmit={handleManualSearchSubmit} style={styles.manualSearchWrapper}>
              <Search size={18} style={styles.manualSearchIcon} />
              <input
                type="text"
                placeholder="Rechercher un produit (nom, code-barres, catégorie)..."
                value={catalogSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setCatalogSearch(isAzertyBarcode(val) ? normalizeBarcode(val) : val);
                }}
                style={styles.manualSearchInput}
                autoFocus
              />
              {catalogSearch && (
                <button type="button" onClick={() => setCatalogSearch('')} style={styles.clearSearchBtn}>
                  <X size={14} />
                </button>
              )}
            </form>

            {scanError && <div style={styles.errorBanner}>{scanError}</div>}

            {/* Live Filtered Catalog Grid with Images, Stock Badges & Infinite Scroll */}
            <div style={styles.catalogGrid}>
              {loadingInitialProducts && catalogProducts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                  <span className="spinner-spin" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Chargement des produits...
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                  Aucun produit correspondant à "{catalogSearch}".
                </div>
              ) : (
                <>
                  {filteredCatalog.map((p) => {
                    const liveStock = getLiveStock(p);
                    const isOutOfStock = transactionType === 'sale' && liveStock <= 0;
                    const isLowStock = transactionType === 'sale' && liveStock > 0 && liveStock <= 5;
                    const primaryImage = p.images && p.images.length > 0 ? p.images[0].path : null;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => !isOutOfStock && addToCart(p)}
                        disabled={isOutOfStock}
                        className="pos-product-card"
                        style={{
                          ...styles.catalogItem,
                          opacity: isOutOfStock ? 0.55 : 1,
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          borderColor: isOutOfStock ? '#fecaca' : '#e2e8f0',
                          backgroundColor: isOutOfStock ? '#fafafa' : '#ffffff',
                        }}
                        title={isOutOfStock ? `${p.name} - Stock épuisé` : `Cliquer pour ajouter : ${p.name}`}
                      >
                        {/* Product Image Thumbnail */}
                        <div style={styles.catalogImgWrapper}>
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={p.name}
                              style={{
                                ...styles.catalogImg,
                                filter: isOutOfStock ? 'grayscale(75%)' : 'none',
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/icon.jpeg';
                              }}
                            />
                          ) : (
                            <div style={styles.catalogNoImg}>
                              <Package size={28} style={{ color: '#94a3b8' }} />
                            </div>
                          )}

                          {/* Live Stock Overlay Badge */}
                          <div
                            style={{
                              ...styles.stockOverlayBadge,
                              backgroundColor: isOutOfStock
                                ? '#ef4444'
                                : isLowStock
                                ? '#f59e0b'
                                : '#10b981',
                            }}
                          >
                            {isOutOfStock ? 'Épuisé' : `Stock: ${liveStock}`}
                          </div>
                        </div>

                        {/* Details */}
                        <div style={styles.catalogContent}>
                          <div>
                            <div style={styles.itemTitle} title={p.name}>
                              {p.name}
                            </div>
                            <div style={styles.itemCategory}>
                              <span>{p.category?.name || 'Général'}</span>
                              {p.brand?.name && (
                                <span style={styles.itemBrandDot}>• {p.brand.name}</span>
                              )}
                            </div>
                          </div>

                          <div style={styles.itemPriceRow}>
                            <div style={styles.itemPrice}>
                              {Number(p.price).toFixed(2)} <span style={styles.itemPriceCurrency}>MAD</span>
                            </div>
                            <div
                              className="pos-add-badge"
                              style={{
                                ...styles.addBadge,
                                backgroundColor: isOutOfStock ? '#f1f5f9' : '#fee2e2',
                                color: isOutOfStock ? '#94a3b8' : '#dc2626',
                              }}
                            >
                              <Plus size={13} strokeWidth={2.5} />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Infinite Scroll Sentinel */}
                  <div
                    ref={catalogObserverTarget}
                    style={{
                      gridColumn: '1 / -1',
                      padding: '12px 0',
                      minHeight: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {loadingMoreCatalog && (
                      <div style={styles.infiniteLoading}>
                        <span className="spinner-spin" />
                        Chargement de plus de produits...
                      </div>
                    )}
                    {!hasMoreCatalog && catalogProducts.length > 0 && (
                      <div style={styles.infiniteEnded}>
                        Tous les produits sont affichés ({catalogProducts.length} articles)
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Checkout Cart with Dynamic Unit Price */}
      <div className="pos-right-col" style={styles.rightCol}>
        <div style={styles.cartCard}>
          {/* Cart Header */}
          <div style={styles.cartHeader}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ShoppingCart size={20} style={{ color: '#dc2626', marginRight: '8px' }} />
              <span style={styles.cardTitle}>Panier Actuel</span>
            </div>
            
            {/* Transaction Type Selector */}
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              style={styles.txTypeSelect}
            >
              <option value="sale">Vente</option>
              <option value="purchase">Achat / Entrée Stock</option>
            </select>
          </div>

          {/* Cart Items List */}
          <div style={styles.cartBody}>
            {cart.length === 0 ? (
              <div style={styles.emptyCart}>
                <ShoppingCart size={40} style={{ color: '#d1d5db', marginBottom: '12px' }} />
                <div>Panier vide. Scannez des codes-barres ou cliquez sur les articles à gauche.</div>
              </div>
            ) : (
              <div style={styles.cartList}>
                {cart.map((item) => {
                  const itemImg = item.product.images && item.product.images.length > 0 ? item.product.images[0].path : null;
                  const isPriceModified = transactionType === 'sale' && item.unit_price !== parseFloat(item.product.price);

                  return (
                    <div key={`${item.product.id}-${item.product_stock_id || 'default'}`} style={styles.cartItemRow}>
                      {/* Product Thumbnail */}
                      <div style={styles.cartItemThumbBox}>
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={item.product.name}
                            style={styles.cartItemThumb}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/icon.jpeg';
                            }}
                          />
                        ) : (
                          <div style={styles.cartItemNoThumb}>
                            <Package size={16} />
                          </div>
                        )}
                      </div>

                      {/* Name & Code */}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={styles.cartItemName} title={item.product.name}>
                          {item.product.name}
                        </div>
                        <div style={styles.cartItemSub}>
                          Code: {item.product.barcode}
                          {item.stock_batch && (
                            <span style={{
                              marginLeft: '6px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}>
                              {item.stock_batch}
                            </span>
                          )}
                        </div>
                        
                        {/* Dynamic Unit Price Input for Sales */}
                        {transactionType === 'sale' && (
                          <div style={styles.unitPriceContainer}>
                            <span style={styles.unitPriceLabel}>P.U:</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateUnitPrice(item.product.id, item.product_stock_id, e.target.value)}
                              style={{
                                ...styles.unitPriceInput,
                                borderColor: isPriceModified ? '#f59e0b' : '#d1d5db',
                                backgroundColor: isPriceModified ? '#fffbeb' : '#ffffff',
                              }}
                              title="Prix unitaire de vente négocié / dynamique"
                            />
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>MAD</span>
                            {isPriceModified && (
                              <span style={styles.priceAdjustedBadge} title={`Prix catalogue : ${item.product.price} MAD`}>
                                Modifié
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div style={styles.cartQtyControls}>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.product_stock_id, -1)}
                          style={styles.qtyBtn}
                          title="Diminuer"
                        >
                          <Minus size={14} />
                        </button>
                        <span style={styles.qtyNum}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.product_stock_id, 1)}
                          style={styles.qtyBtn}
                          title="Augmenter"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Subtotal Box */}
                      {transactionType === 'sale' ? (
                        <div style={styles.cartPriceBox}>
                          <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '13px' }}>
                            {(item.quantity * item.unit_price).toFixed(2)} MAD
                          </div>
                        </div>
                      ) : isAdmin ? (
                        <div style={styles.cartPriceBox}>
                          {(item.quantity * (parseFloat(item.product.cost_price) || 0)).toFixed(2)} MAD
                        </div>
                      ) : (
                        <div style={{ ...styles.cartPriceBox, color: '#16a34a', fontWeight: '700' }}>
                          +{item.quantity} Unité{item.quantity > 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product.id, item.product_stock_id)}
                        style={styles.cartRemoveBtn}
                        title="Retirer l'article"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Summary & Checkout Action */}
          <div style={styles.cartFooter}>
            {transactionType === 'sale' ? (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Total à Payer:</span>
                <span style={styles.totalVal}>{totalAmount.toFixed(2)} MAD</span>
              </div>
            ) : isAdmin ? (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Coût Total Achat:</span>
                <span style={{ ...styles.totalVal, color: '#16a34a' }}>
                  {cart.reduce((sum, item) => sum + item.quantity * (parseFloat(item.product.cost_price) || 0), 0).toFixed(2)} MAD
                </span>
              </div>
            ) : (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Total Articles à Entrer:</span>
                <span style={{ ...styles.totalVal, color: '#16a34a' }}>
                  +{cart.reduce((sum, item) => sum + item.quantity, 0)} Unités
                </span>
              </div>
            )}

            <div style={styles.cartActions}>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                style={styles.clearBtn}
              >
                Vider Panier
              </button>
              <button
                onClick={handleOpenCheckoutConfirmation}
                disabled={cart.length === 0 || processingSale || processingTx}
                style={{
                  ...styles.checkoutBtn,
                  backgroundColor: transactionType === 'purchase' ? '#16a34a' : '#dc2626',
                  borderColor: transactionType === 'purchase' ? '#16a34a' : '#dc2626',
                }}
              >
                <CheckCircle size={18} style={{ marginRight: '6px' }} />
                <span>
                  {processingSale || processingTx
                    ? 'Validation...'
                    : transactionType === 'purchase'
                    ? "Valider l'Entrée de Stock"
                    : 'Valider la Vente'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Price Confirmation & Validation Modal */}
      <Modal
        isOpen={isConfirmSaleModalOpen}
        onClose={() => setIsConfirmSaleModalOpen(false)}
        title="Confirmation de Vente & Prix Vendeur"
        maxWidth="550px"
      >
        <div style={styles.priceReviewContainer}>
          <p style={styles.priceReviewDesc}>
            Vérifiez ou ajustez les prix de vente unitaires pour cette transaction avant validation définitive :
          </p>

          <div style={styles.priceReviewList}>
            {cart.map((item) => (
              <div key={item.product.id} style={styles.priceReviewRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.priceReviewName}>{item.product.name}</div>
                  <div style={styles.priceReviewSub}>
                    Qté: <strong>{item.quantity}</strong> × Prix Unit:
                  </div>
                </div>

                <div style={styles.priceReviewInputGroup}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => updateUnitPrice(item.product.id, e.target.value)}
                    style={styles.priceReviewInput}
                  />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>MAD</span>
                </div>

                <div style={styles.priceReviewSubtotal}>
                  {(item.quantity * item.unit_price).toFixed(2)} MAD
                </div>
              </div>
            ))}
          </div>

          <div style={styles.priceReviewTotalBox}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>Montant Total Net :</span>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#dc2626' }}>
              {totalAmount.toFixed(2)} MAD
            </span>
          </div>

          <div style={styles.priceReviewActions}>
            <button
              type="button"
              onClick={() => setIsConfirmSaleModalOpen(false)}
              style={styles.cancelBtn}
            >
              Modifier Panier
            </button>
            <button
              type="button"
              onClick={handleExecuteCheckout}
              disabled={processingSale}
              style={styles.confirmFinalBtn}
            >
              <CheckCircle size={18} style={{ marginRight: '6px' }} />
              {processingSale ? 'Validation...' : 'Confirmer et Encaisser'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Completed Sale / Stock Entry Receipt Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title={lastCompletedTransaction?.type === 'purchase' ? "Entrée de Stock Effectuée" : "Vente Effectuée avec Succès"}
        maxWidth="450px"
      >
        <div style={styles.receiptContainer}>
          <div style={styles.receiptHeader}>
            <CheckCircle size={40} style={{ color: '#059669', marginBottom: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
              {lastCompletedTransaction?.type === 'purchase' ? "Stock Ajouté avec Succès" : "Encaissement Réussi"}
            </h3>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              Opération N° #{lastCompletedTransaction?.id}
            </div>
            {lastCompletedTransaction?.type === 'purchase' && !isAdmin ? (
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#16a34a', marginTop: '6px' }}>
                +{lastCompletedTransaction?.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0} Unités Ajoutées au Stock
              </div>
            ) : (
              <div style={{ fontSize: '16px', fontWeight: '800', color: lastCompletedTransaction?.type === 'purchase' ? '#16a34a' : '#dc2626', marginTop: '6px' }}>
                Total: {Number(lastCompletedTransaction?.total_amount || 0).toFixed(2)} MAD
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '16px' }}>
            <button
              onClick={() => {
                if (lastCompletedTransaction?.id) {
                  handleOpenBladeReceipt(lastCompletedTransaction.id);
                }
              }}
              style={styles.printBladeBtn}
            >
              <Printer size={18} style={{ marginRight: '8px' }} />
              <span>Imprimer le Ticket</span>
            </button>

            <button
              onClick={() => setIsReceiptOpen(false)}
              style={styles.skipBtn}
            >
              Passer / Imprimer plus tard
            </button>
          </div>
        </div>
      </Modal>

      {/* Multi-Stock / Batch Selection Modal for Cashier */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setBatchModalProduct(null);
        }}
        title={`Choisir le lot — ${batchModalProduct?.name || ''}`}
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.4' }}>
            Ce produit dispose de plusieurs lots de stock avec des prix d'achat ou de vente distincts.
            Sélectionnez le lot vendu :
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(batchModalProduct?.activeStocks || []).map((stock, idx) => (
              <button
                key={stock.id}
                type="button"
                onClick={() => {
                  addToCartWithStock(batchModalProduct, stock);
                  setIsBatchModalOpen(false);
                  setBatchModalProduct(null);
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>
                    {stock.batch_number || `Lot #${idx + 1}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    Stock disponible : <strong>{stock.quantity} unités</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb' }}>
                    {Number(stock.price).toFixed(2)} MAD
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#059669',
                    backgroundColor: '#ecfdf5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginTop: '2px',
                  }}>
                    Sélectionner →
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setIsBatchModalOpen(false);
                setBatchModalProduct(null);
              }}
              style={styles.cancelBtn}
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '24px',
    height: 'calc(100vh - 110px)',
  },
  leftCol: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minWidth: 0,
  },
  rightCol: {
    width: '460px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '14px 18px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#111827',
  },
  cardBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: '1',
    minHeight: 0,
  },
  manualSearchWrapper: {
    position: 'relative',
    width: '100%',
  },
  manualSearchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
  },
  manualSearchInput: {
    width: '100%',
    padding: '9px 32px 9px 36px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    fontSize: '13px',
  },
  catalogGrid: {
    padding: '4px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
    gap: '12px',
    overflowY: 'auto',
    flex: '1',
    minHeight: 0,
  },
  catalogItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    position: 'relative',
    height: '215px',
  },
  catalogImgWrapper: {
    position: 'relative',
    width: '100%',
    height: '110px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  catalogImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  catalogNoImg: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  stockOverlayBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    padding: '3px 7px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
    zIndex: 2,
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    maxWidth: 'calc(100% - 12px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  catalogContent: {
    padding: '8px 10px 10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '105px',
    boxSizing: 'border-box',
    width: '100%',
  },
  itemTitle: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: '1.35',
    height: '34px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
    textAlign: 'left',
    margin: 0,
  },
  itemCategory: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    textAlign: 'left',
  },
  itemBrandDot: {
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemPriceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
    width: '100%',
  },
  itemPrice: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: '-0.2px',
  },
  itemPriceCurrency: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: '2px',
  },
  addBadge: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
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
    fontSize: '12px',
    fontWeight: '500',
  },
  cartCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  cartHeader: {
    padding: '14px 18px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txTypeSelect: {
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
  },
  cartBody: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '12px',
  },
  emptyCart: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  cartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cartItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #f3f4f6',
  },
  cartItemThumbBox: {
    width: '40px',
    height: '40px',
    borderRadius: '4px',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cartItemNoThumb: {
    color: '#9ca3af',
  },
  cartItemName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cartItemSub: {
    fontSize: '11px',
    color: '#6b7280',
  },
  unitPriceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  unitPriceLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#4b5563',
  },
  unitPriceInput: {
    width: '65px',
    padding: '2px 4px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    textAlign: 'right',
  },
  priceAdjustedBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#d97706',
    backgroundColor: '#fef3c7',
    padding: '1px 4px',
    borderRadius: '4px',
    marginLeft: '2px',
  },
  cartQtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    padding: '2px',
  },
  qtyBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    padding: '2px 4px',
  },
  qtyNum: {
    fontSize: '13px',
    fontWeight: '700',
    padding: '0 4px',
    color: '#111827',
  },
  cartPriceBox: {
    minWidth: '75px',
    textAlign: 'right',
  },
  cartRemoveBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '4px',
  },
  cartFooter: {
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  totalLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#374151',
  },
  totalVal: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#dc2626',
  },
  cartActions: {
    display: 'flex',
    gap: '10px',
  },
  clearBtn: {
    flex: '1',
    padding: '10px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
  },
  checkoutBtn: {
    flex: '2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
    cursor: 'pointer',
  },
  priceReviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  priceReviewDesc: {
    fontSize: '13px',
    color: '#4b5563',
    margin: 0,
  },
  priceReviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '260px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '10px',
    backgroundColor: '#f9fafb',
  },
  priceReviewRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  priceReviewName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
  },
  priceReviewSub: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  priceReviewInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  priceReviewInput: {
    width: '75px',
    padding: '4px 6px',
    fontSize: '13px',
    fontWeight: '700',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    textAlign: 'right',
  },
  priceReviewSubtotal: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#dc2626',
    minWidth: '80px',
    textAlign: 'right',
  },
  priceReviewTotalBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
  },
  priceReviewActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '6px',
  },
  cancelBtn: {
    padding: '9px 16px',
    backgroundColor: '#ffffff',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmFinalBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '9px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  receiptContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  receiptHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  printBladeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  skipBtn: {
    padding: '10px',
    backgroundColor: '#ffffff',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

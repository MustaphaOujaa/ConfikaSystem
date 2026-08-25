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
  useLazyGetScannerProductQuery, 
  useProcessScannerSaleMutation,
  useCreateTransactionMutation 
} from '../api/apiSlice';
import Modal from '../components/common/Modal';
import { playSuccessBeep, playErrorBeep } from '../utils/audio';
import { selectCurrentUser } from '../store/authSlice';

export default function PosPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [catalogSearch, setCatalogSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [transactionType, setTransactionType] = useState('sale'); // 'sale' | 'purchase'
  const [scanError, setScanError] = useState('');
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isConfirmSaleModalOpen, setIsConfirmSaleModalOpen] = useState(false);

  // RTK Query hooks
  const { data: productsData } = useGetProductsQuery({ page: 1 });
  const [fetchProductByBarcode, { isLoading: searchingBarcode }] = useLazyGetScannerProductQuery();
  const [processScannerSale, { isLoading: processingSale }] = useProcessScannerSaleMutation();
  const [createTransaction, { isLoading: processingTx }] = useCreateTransactionMutation();

  const allProducts = productsData?.data || [];

  // Calculate live front-end stock for any product based on current cart
  const getLiveStock = (product) => {
    const inCart = cart.find((item) => item.product.id === product.id)?.quantity || 0;
    if (transactionType === 'sale') {
      return Math.max(0, (product.quantity || 0) - inCart);
    }
    return (product.quantity || 0) + inCart;
  };

  const filteredCatalog = allProducts.filter((p) => {
    if (!catalogSearch.trim()) return true;
    const query = catalogSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(query) ||
      p.barcode.toLowerCase().includes(query) ||
      (p.category?.name && p.category.name.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    // Global USB barcode scanner keystroke listener
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = async (e) => {
      // Don't intercept when user is typing inside modal inputs
      if (isConfirmSaleModalOpen || isReceiptOpen) return;

      const currentTime = Date.now();
      const interval = currentTime - lastKeyTime;
      const char = e.key;

      // Reset buffer if delay between keystrokes exceeds 120ms (manual typing vs scanner burst)
      if (interval > 120) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (char === 'Enter') {
        const code = buffer.trim();
        if (code.length >= 2) {
          e.preventDefault();
          buffer = '';
          setScanError('');
          try {
            const product = await fetchProductByBarcode(code).unwrap();
            addToCart(product);
            setCatalogSearch('');
          } catch (err) {
            playErrorBeep();
            setScanError(`Code-barres "${code}" introuvable.`);
          }
        }
      } else if (char.length === 1) {
        buffer += char;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [fetchProductByBarcode, cart, transactionType, isConfirmSaleModalOpen, isReceiptOpen]);

  const handleManualSearchSubmit = async (e) => {
    e.preventDefault();
    if (!catalogSearch.trim()) return;

    setScanError('');
    const query = catalogSearch.trim();

    // Check loaded products first
    const exactMatch = allProducts.find(
      (p) => p.barcode === query || p.name.toLowerCase() === query.toLowerCase()
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setCatalogSearch('');
      return;
    }

    if (filteredCatalog.length === 1) {
      addToCart(filteredCatalog[0]);
      setCatalogSearch('');
      return;
    }

    try {
      const product = await fetchProductByBarcode(query).unwrap();
      addToCart(product);
      setCatalogSearch('');
    } catch (err) {
      playErrorBeep();
      setScanError(`Aucun produit trouvé pour "${query}".`);
    }
  };

  const addToCart = (product) => {
    setScanError('');
    const existing = cart.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    // Check live stock limit for sales
    if (transactionType === 'sale' && currentQty + 1 > (product.quantity || 0)) {
      playErrorBeep();
      setScanError(`Stock insuffisant pour "${product.name}". Disponible : ${product.quantity}.`);
      return;
    }

    playSuccessBeep();

    setCart((prevCart) => {
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          unit_price: parseFloat(product.price) || 0,
        },
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setScanError('');
    setCart((prevCart) => {
      const target = prevCart.find((item) => item.product.id === productId);
      if (!target) return prevCart;

      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return prevCart.filter((item) => item.product.id !== productId);
      }

      // Check stock limit for sales
      if (delta > 0 && transactionType === 'sale' && newQty > (target.product.quantity || 0)) {
        playErrorBeep();
        setScanError(`Stock maximum disponible atteint pour "${target.product.name}" (${target.product.quantity} max).`);
        return prevCart;
      }

      return prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      );
    });
  };

  const updateUnitPrice = (productId, newPrice) => {
    const parsed = Math.max(0, parseFloat(newPrice) || 0);
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, unit_price: parsed } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
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
            quantity: item.quantity,
          })),
        };
        result = await createTransaction(payload).unwrap();
      }

      setIsConfirmSaleModalOpen(false);
      setLastCompletedTransaction(result.transaction || result);
      setIsReceiptOpen(true);
      clearCart();
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
              Catalogue des Produits ({filteredCatalog.length} Articles)
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
                onChange={(e) => setCatalogSearch(e.target.value)}
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

            {/* Live Filtered Catalog Grid with Images & Live Stock */}
            <div style={styles.catalogGrid}>
              {filteredCatalog.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                  Aucun produit correspondant à "{catalogSearch}".
                </div>
              ) : (
                filteredCatalog.map((p) => {
                  const liveStock = getLiveStock(p);
                  const isOutOfStock = transactionType === 'sale' && liveStock <= 0;
                  const isLowStock = transactionType === 'sale' && liveStock > 0 && liveStock <= 5;
                  const primaryImage = p.images && p.images.length > 0 ? p.images[0].path : null;

                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={isOutOfStock}
                      style={{
                        ...styles.catalogItem,
                        opacity: isOutOfStock ? 0.6 : 1,
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        borderColor: isOutOfStock ? '#fca5a5' : '#e5e7eb',
                      }}
                      title={isOutOfStock ? "Stock épuisé" : `Cliquer pour ajouter : ${p.name}`}
                    >
                      {/* Product Image Thumbnail */}
                      <div style={styles.catalogImgWrapper}>
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={p.name}
                            style={styles.catalogImg}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/icon.jpeg';
                            }}
                          />
                        ) : (
                          <div style={styles.catalogNoImg}>
                            <Package size={28} style={{ color: '#9ca3af' }} />
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
                          {isOutOfStock
                            ? 'Épuisé (0)'
                            : `Stock: ${liveStock}`}
                        </div>
                      </div>

                      {/* Details */}
                      <div style={styles.catalogContent}>
                        <div style={styles.itemTitle} title={p.name}>
                          {p.name}
                        </div>
                        <div style={styles.itemCategory}>
                          {p.category?.name || 'Général'}
                        </div>
                        <div style={styles.itemPriceRow}>
                          <span style={styles.itemPrice}>
                            {Number(p.price).toFixed(2)} MAD
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
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
                    <div key={item.product.id} style={styles.cartItemRow}>
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
                              onChange={(e) => updateUnitPrice(item.product.id, e.target.value)}
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
                          onClick={() => updateQuantity(item.product.id, -1)}
                          style={styles.qtyBtn}
                          title="Diminuer"
                        >
                          <Minus size={14} />
                        </button>
                        <span style={styles.qtyNum}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
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
                        onClick={() => removeFromCart(item.product.id)}
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 240px)',
  },
  catalogItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
  },
  catalogImgWrapper: {
    position: 'relative',
    width: '100%',
    height: '110px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catalogImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  catalogNoImg: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  stockOverlayBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    padding: '2px 7px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  catalogContent: {
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '2px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: '1.3',
  },
  itemCategory: {
    fontSize: '11px',
    color: '#6b7280',
    marginBottom: '6px',
  },
  itemPriceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  itemPrice: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#dc2626',
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

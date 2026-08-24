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
  X
} from 'lucide-react';
import { 
  useGetProductsQuery, 
  useLazyGetScannerProductQuery, 
  useProcessScannerSaleMutation,
  useCreateTransactionMutation 
} from '../api/apiSlice';
import Modal from '../components/common/Modal';

export default function PosPage() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [transactionType, setTransactionType] = useState('sale'); // 'sale' | 'purchase'
  const [scanError, setScanError] = useState('');
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const barcodeRef = useRef(null);

  // RTK Query hooks
  const { data: productsData } = useGetProductsQuery({ page: 1 });
  const [fetchProductByBarcode, { isLoading: searchingBarcode }] = useLazyGetScannerProductQuery();
  const [processScannerSale, { isLoading: processingSale }] = useProcessScannerSaleMutation();
  const [createTransaction, { isLoading: processingTx }] = useCreateTransactionMutation();

  const allProducts = productsData?.data || [];

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
    barcodeRef.current?.focus();
  }, []);

  const handleScanBarcode = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setScanError('');
    const code = barcodeInput.trim();

    try {
      const product = await fetchProductByBarcode(code).unwrap();
      addToCart(product);
      setBarcodeInput('');
    } catch (err) {
      console.error(err);
      setScanError(`Produit avec code-barres "${code}" introuvable.`);
    } finally {
      barcodeRef.current?.focus();
    }
  };

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1, unit_price: parseFloat(product.price) }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setScanError('');

    try {
      let result;
      if (transactionType === 'sale') {
        const payload = {
          items: cart.map((item) => ({
            barcode: item.product.barcode,
            quantity: item.quantity,
          })),
        };
        result = await processScannerSale(payload).unwrap();
      } else {
        const payload = {
          type: transactionType,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        };
        result = await createTransaction(payload).unwrap();
      }

      setLastCompletedTransaction(result.transaction || result);
      setIsReceiptOpen(true);
      clearCart();
    } catch (err) {
      setScanError(err?.data?.message || err?.message || 'Échec de la validation. Vérifiez le stock disponible.');
    }
  };

  const handleOpenBladeReceipt = (txId) => {
    window.open(`/receipts/${txId}`, '_blank', 'width=400,height=600');
  };

  return (
    <div style={styles.container}>
      {/* Left Column: Barcode Scanner & Live Normal Search Catalog */}
      <div style={styles.leftCol}>
        {/* Scanner & Manual Search Box */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Barcode size={20} style={{ color: '#dc2626', marginRight: '8px' }} />
            <span style={styles.cardTitle}>Scanner & Barre de Recherche Produit</span>
          </div>

          <div style={styles.cardBody}>
            {/* Barcode Quick Scanner Form */}
            <form onSubmit={handleScanBarcode} style={styles.scanForm}>
              <div style={styles.scanInputWrapper}>
                <Barcode size={18} style={styles.scanIcon} />
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Scanner le code-barres USB..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  style={styles.scanInput}
                />
              </div>
              <button
                type="submit"
                disabled={searchingBarcode}
                style={styles.scanBtn}
              >
                {searchingBarcode ? 'Recherche...' : 'Scanner / Ajouter'}
              </button>
            </form>

            {/* Normal Manual Search Bar */}
            <div style={styles.manualSearchWrapper}>
              <Search size={16} style={styles.manualSearchIcon} />
              <input
                type="text"
                placeholder="Rechercher un produit par nom, catégorie ou code..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={styles.manualSearchInput}
              />
              {catalogSearch && (
                <button onClick={() => setCatalogSearch('')} style={styles.clearSearchBtn}>
                  <X size={14} />
                </button>
              )}
            </div>

            {scanError && <div style={styles.errorBanner}>{scanError}</div>}
          </div>
        </div>

        {/* Live Filtered Catalog Picker */}
        <div style={{ ...styles.card, flexGrow: 1 }}>
          <div style={styles.cardHeader}>
            <Package size={18} style={{ color: '#2563eb', marginRight: '8px' }} />
            <span style={styles.cardTitle}>
              Catalogue des Produits ({filteredCatalog.length} Articles)
            </span>
          </div>

          <div style={styles.catalogGrid}>
            {filteredCatalog.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Aucun produit correspondant à "{catalogSearch}".
              </div>
            ) : (
              filteredCatalog.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  style={styles.catalogItem}
                >
                  <div style={styles.itemTitle}>{p.name}</div>
                  <div style={styles.itemMeta}>
                    <span>{Number(p.price).toFixed(2)} MAD</span>
                    <span style={{ color: p.quantity <= 5 ? '#dc2626' : '#6b7280' }}>
                      Stock: {p.quantity}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Checkout Cart */}
      <div style={styles.rightCol}>
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
                <div>Panier vide. Scannez des codes-barres ou recherchez des articles ci-dessus.</div>
              </div>
            ) : (
              <div style={styles.cartList}>
                {cart.map((item) => (
                  <div key={item.product.id} style={styles.cartItemRow}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={styles.cartItemName}>{item.product.name}</div>
                      <div style={styles.cartItemSub}>
                        Code: {item.product.barcode}
                      </div>
                    </div>

                    <div style={styles.cartQtyControls}>
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        style={styles.qtyBtn}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={styles.qtyNum}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        style={styles.qtyBtn}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div style={styles.cartPriceBox}>
                      {(item.quantity * item.unit_price).toFixed(2)} MAD
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      style={styles.cartRemoveBtn}
                      title="Retirer l'article"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary & Checkout Action */}
          <div style={styles.cartFooter}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total à Payer:</span>
              <span style={styles.totalVal}>{totalAmount.toFixed(2)} MAD</span>
            </div>

            <div style={styles.cartActions}>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                style={styles.clearBtn}
              >
                Vider Panier
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || processingSale || processingTx}
                style={styles.checkoutBtn}
              >
                <CheckCircle size={18} style={{ marginRight: '6px' }} />
                <span>{processingSale || processingTx ? 'Validation...' : 'Valider la Vente'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Sale Receipt Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Vente Effectuée avec Succès"
        maxWidth="450px"
      >
        <div style={styles.receiptContainer}>
          <div style={styles.receiptHeader}>
            <CheckCircle size={40} style={{ color: '#059669', marginBottom: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Encaissement Réussi</h3>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              Ticket de Caisse N° #{lastCompletedTransaction?.id}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626', marginTop: '6px' }}>
              Total: {Number(lastCompletedTransaction?.total_amount || 0).toFixed(2)} MAD
            </div>
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
    width: '420px',
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
  },
  scanForm: {
    display: 'flex',
    gap: '10px',
  },
  scanInputWrapper: {
    position: 'relative',
    flexGrow: 1,
  },
  scanIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#dc2626',
  },
  scanInput: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    fontSize: '15px',
    fontWeight: '600',
    border: '2px solid #dc2626',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  scanBtn: {
    padding: '10px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
    padding: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
    overflowY: 'auto',
    maxHeight: '340px',
  },
  catalogItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  itemMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
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
  cartItemName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
  },
  cartItemSub: {
    fontSize: '11px',
    color: '#6b7280',
  },
  cartQtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
    padding: '0 6px',
    color: '#111827',
  },
  cartPriceBox: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#dc2626',
    minWidth: '70px',
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

import React, { useState } from 'react';
import { 
  Eye, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Printer,
  X 
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { 
  useGetTransactionsQuery, 
  useGetProductsQuery, 
  useCreateTransactionMutation 
} from '../api/apiSlice';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import { selectCurrentUser } from '../store/authSlice';

export default function TransactionsPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);

  // New transaction state
  const [txType, setTxType] = useState('sale');
  const [txItems, setTxItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState('');
  const [formError, setFormError] = useState('');

  // RTK Query
  const { data: txData, isLoading: loadingTx } = useGetTransactionsQuery({ page });
  const { data: productsData } = useGetProductsQuery({ page: 1 });
  const [createTransaction, { isLoading: creatingTx }] = useCreateTransactionMutation();

  const products = productsData?.data || [];
  const transactions = txData?.data || [];
  const pagination = txData ? {
    currentPage: txData.current_page || 1,
    lastPage: txData.last_page || 1,
    total: txData.total || transactions.length,
  } : { currentPage: 1, lastPage: 1, total: 0 };

  const filteredTransactions = transactions.filter((tx) => {
    return !typeFilter || tx.type === typeFilter;
  });

  const handleOpenDetails = (tx) => {
    setSelectedTx(tx);
    setIsDetailsOpen(true);
  };

  const handlePrintBladeReceipt = (txId) => {
    window.open(`/receipts/${txId}`, '_blank', 'width=400,height=600');
  };

  const handleOpenAddTx = () => {
    setTxType('sale');
    setTxItems([]);
    setSelectedProductId('');
    setItemQty(1);
    setItemPrice('');
    setFormError('');
    setIsAddTxOpen(true);
  };

  const handleAddItemToTx = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => String(p.id) === String(selectedProductId));
    if (!prod) return;

    const price = itemPrice !== '' ? parseFloat(itemPrice) : parseFloat(prod.price);
    const existingIndex = txItems.findIndex((i) => i.product_id === prod.id);

    if (existingIndex > -1) {
      const updated = [...txItems];
      updated[existingIndex].quantity += parseInt(itemQty, 10);
      setTxItems(updated);
    } else {
      setTxItems([
        ...txItems,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: parseInt(itemQty, 10),
          unit_price: price,
        },
      ]);
    }

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice('');
  };

  const handleRemoveTxItem = (index) => {
    setTxItems(txItems.filter((_, i) => i !== index));
  };

  const handleCreateTxSubmit = async (e) => {
    e.preventDefault();
    if (txItems.length === 0) {
      setFormError('Veuillez ajouter au moins un produit.');
      return;
    }

    setFormError('');
    try {
      await createTransaction({
        type: txType,
        items: txItems.map(({ product_id, quantity, unit_price }) => ({
          product_id,
          quantity,
          unit_price,
        })),
      }).unwrap();
      setIsAddTxOpen(false);
    } catch (err) {
      setFormError(err?.data?.message || 'Échec de l\'enregistrement de la transaction.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Filter & Toolbar */}
      <div className="responsive-toolbar" style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">Tous les Types (Ventes & Achats)</option>
            <option value="sale">Ventes uniquement</option>
            <option value="purchase">Achats uniquement</option>
          </select>
        </div>

        {isAdmin && (
          <button onClick={handleOpenAddTx} style={styles.addBtn}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            <span>Enregistrer une Transaction</span>
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="responsive-table-container" style={styles.card}>
        {loadingTx ? (
          <div style={styles.loading}>Chargement de l'historique...</div>
        ) : filteredTransactions.length === 0 ? (
          <div style={styles.emptyState}>Aucune transaction enregistrée.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>N° Tx</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Date & Heure</th>
                <th style={styles.th}>Nb Produits</th>
                <th style={styles.th}>Montant Total</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '700', color: '#111827' }}>
                    #{tx.id}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.typeBadge,
                        backgroundColor: tx.type === 'sale' ? '#ecfdf5' : '#eff6ff',
                        color: tx.type === 'sale' ? '#059669' : '#2563eb',
                        borderColor: tx.type === 'sale' ? '#a7f3d0' : '#bfdbfe',
                      }}
                    >
                      {tx.type === 'sale' ? (
                        <TrendingUp size={12} style={{ marginRight: '4px' }} />
                      ) : (
                        <TrendingDown size={12} style={{ marginRight: '4px' }} />
                      )}
                      {tx.type === 'sale' ? 'VENTE' : 'ACHAT'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(tx.transaction_date || tx.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td style={styles.td}>{tx.items?.length || 0} Produits</td>
                  <td style={{ ...styles.td, fontWeight: '800' }}>
                    {tx.type === 'sale' ? (
                      <span style={{ color: '#059669' }}>
                        {Number(tx.total_amount).toFixed(2)} MAD
                      </span>
                    ) : isAdmin ? (
                      <span style={{ color: '#2563eb' }}>
                        {Number(tx.total_amount).toFixed(2)} MAD
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: '700' }}>
                        +{tx.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0} Unités
                      </span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {(tx.type === 'sale' || isAdmin) && (
                        <button
                          onClick={() => handlePrintBladeReceipt(tx.id)}
                          style={styles.printIconBtn}
                          title="Imprimer le Ticket de Caisse"
                        >
                          <Printer size={15} />
                          <span style={{ marginLeft: '4px' }}>Ticket</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenDetails(tx)}
                        style={styles.iconBtn}
                        title="Voir les détails"
                      >
                        <Eye size={15} />
                        <span style={{ marginLeft: '4px' }}>Détails</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Transaction Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Détails de la Transaction #${selectedTx?.id}`}
      >
        <div style={styles.detailsContainer}>
          <div style={styles.detailsMeta}>
            <div>
              <strong>Type:</strong>{' '}
              <span style={{ textTransform: 'uppercase', color: selectedTx?.type === 'sale' ? '#059669' : '#2563eb' }}>
                {selectedTx?.type === 'sale' ? 'Vente Client' : 'Achat / Entrée Stock'}
              </span>
            </div>
            <div>
              <strong>Date:</strong> {selectedTx ? new Date(selectedTx.transaction_date || selectedTx.created_at).toLocaleString('fr-FR') : ''}
            </div>
          </div>

          <table style={styles.detailsTable}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Produit</th>
                <th style={{ textAlign: 'center' }}>Quantité</th>
                {(selectedTx?.type === 'sale' || isAdmin) && <th style={{ textAlign: 'right' }}>Prix Unitaire</th>}
                {(selectedTx?.type === 'sale' || isAdmin) && <th style={{ textAlign: 'right' }}>Sous-total</th>}
              </tr>
            </thead>
            <tbody>
              {selectedTx?.items?.map((item) => (
                <tr key={item.id}>
                  <td>{item.product?.name || `Produit #${item.product_id}`}</td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>
                    {selectedTx?.type === 'purchase' ? `+${item.quantity}` : item.quantity}
                  </td>
                  {(selectedTx?.type === 'sale' || isAdmin) && (
                    <td style={{ textAlign: 'right' }}>{Number(item.unit_price).toFixed(2)} MAD</td>
                  )}
                  {(selectedTx?.type === 'sale' || isAdmin) && (
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      {(item.quantity * item.unit_price).toFixed(2)} MAD
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.detailsTotalRow}>
            {selectedTx?.type === 'sale' ? (
              <>
                <span>TOTAL VENTE :</span>
                <span style={{ color: '#059669' }}>{Number(selectedTx?.total_amount || 0).toFixed(2)} MAD</span>
              </>
            ) : isAdmin ? (
              <>
                <span>COÛT TOTAL ACHAT :</span>
                <span style={{ color: '#2563eb' }}>{Number(selectedTx?.total_amount || 0).toFixed(2)} MAD</span>
              </>
            ) : (
              <>
                <span>TOTAL ARTICLES ENTRÉS :</span>
                <span style={{ color: '#16a34a' }}>
                  +{selectedTx?.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0} Unités
                </span>
              </>
            )}
          </div>

          {(selectedTx?.type === 'sale' || isAdmin) && (
            <button
              onClick={() => handlePrintBladeReceipt(selectedTx?.id)}
              style={styles.modalPrintBtn}
            >
              <Printer size={16} style={{ marginRight: '6px' }} />
              <span>Imprimer le Ticket</span>
            </button>
          )}
        </div>
      </Modal>

      {/* Record Transaction Modal */}
      <Modal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        title="Enregistrer une Transaction"
        maxWidth="650px"
      >
        {formError && <div style={styles.formError}>{formError}</div>}
        <form onSubmit={handleCreateTxSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Type de transaction</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              style={styles.input}
            >
              <option value="sale">Vente (Sortie de Stock)</option>
              <option value="purchase">Achat (Entrée de Stock)</option>
            </select>
          </div>

          {/* Add Item Row Inputs */}
          <div style={{ ...styles.addItemBox, border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px', backgroundColor: '#fafafa' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
              Ajouter une ligne de produit
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={styles.subLabel}>Produit</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find((prod) => String(prod.id) === String(e.target.value));
                    if (p) setItemPrice(p.price);
                  }}
                  style={styles.input}
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price} MAD | Stock: {p.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.subLabel}>Quantité</label>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.subLabel}>Prix Unitaire (MAD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="Prix"
                  style={styles.input}
                />
              </div>
              <button
                type="button"
                onClick={handleAddItemToTx}
                style={styles.addItemBtn}
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ margin: '10px 0' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Lignes de Produits</div>
            {txItems.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Aucune ligne ajoutée.</div>
            ) : (
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Produit</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Qté</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Prix Unitaire</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {txItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 10px' }}>{item.product_name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.unit_price.toFixed(2)} MAD</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>
                        {(item.quantity * item.unit_price).toFixed(2)} MAD
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveTxItem(idx)}
                          style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.modalActions}>
            <button type="button" onClick={() => setIsAddTxOpen(false)} style={styles.cancelBtn}>Annuler</button>
            <button type="submit" disabled={creatingTx} style={styles.saveBtn}>
              {creatingTx ? 'Enregistrement...' : 'Valider la Transaction'}
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
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
    minWidth: '220px',
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
    verticalAlign: 'middle',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: '700',
  },
  printIconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '4px',
    color: '#dc2626',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    color: '#374151',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  detailsMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f9fafb',
    padding: '10px 14px',
    borderRadius: '6px',
  },
  detailsTable: {
    width: '100%',
    fontSize: '13px',
    borderCollapse: 'collapse',
  },
  detailsTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    fontWeight: '800',
    paddingTop: '12px',
    borderTop: '2px solid #dc2626',
  },
  modalPrintBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '700',
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
  subLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '4px',
    display: 'block',
  },
  input: {
    padding: '9px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  addItemBtn: {
    padding: '9px 14px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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

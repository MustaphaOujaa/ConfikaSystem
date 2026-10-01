import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  RotateCcw, 
  Search, 
  Plus, 
  Printer, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Clock, 
  DollarSign, 
  User as UserIcon,
  X,
  ArrowRight,
  Check
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { 
  useGetReturnsQuery, 
  useLazyLookupReturnTransactionQuery, 
  useCreateReturnMutation 
} from '../api/apiSlice';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import { selectCurrentUser } from '../store/authSlice';

export default function ReturnsPage() {
  const [searchParams] = useSearchParams();
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // New return form state
  const [searchTxId, setSearchTxId] = useState('');
  const [loadedTx, setLoadedTx] = useState(null);
  const [returnItemsState, setReturnItemsState] = useState([]); // array of { tx_item_id, qty, restocked, unit_price, max_qty, name }
  const [reason, setReason] = useState('Changement d\'avis du client');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [lastCreatedReturn, setLastCreatedReturn] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Check if txId is passed in URL
  useEffect(() => {
    const txIdParam = searchParams.get('txId');
    if (txIdParam) {
      handleOpenNewReturn(txIdParam);
    }
  }, [searchParams]);

  // Queries
  const { data: returnsData, isLoading: loadingReturns, refetch: refetchReturns } = useGetReturnsQuery({
    page,
    search: debouncedSearch,
    date: dateFilter,
  });

  const [lookupTransaction, { isLoading: searchingTx }] = useLazyLookupReturnTransactionQuery();
  const [createReturnMutation, { isLoading: submittingReturn }] = useCreateReturnMutation();

  const returns = returnsData?.data || [];
  const pagination = returnsData ? {
    currentPage: returnsData.current_page || 1,
    lastPage: returnsData.last_page || 1,
    total: returnsData.total || returns.length,
  } : { currentPage: 1, lastPage: 1, total: 0 };

  const handlePrintReturnReceipt = (returnId) => {
    window.open(`/returns/${returnId}/receipt`, '_blank', 'width=400,height=600');
  };

  const handleOpenNewReturn = (prefillTxId = '') => {
    setSearchTxId(prefillTxId ? String(prefillTxId) : '');
    setLoadedTx(null);
    setReturnItemsState([]);
    setReason('Changement d\'avis du client');
    setNotes('');
    setFormError('');
    setLastCreatedReturn(null);
    setIsNewReturnOpen(true);

    if (prefillTxId) {
      executeLookup(prefillTxId);
    }
  };

  const executeLookup = async (idToSearch) => {
    const cleanedId = String(idToSearch).trim().replace(/^#?TX-?/i, '');
    if (!cleanedId) {
      setFormError('Veuillez entrer un numéro de ticket ou ID de transaction valide.');
      return;
    }

    setFormError('');
    setLoadedTx(null);
    setReturnItemsState([]);

    try {
      const res = await lookupTransaction(cleanedId).unwrap();
      const tx = res.transaction;
      setLoadedTx(tx);

      // Initialize returnable item rows
      const initialItems = (tx.items || []).map((item) => {
        const remaining = Math.max(0, (item.quantity || 0) - (item.returned_quantity || 0));
        return {
          transaction_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name || `Produit #${item.product_id}`,
          barcode: item.product?.barcode || '-',
          quantity_sold: item.quantity,
          returned_so_far: item.returned_quantity || 0,
          max_qty: remaining,
          return_qty: 0, // initially 0 selected
          unit_price: parseFloat(item.unit_price || 0),
          restocked: true,
        };
      });

      setReturnItemsState(initialItems);

      if (tx.return_status === 'full' || initialItems.every((i) => i.max_qty === 0)) {
        setFormError('Attention: Tous les articles de cette vente ont déjà été retournés.');
      }
    } catch (err) {
      console.error('Failed to lookup transaction:', err);
      setFormError(err?.data?.message || 'Transaction introuvable ou type de transaction invalide.');
    }
  };

  const handleItemQtyChange = (txItemId, value) => {
    setFormError('');
    const num = parseInt(value, 10) || 0;
    setReturnItemsState((prev) =>
      prev.map((item) => {
        if (item.transaction_item_id === txItemId) {
          const clamped = Math.max(0, Math.min(num, item.max_qty));
          return { ...item, return_qty: clamped };
        }
        return item;
      })
    );
  };

  const handleItemRestockedToggle = (txItemId) => {
    setReturnItemsState((prev) =>
      prev.map((item) => {
        if (item.transaction_item_id === txItemId) {
          return { ...item, restocked: !item.restocked };
        }
        return item;
      })
    );
  };

  const calculateTotalRefund = () => {
    return returnItemsState.reduce((sum, item) => {
      return sum + (item.return_qty * item.unit_price);
    }, 0);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    setFormError('');

    const itemsToSubmit = returnItemsState
      .filter((i) => i.return_qty > 0)
      .map((i) => ({
        transaction_item_id: i.transaction_item_id,
        quantity: i.return_qty,
        refund_price: i.unit_price,
        restocked: i.restocked,
      }));

    if (itemsToSubmit.length === 0) {
      setFormError('Veuillez indiquer au moins un article avec une quantité à retourner.');
      return;
    }

    try {
      const payload = {
        transaction_id: loadedTx.id,
        payment_method: 'cash',
        reason,
        notes,
        items: itemsToSubmit,
      };

      const result = await createReturnMutation(payload).unwrap();
      setLastCreatedReturn(result.return);
      refetchReturns();
    } catch (err) {
      console.error('Failed to submit return:', err);
      setFormError(err?.data?.message || 'Une erreur est survenue lors de l\'enregistrement du retour.');
    }
  };

  const handleOpenDetails = (ret) => {
    setSelectedReturn(ret);
    setIsDetailsOpen(true);
  };

  const totalRefundAmount = calculateTotalRefund();

  return (
    <div style={styles.container}>
      {/* Top Banner */}
      <div style={styles.banner}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={22} style={{ color: '#dc2626' }} />
            <h2 style={styles.bannerTitle}>Gestion des Retours & Remboursements</h2>
          </div>
          <p style={styles.bannerSubtitle}>
            Enregistrez les retours d'articles, réintégrez automatiquement le stock et imprimez les tickets d'avoir.
          </p>
        </div>
        <button onClick={() => handleOpenNewReturn()} style={styles.newReturnBtn}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          <span>Effectuer un Retour</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={styles.filtersCard}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par N° Retour, N° Vente, produit ou caissier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={styles.clearBtn}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={styles.dateFilterWrapper}>
          <span style={styles.dateLabel}>Filtrer par date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            style={styles.dateInput}
          />
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')} 
              style={styles.resetDateBtn}
              title="Effacer filtre date"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div style={styles.tableCard}>
        {loadingReturns ? (
          <div style={styles.loadingBox}>Chargement des retours...</div>
        ) : returns.length === 0 ? (
          <div style={styles.emptyState}>
            <RotateCcw size={42} style={{ color: '#9ca3af', marginBottom: '12px' }} />
            <div style={styles.emptyTitle}>Aucun retour trouvé</div>
            <div style={styles.emptyDesc}>
              {search || dateFilter 
                ? 'Aucun résultat ne correspond à vos filtres.' 
                : 'Aucun produit n\'a encore été retourné.'}
            </div>
            <button onClick={() => handleOpenNewReturn()} style={styles.emptyBtn}>
              <Plus size={16} style={{ marginRight: '6px' }} />
              Nouveau Retour
            </button>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>N° Retour</th>
                  <th style={styles.th}>Vente d'Origine</th>
                  <th style={styles.th}>Date & Heure</th>
                  <th style={styles.th}>Opérateur</th>
                  <th style={styles.th}>Articles Retournés</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Montant Remboursé</th>
                  <th style={styles.th}>Motif</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret) => (
                  <tr key={ret.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '700', color: '#111827' }}>
                      #RET-{ret.id}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.txBadge}>
                        #TX-{ret.transaction_id}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(ret.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td style={styles.td}>
                      {ret.user?.name || 'Caissier'}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.itemsSummary}>
                        {ret.items?.map((item) => (
                          <div key={item.id} style={styles.itemTag}>
                            <span>{item.quantity}x {item.product?.name || `Produit #${item.product_id}`}</span>
                            {item.restocked ? (
                              <span style={styles.restockedPill} title="Produit remis en stock">En Stock</span>
                            ) : (
                              <span style={styles.damagedPill} title="Produit défectueux non réintégré">Défectueux</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>
                      -{Number(ret.refund_amount).toFixed(2)} MAD
                    </td>
                    <td style={styles.td}>
                      <span style={styles.reasonBadge}>
                        {ret.reason || 'Retour Client'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handlePrintReturnReceipt(ret.id)}
                          style={styles.printActionBtn}
                          title="Imprimer le bon de retour"
                        >
                          <Printer size={14} style={{ marginRight: '4px' }} />
                          <span>Ticket</span>
                        </button>
                        <button
                          onClick={() => handleOpenDetails(ret)}
                          style={styles.detailsActionBtn}
                          title="Voir les détails"
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} />
                          <span>Détails</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={pagination.currentPage}
          lastPage={pagination.lastPage}
          total={pagination.total}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Modal: Process New Return */}
      <Modal
        isOpen={isNewReturnOpen}
        onClose={() => setIsNewReturnOpen(false)}
        title="Effectuer un Retour Produit"
        maxWidth="750px"
      >
        {lastCreatedReturn ? (
          /* Success Screen */
          <div style={styles.successContainer}>
            <CheckCircle2 size={54} style={{ color: '#059669', marginBottom: '16px' }} />
            <h3 style={styles.successTitle}>Retour Validé avec Succès !</h3>
            <p style={styles.successSub}>
              Le montant de <strong>{Number(lastCreatedReturn.refund_amount).toFixed(2)} MAD</strong> a été remboursé au client et les quantités remises en stock ont été actualisées.
            </p>

            <div style={styles.successActions}>
              <button
                onClick={() => handlePrintReturnReceipt(lastCreatedReturn.id)}
                style={styles.successPrintBtn}
              >
                <Printer size={16} style={{ marginRight: '8px' }} />
                <span>Imprimer le Bon de Remboursement</span>
              </button>
              <button
                onClick={() => setIsNewReturnOpen(false)}
                style={styles.successCloseBtn}
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          /* Return Form */
          <div>
            {/* Step 1: Find Sale Transaction */}
            <div style={styles.searchTxBox}>
              <label style={styles.label}>
                1. Trouver la Vente (Numéro de Ticket ou ID de Transaction) :
              </label>
              <div style={styles.searchTxRow}>
                <input
                  type="text"
                  placeholder="Ex: 45 ou #TX-45"
                  value={searchTxId}
                  onChange={(e) => setSearchTxId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      executeLookup(searchTxId);
                    }
                  }}
                  style={styles.searchTxInput}
                />
                <button
                  type="button"
                  onClick={() => executeLookup(searchTxId)}
                  disabled={searchingTx}
                  style={styles.searchTxBtn}
                >
                  {searchingTx ? 'Recherche...' : (
                    <>
                      <Search size={15} style={{ marginRight: '6px' }} />
                      <span>Rechercher</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {formError && (
              <div style={styles.errorAlert}>
                <AlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Step 2: Loaded Transaction Review & Selection */}
            {loadedTx && (
              <form onSubmit={handleSubmitReturn} style={{ marginTop: '16px' }}>
                <div style={styles.txInfoCard}>
                  <div style={styles.txInfoRow}>
                    <div>
                      <span style={styles.txInfoLabel}>Ticket N°:</span>
                      <strong> #{loadedTx.id}</strong>
                    </div>
                    <div>
                      <span style={styles.txInfoLabel}>Date Vente:</span>
                      <span> {new Date(loadedTx.transaction_date || loadedTx.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <div>
                      <span style={styles.txInfoLabel}>Montant Initial:</span>
                      <strong style={{ color: '#059669' }}> {Number(loadedTx.total_amount).toFixed(2)} MAD</strong>
                    </div>
                    <div>
                      <span style={styles.txInfoLabel}>Statut Retour:</span>
                      <span style={{ 
                        fontWeight: '700',
                        color: loadedTx.return_status === 'full' ? '#dc2626' : loadedTx.return_status === 'partial' ? '#d97706' : '#16a34a'
                      }}>
                        {loadedTx.return_status === 'full' ? 'Totalement Retourné' : loadedTx.return_status === 'partial' ? 'Partiellement Retourné' : 'Aucun retour'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.sectionTitle}>
                  2. Sélectionnez les articles et quantités à retourner :
                </div>

                <div style={styles.itemsTableWrapper}>
                  <table style={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Article</th>
                        <th style={{ textAlign: 'center' }}>Vendu</th>
                        <th style={{ textAlign: 'center' }}>Déjà Ret.</th>
                        <th style={{ textAlign: 'center' }}>Dispo Ret.</th>
                        <th style={{ textAlign: 'right' }}>Prix Unit.</th>
                        <th style={{ textAlign: 'center', width: '110px' }}>Qté à Retourner</th>
                        <th style={{ textAlign: 'center' }}>Remettre en Stock ?</th>
                        <th style={{ textAlign: 'right' }}>Sous-total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItemsState.map((item) => {
                        const isDepleted = item.max_qty <= 0;
                        return (
                          <tr key={item.transaction_item_id} style={{ opacity: isDepleted ? 0.5 : 1 }}>
                            <td>
                              <div style={{ fontWeight: '600' }}>{item.product_name}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>Code: {item.barcode}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>{item.quantity_sold}</td>
                            <td style={{ textAlign: 'center', color: item.returned_so_far > 0 ? '#d97706' : '#6b7280' }}>
                              {item.returned_so_far}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: '700', color: isDepleted ? '#9ca3af' : '#059669' }}>
                              {item.max_qty}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {item.unit_price.toFixed(2)} MAD
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max={item.max_qty}
                                disabled={isDepleted}
                                value={item.return_qty}
                                onChange={(e) => handleItemQtyChange(item.transaction_item_id, e.target.value)}
                                style={styles.qtyInput}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <label style={styles.restockCheckboxLabel}>
                                <input
                                  type="checkbox"
                                  disabled={isDepleted || item.return_qty === 0}
                                  checked={item.restocked}
                                  onChange={() => handleItemRestockedToggle(item.transaction_item_id)}
                                />
                                <span style={{ fontSize: '12px', marginLeft: '4px' }}>Oui</span>
                              </label>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: item.return_qty > 0 ? '#dc2626' : '#9ca3af' }}>
                              {(item.return_qty * item.unit_price).toFixed(2)} MAD
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Additional Information */}
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Motif du retour :</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={styles.select}
                    >
                      <option value="Changement d'avis du client">Changement d'avis du client</option>
                      <option value="Produit défectueux / endommagé">Produit défectueux / endommagé</option>
                      <option value="Erreur d'article / taille non adaptée">Erreur d'article / taille non adaptée</option>
                      <option value="Non conforme aux attentes">Non conforme aux attentes</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Commentaires / Remarques :</label>
                    <input
                      type="text"
                      placeholder="Facultatif..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Total Refund Bar & Submit */}
                <div style={styles.totalRefundBar}>
                  <div style={styles.totalRefundText}>
                    <span>TOTAL À REMBOURSER AU CLIENT :</span>
                    <strong style={styles.totalRefundAmount}>
                      {totalRefundAmount.toFixed(2)} MAD
                    </strong>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setIsNewReturnOpen(false)}
                      style={styles.cancelBtn}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReturn || totalRefundAmount <= 0}
                      style={{
                        ...styles.submitReturnBtn,
                        opacity: (submittingReturn || totalRefundAmount <= 0) ? 0.6 : 1,
                      }}
                    >
                      {submittingReturn ? 'Validation...' : 'Valider le Remboursement'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: View Details */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Détails du Bon de Retour #RET-${selectedReturn?.id}`}
        maxWidth="650px"
      >
        {selectedReturn && (
          <div style={styles.detailsContainer}>
            <div style={styles.detailsMetaGrid}>
              <div>
                <span style={styles.metaLabel}>Vente Liée:</span>
                <strong> #TX-{selectedReturn.transaction_id}</strong>
              </div>
              <div>
                <span style={styles.metaLabel}>Date:</span>
                <span> {new Date(selectedReturn.created_at).toLocaleString('fr-FR')}</span>
              </div>
              <div>
                <span style={styles.metaLabel}>Opérateur:</span>
                <span> {selectedReturn.user?.name || 'Non spécifié'}</span>
              </div>
              <div>
                <span style={styles.metaLabel}>Motif:</span>
                <span> {selectedReturn.reason || 'Retour standard'}</span>
              </div>
            </div>

            {selectedReturn.notes && (
              <div style={styles.notesBox}>
                <strong>Notes: </strong>{selectedReturn.notes}
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <table style={styles.detailsTable}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Article</th>
                    <th style={{ textAlign: 'center' }}>Quantité</th>
                    <th style={{ textAlign: 'center' }}>Remis en Stock</th>
                    <th style={{ textAlign: 'right' }}>Prix Remboursé</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReturn.items?.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name || `Produit #${item.product_id}`}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'center' }}>
                        {item.restocked ? (
                          <span style={styles.restockedPill}>Oui</span>
                        ) : (
                          <span style={styles.damagedPill}>Non</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{Number(item.refund_price).toFixed(2)} MAD</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                        -{(item.quantity * item.refund_price).toFixed(2)} MAD
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.detailsTotalRow}>
              <span>MONTANT TOTAL REMBOURSÉ :</span>
              <strong style={{ color: '#dc2626', fontSize: '18px' }}>
                -{Number(selectedReturn.refund_amount).toFixed(2)} MAD
              </strong>
            </div>

            <button
              onClick={() => handlePrintReturnReceipt(selectedReturn.id)}
              style={styles.modalPrintBtn}
            >
              <Printer size={16} style={{ marginRight: '6px' }} />
              <span>Imprimer le Bon de Remboursement</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  banner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '20px 24px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  bannerTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#111827',
    margin: 0,
  },
  bannerSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  newReturnBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  filtersCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1',
    minWidth: '280px',
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
    padding: '10px 36px 10px 36px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  dateFilterWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateLabel: {
    fontSize: '13px',
    color: '#4b5563',
    fontWeight: '500',
  },
  dateInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
  },
  resetDateBtn: {
    background: 'none',
    border: '1px solid #d1d5db',
    padding: '7px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#374151',
    verticalAlign: 'middle',
  },
  txBadge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '12px',
  },
  itemsSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  itemTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
  },
  restockedPill: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
  },
  damagedPill: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
  },
  reasonBadge: {
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  printActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  detailsActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#f9fafb',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loadingBox: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
  },
  emptyDesc: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
    marginBottom: '16px',
  },
  emptyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },

  /* Form modal styles */
  searchTxBox: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  searchTxRow: {
    display: 'flex',
    gap: '8px',
  },
  searchTxInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
  },
  searchTxBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: '0 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '10px 14px',
    borderRadius: '6px',
    marginTop: '12px',
    fontSize: '13px',
  },
  txInfoCard: {
    backgroundColor: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  txInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  txInfoLabel: {
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
  },
  itemsTableWrapper: {
    maxHeight: '260px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  itemsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  qtyInput: {
    width: '60px',
    textAlign: 'center',
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    fontWeight: '700',
  },
  restockCheckboxLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    outline: 'none',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  totalRefundBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    flexWrap: 'wrap',
    gap: '12px',
  },
  totalRefundText: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#991b1b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  totalRefundAmount: {
    fontSize: '18px',
    color: '#dc2626',
  },
  cancelBtn: {
    padding: '9px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
    cursor: 'pointer',
  },
  submitReturnBtn: {
    padding: '9px 18px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
    cursor: 'pointer',
  },

  /* Success screen */
  successContainer: {
    padding: '30px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#111827',
    margin: 0,
  },
  successSub: {
    fontSize: '14px',
    color: '#4b5563',
    marginTop: '8px',
    maxWidth: '480px',
    lineHeight: '1.5',
  },
  successActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  successPrintBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '10px 18px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  successCloseBtn: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },

  /* Details modal styles */
  detailsContainer: {
    padding: '8px 0',
  },
  detailsMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontSize: '13px',
  },
  metaLabel: {
    color: '#6b7280',
    marginRight: '4px',
  },
  notesBox: {
    marginTop: '10px',
    padding: '10px 14px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#92400e',
  },
  detailsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    marginBottom: '16px',
  },
  detailsTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '13px',
    marginBottom: '16px',
  },
  modalPrintBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

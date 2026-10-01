import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  RotateCcw, 
  Search, 
  Plus, 
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
                      <button
                        onClick={() => handleOpenDetails(ret)}
                        style={styles.detailsActionBtn}
                        title="Voir les détails"
                      >
                        <Eye size={14} style={{ marginRight: '6px' }} />
                        <span>Détails</span>
                      </button>
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
        maxWidth="1020px"
      >
        {lastCreatedReturn ? (
          /* Success Screen */
          <div style={styles.successContainer}>
            <CheckCircle2 size={56} style={{ color: '#059669', marginBottom: '16px' }} />
            <h3 style={styles.successTitle}>Retour Validé avec Succès !</h3>
            <p style={styles.successSub}>
              Le montant de <strong>{Number(lastCreatedReturn.refund_amount).toFixed(2)} MAD</strong> a été remboursé au client et les quantités ont été réintégrées au stock.
            </p>

            <div style={styles.successActions}>
              <button
                onClick={() => setIsNewReturnOpen(false)}
                style={styles.successCloseBtn}
              >
                Fermer
              </button>
              <button
                onClick={() => handleOpenNewReturn()}
                style={styles.successNewBtn}
              >
                <Plus size={16} style={{ marginRight: '6px' }} />
                <span>Nouveau Retour</span>
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
              <form onSubmit={handleSubmitReturn} style={{ marginTop: '18px' }}>
                {/* Transaction Summary Card */}
                <div style={styles.txInfoCard}>
                  <div style={styles.txInfoGrid}>
                    <div style={styles.txTile}>
                      <span style={styles.txTileLabel}>Ticket N° :</span>
                      <strong style={styles.txTileValue}>#{loadedTx.id}</strong>
                    </div>
                    <div style={styles.txTile}>
                      <span style={styles.txTileLabel}>Date Vente :</span>
                      <span style={styles.txTileText}>
                        {new Date(loadedTx.transaction_date || loadedTx.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div style={styles.txTile}>
                      <span style={styles.txTileLabel}>Montant Initial :</span>
                      <strong style={{ ...styles.txTileValue, color: '#059669' }}>
                        {Number(loadedTx.total_amount).toFixed(2)} MAD
                      </strong>
                    </div>
                    <div style={styles.txTile}>
                      <span style={styles.txTileLabel}>Statut Vente :</span>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '12px',
                        backgroundColor: loadedTx.return_status === 'full' ? '#fee2e2' : loadedTx.return_status === 'partial' ? '#fef3c7' : '#dcfce7',
                        color: loadedTx.return_status === 'full' ? '#dc2626' : loadedTx.return_status === 'partial' ? '#b45309' : '#166534',
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
                        <th style={{ textAlign: 'left', minWidth: '220px' }}>Article & Code-barres</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>Vendu</th>
                        <th style={{ textAlign: 'center', width: '90px' }}>Déjà Ret.</th>
                        <th style={{ textAlign: 'center', width: '100px' }}>Dispo Ret.</th>
                        <th style={{ textAlign: 'right', width: '105px' }}>Prix Unitaire</th>
                        <th style={{ textAlign: 'center', width: '145px' }}>Qté à Retourner</th>
                        <th style={{ textAlign: 'center', width: '135px' }}>Remise en Stock</th>
                        <th style={{ textAlign: 'right', width: '125px' }}>Remboursement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItemsState.map((item) => {
                        const isDepleted = item.max_qty <= 0;
                        return (
                          <tr key={item.transaction_item_id} style={{ 
                            ...styles.modalTr,
                            opacity: isDepleted ? 0.45 : 1,
                            backgroundColor: item.return_qty > 0 ? '#fff5f5' : 'transparent',
                          }}>
                            <td style={styles.modalTd}>
                              <div style={styles.productName}>{item.product_name}</div>
                              <span style={styles.productBarcode}>Code: {item.barcode}</span>
                            </td>
                            <td style={{ ...styles.modalTd, textAlign: 'center', fontWeight: '700', fontSize: '14px', color: '#334155' }}>
                              {item.quantity_sold}
                            </td>
                            <td style={{ ...styles.modalTd, textAlign: 'center' }}>
                              {item.returned_so_far > 0 ? (
                                <span style={styles.amberPill}>{item.returned_so_far}</span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>0</span>
                              )}
                            </td>
                            <td style={{ ...styles.modalTd, textAlign: 'center' }}>
                              {item.max_qty > 0 ? (
                                <span style={styles.greenPill}>{item.max_qty}</span>
                              ) : (
                                <span style={styles.depletedPill}>Épuisé</span>
                              )}
                            </td>
                            <td style={{ ...styles.modalTd, textAlign: 'right', fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                              {item.unit_price.toFixed(2)} MAD
                            </td>
                            <td style={{ ...styles.modalTd, textAlign: 'center' }}>
                              <div style={styles.stepperWrapper}>
                                <button
                                  type="button"
                                  disabled={isDepleted || item.return_qty <= 0}
                                  onClick={() => handleItemQtyChange(item.transaction_item_id, item.return_qty - 1)}
                                  style={{
                                    ...styles.stepperBtn,
                                    cursor: (isDepleted || item.return_qty <= 0) ? 'not-allowed' : 'pointer',
                                    opacity: (isDepleted || item.return_qty <= 0) ? 0.35 : 1,
                                  }}
                                  title="Diminuer la quantité"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.max_qty}
                                  disabled={isDepleted}
                                  value={item.return_qty}
                                  onChange={(e) => handleItemQtyChange(item.transaction_item_id, e.target.value)}
                                  style={styles.stepperInput}
                                />
                                <button
                                  type="button"
                                  disabled={isDepleted || item.return_qty >= item.max_qty}
                                  onClick={() => handleItemQtyChange(item.transaction_item_id, item.return_qty + 1)}
                                  style={{
                                    ...styles.stepperBtn,
                                    cursor: (isDepleted || item.return_qty >= item.max_qty) ? 'not-allowed' : 'pointer',
                                    opacity: (isDepleted || item.return_qty >= item.max_qty) ? 0.35 : 1,
                                  }}
                                  title="Augmenter la quantité"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ ...styles.modalTd, textAlign: 'center' }}>
                              <button
                                type="button"
                                disabled={isDepleted || item.return_qty === 0}
                                onClick={() => handleItemRestockedToggle(item.transaction_item_id)}
                                style={{
                                  ...styles.restockToggleBtn,
                                  opacity: (isDepleted || item.return_qty === 0) ? 0.4 : 1,
                                  cursor: (isDepleted || item.return_qty === 0) ? 'not-allowed' : 'pointer',
                                  backgroundColor: item.restocked ? '#f0fdf4' : '#fef2f2',
                                  color: item.restocked ? '#166534' : '#991b1b',
                                  borderColor: item.restocked ? '#bbf7d0' : '#fecaca',
                                }}
                                title={item.restocked ? "L'article sera réintégré au stock" : "L'article est défectueux et ne sera pas remis en rayon"}
                              >
                                {item.restocked ? <Check size={13} style={{ marginRight: '4px' }} /> : <AlertCircle size={13} style={{ marginRight: '4px' }} />}
                                <span>{item.restocked ? 'En Stock' : 'Défectueux'}</span>
                              </button>
                            </td>
                            <td style={{ ...styles.modalTd, textAlign: 'right', fontWeight: '800', fontSize: '15px', color: item.return_qty > 0 ? '#dc2626' : '#94a3b8' }}>
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
        maxWidth="750px"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                style={styles.modalCloseBtn}
              >
                Fermer
              </button>
            </div>
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
    backgroundColor: '#f8fafc',
    padding: '18px 20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  label: {
    display: 'block',
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
  },
  searchTxRow: {
    display: 'flex',
    gap: '10px',
  },
  searchTxInput: {
    flex: 1,
    padding: '11px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchTxBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '0 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '12px 16px',
    borderRadius: '6px',
    marginTop: '12px',
    fontSize: '13.5px',
    fontWeight: '500',
  },
  txInfoCard: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '18px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  txInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  txTile: {
    backgroundColor: '#f8fafc',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  txTileLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  txTileValue: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
  },
  txTileText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  sectionTitle: {
    fontSize: '14.5px',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '10px',
    letterSpacing: '-0.2px',
  },
  itemsTableWrapper: {
    maxHeight: '340px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '18px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  itemsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  modalTr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  modalTd: {
    padding: '12px 14px',
    verticalAlign: 'middle',
  },
  productName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: '1.3',
  },
  productBarcode: {
    fontSize: '11.5px',
    color: '#64748b',
    fontFamily: 'monospace',
    display: 'inline-block',
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    marginTop: '3px',
  },
  amberPill: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    display: 'inline-block',
  },
  greenPill: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '800',
    display: 'inline-block',
  },
  depletedPill: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  stepperWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  stepperBtn: {
    width: '32px',
    height: '34px',
    border: 'none',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    color: '#334155',
    userSelect: 'none',
  },
  stepperInput: {
    width: '48px',
    height: '34px',
    border: 'none',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    textAlign: 'center',
    fontSize: '14.5px',
    fontWeight: '800',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#0f172a',
  },
  restockToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    border: '1px solid',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    marginBottom: '18px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13.5px',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  totalRefundBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    flexWrap: 'wrap',
    gap: '14px',
  },
  totalRefundText: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#991b1b',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  totalRefundAmount: {
    fontSize: '24px',
    fontWeight: '900',
    color: '#dc2626',
  },
  cancelBtn: {
    padding: '11px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13.5px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
  },
  submitReturnBtn: {
    padding: '11px 24px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },

  /* Success screen */
  successContainer: {
    padding: '36px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  successSub: {
    fontSize: '14.5px',
    color: '#475569',
    marginTop: '10px',
    maxWidth: '520px',
    lineHeight: '1.5',
  },
  successActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '26px',
  },
  successNewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '10px 22px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  successCloseBtn: {
    padding: '10px 22px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },

  /* Details modal styles */
  detailsContainer: {
    padding: '4px 0',
  },
  detailsMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    backgroundColor: '#f8fafc',
    padding: '14px 18px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13.5px',
  },
  metaLabel: {
    color: '#64748b',
    marginRight: '6px',
  },
  notesBox: {
    marginTop: '12px',
    padding: '12px 16px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#92400e',
  },
  detailsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    marginBottom: '16px',
  },
  detailsTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    marginBottom: '16px',
  },
  modalCloseBtn: {
    padding: '10px 24px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

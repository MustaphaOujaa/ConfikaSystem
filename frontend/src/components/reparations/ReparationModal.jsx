import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Smartphone, User, AlertCircle, Wrench, Calendar, DollarSign } from 'lucide-react';
import { useCreateReparationMutation, useUpdateReparationMutation } from '../../api/apiSlice';

export default function ReparationModal({ isOpen, onClose, initialData = null, isAdmin = false }) {
  const [createReparation, { isLoading: isCreating }] = useCreateReparationMutation();
  const [updateReparation, { isLoading: isUpdating }] = useUpdateReparationMutation();

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    brand: '',
    model: '',
    imei_serial: '',
    color: '',
    panne_batterie: false,
    panne_chargeur: false,
    panne_coque: false,
    panne_sim: false,
    panne_autre: '',
    etat_ecran_casse: false,
    etat_ne_sallume_pas: false,
    etat_fonctionne: false,
    description_panne: '',
    remarques: '',
    total_price: '',
    acompte: '0',
    status: 'recu',
    date_depot: todayStr,
    date_prevue: '',
    date_retrait: '',
    parts: [],
  });

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        client_name: initialData.client_name || '',
        client_phone: initialData.client_phone || '',
        brand: initialData.brand || '',
        model: initialData.model || '',
        imei_serial: initialData.imei_serial || '',
        color: initialData.color || '',
        panne_batterie: Boolean(initialData.panne_batterie),
        panne_chargeur: Boolean(initialData.panne_chargeur),
        panne_coque: Boolean(initialData.panne_coque),
        panne_sim: Boolean(initialData.panne_sim),
        panne_autre: initialData.panne_autre || '',
        etat_ecran_casse: Boolean(initialData.etat_ecran_casse),
        etat_ne_sallume_pas: Boolean(initialData.etat_ne_sallume_pas),
        etat_fonctionne: Boolean(initialData.etat_fonctionne),
        description_panne: initialData.description_panne || '',
        remarques: initialData.remarques || '',
        total_price: initialData.total_price !== undefined ? initialData.total_price : '',
        acompte: initialData.acompte !== undefined ? initialData.acompte : '0',
        status: initialData.status || 'recu',
        date_depot: initialData.date_depot ? initialData.date_depot.split('T')[0] : todayStr,
        date_prevue: initialData.date_prevue ? initialData.date_prevue.split('T')[0] : '',
        date_retrait: initialData.date_retrait ? initialData.date_retrait.split('T')[0] : '',
        parts: initialData.parts ? initialData.parts.map(p => ({
          name: p.name || '',
          quantity: p.quantity || 1,
          cost_price: p.cost_price !== undefined ? p.cost_price : 0,
          selling_price: p.selling_price !== undefined ? p.selling_price : 0,
        })) : [],
      });
    } else {
      setFormData({
        client_name: '',
        client_phone: '',
        brand: '',
        model: '',
        imei_serial: '',
        color: '',
        panne_batterie: false,
        panne_chargeur: false,
        panne_coque: false,
        panne_sim: false,
        panne_autre: '',
        etat_ecran_casse: false,
        etat_ne_sallume_pas: false,
        etat_fonctionne: false,
        description_panne: '',
        remarques: '',
        total_price: '',
        acompte: '0',
        status: 'recu',
        date_depot: todayStr,
        date_prevue: '',
        date_retrait: '',
        parts: [],
      });
    }
    setErrorMsg('');
  }, [initialData, isOpen, todayStr]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Parts handlers
  const handleAddPart = () => {
    setFormData((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        { name: '', quantity: 1, cost_price: 0, selling_price: 0 }
      ],
    }));
  };

  const handleRemovePart = (index) => {
    setFormData((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, idx) => idx !== index),
    }));
  };

  const handlePartChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.parts];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return { ...prev, parts: updated };
    });
  };

  // Calculations
  const totalPriceNum = parseFloat(formData.total_price) || 0;
  const acompteNum = parseFloat(formData.acompte) || 0;
  const resteNum = Math.max(0, totalPriceNum - acompteNum);

  const partsTotalCost = formData.parts.reduce((sum, p) => {
    const cost = parseFloat(p.cost_price) || 0;
    const qty = parseInt(p.quantity, 10) || 1;
    return sum + (cost * qty);
  }, 0);

  const estimatedGain = totalPriceNum - partsTotalCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.client_name.trim()) {
      setErrorMsg('Veuillez saisir le nom du client.');
      return;
    }
    if (!formData.client_phone.trim()) {
      setErrorMsg('Veuillez saisir le numéro de téléphone du client.');
      return;
    }
    if (totalPriceNum < 0) {
      setErrorMsg('Le montant estimé ne peut pas être négatif.');
      return;
    }

    const payload = {
      ...formData,
      total_price: totalPriceNum,
      acompte: acompteNum,
      parts: formData.parts.map(p => ({
        name: p.name,
        quantity: parseInt(p.quantity, 10) || 1,
        cost_price: parseFloat(p.cost_price) || 0,
        selling_price: parseFloat(p.selling_price) || 0,
      })),
    };

    try {
      if (initialData?.id) {
        await updateReparation({ id: initialData.id, ...payload }).unwrap();
      } else {
        await createReparation(payload).unwrap();
      }
      onClose();
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Une erreur est survenue lors de l\'enregistrement.');
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {initialData ? `Modifier le Bon #${initialData.ticket_number || initialData.id}` : 'Nouveau Bon de Réparation'}
            </h2>
            <p style={styles.subtitle}>Enregistrement d\'un appareil pour réparation</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} type="button">
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* SECTION 1: CLIENT */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <User size={16} color="#0284c7" />
              <span>1. Informations du Client</span>
            </div>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Nom du client *</label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  placeholder="Ex: Mohamed Alami"
                  style={styles.input}
                  required
                />
              </div>
              <div>
                <label style={styles.label}>Téléphone du client *</label>
                <input
                  type="text"
                  name="client_phone"
                  value={formData.client_phone}
                  onChange={handleChange}
                  placeholder="Ex: 0612345678"
                  style={styles.input}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: APPAREIL */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <Smartphone size={16} color="#0284c7" />
              <span>2. Informations de l'Appareil</span>
            </div>
            <div style={styles.grid4}>
              <div>
                <label style={styles.label}>Marque</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Ex: Apple, Samsung, Xiaomi..."
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Modèle</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="Ex: iPhone 13, A54..."
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>IMEI / N° Série</label>
                <input
                  type="text"
                  name="imei_serial"
                  value={formData.imei_serial}
                  onChange={handleChange}
                  placeholder="Numéro IMEI ou Série"
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Couleur</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="Ex: Noir, Bleu, Argent..."
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PANNE SIGNALÉE & ÉTAT DE L'APPAREIL */}
          <div style={styles.grid2}>
            {/* Panne signalée */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span>⚠️ Panne Signalée (Checklist)</span>
              </div>
              <div style={styles.checkboxGrid}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="panne_batterie"
                    checked={formData.panne_batterie}
                    onChange={handleChange}
                  />
                  <span>Batterie</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="panne_chargeur"
                    checked={formData.panne_chargeur}
                    onChange={handleChange}
                  />
                  <span>Chargeur</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="panne_coque"
                    checked={formData.panne_coque}
                    onChange={handleChange}
                  />
                  <span>Coque</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="panne_sim"
                    checked={formData.panne_sim}
                    onChange={handleChange}
                  />
                  <span>SIM</span>
                </label>
              </div>
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  name="panne_autre"
                  value={formData.panne_autre}
                  onChange={handleChange}
                  placeholder="Autre panne signalée..."
                  style={styles.input}
                />
              </div>
            </div>

            {/* État de l'appareil */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span>🔍 État de l'Appareil au Dépôt</span>
              </div>
              <div style={styles.checkboxCol}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="etat_ecran_casse"
                    checked={formData.etat_ecran_casse}
                    onChange={handleChange}
                  />
                  <span>Écran cassé / fissuré</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="etat_ne_sallume_pas"
                    checked={formData.etat_ne_sallume_pas}
                    onChange={handleChange}
                  />
                  <span>Ne s'allume pas</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="etat_fonctionne"
                    checked={formData.etat_fonctionne}
                    onChange={handleChange}
                  />
                  <span>Fonctionne / S'allume</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 4: DESCRIPTION & REMARQUES */}
          <div style={styles.section}>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Description de la panne (Détaillée)</label>
                <textarea
                  name="description_panne"
                  value={formData.description_panne}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Précisez ce qui ne marche pas (ex: caméra floue, afficheur noir après chute...)"
                  style={styles.textarea}
                />
              </div>
              <div>
                <label style={styles.label}>Remarques & Observations</label>
                <textarea
                  name="remarques"
                  value={formData.remarques}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Rayures existantes, code de déverrouillage, etc."
                  style={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: PIÈCES NÉCESSAIRES & COÛTS */}
          <div style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={styles.sectionHeader}>
                <Wrench size={16} color="#0284c7" />
                <span>5. Pièces & Fournitures nécessaires</span>
              </div>
              <button
                type="button"
                onClick={handleAddPart}
                style={styles.addPartBtn}
              >
                <Plus size={14} style={{ marginRight: '4px' }} />
                Ajouter une pièce
              </button>
            </div>

            {formData.parts.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', margin: '4px 0 8px 0' }}>
                Aucune pièce renseignée (service ou réparation sans remplacement de pièce).
              </p>
            ) : (
              <div style={styles.partsTableContainer}>
                <table style={styles.partsTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Nom de la pièce</th>
                      <th style={{ ...styles.th, width: '70px' }}>Qté</th>
                      <th style={{ ...styles.th, width: '130px' }}>
                        Coût Magasin (DH)
                      </th>
                      <th style={{ ...styles.th, width: '130px' }}>Prix Client (DH)</th>
                      <th style={{ ...styles.th, width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.parts.map((part, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}>
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => handlePartChange(idx, 'name', e.target.value)}
                            placeholder="Ex: Écran OLED iPhone 13"
                            style={styles.partInput}
                            required
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => handlePartChange(idx, 'quantity', e.target.value)}
                            style={styles.partInput}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={part.cost_price}
                            onChange={(e) => handlePartChange(idx, 'cost_price', e.target.value)}
                            placeholder="0.00"
                            style={styles.partInput}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={part.selling_price}
                            onChange={(e) => handlePartChange(idx, 'selling_price', e.target.value)}
                            placeholder="0.00"
                            style={styles.partInput}
                          />
                        </td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            style={styles.trashBtn}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 6: MONTANTS, ACOMPTE & DATES */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <DollarSign size={16} color="#0284c7" />
              <span>6. Tarification, Reste & Dates</span>
            </div>
            <div style={styles.grid3}>
              <div>
                <label style={styles.label}>Montant total estimé (DH) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="total_price"
                  value={formData.total_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  style={{ ...styles.input, fontWeight: '700', fontSize: '15px' }}
                  required
                />
              </div>
              <div>
                <label style={styles.label}>Acompte versé (DH)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="acompte"
                  value={formData.acompte}
                  onChange={handleChange}
                  placeholder="0.00"
                  style={{ ...styles.input, color: '#16a34a', fontWeight: '700' }}
                />
              </div>
              <div>
                <label style={styles.label}>Reste à payer (DH)</label>
                <div style={styles.resteDisplay}>
                  {resteNum.toFixed(2)} DH
                </div>
              </div>
            </div>

            {/* Admin Financial preview box */}
            {isAdmin && (
              <div style={styles.adminProfitBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Coût total des pièces : <strong>{partsTotalCost.toFixed(2)} DH</strong></span>
                  <span>Bénéfice estimé magasin (Gain) : <strong style={{ color: estimatedGain >= 0 ? '#16a34a' : '#dc2626' }}>{estimatedGain.toFixed(2)} DH</strong></span>
                </div>
              </div>
            )}

            {/* Dates & Status */}
            <div style={{ ...styles.grid4, marginTop: '12px' }}>
              <div>
                <label style={styles.label}>Date de dépôt</label>
                <input
                  type="date"
                  name="date_depot"
                  value={formData.date_depot}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Date prévue</label>
                <input
                  type="date"
                  name="date_prevue"
                  value={formData.date_prevue}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Date retrait réel</label>
                <input
                  type="date"
                  name="date_retrait"
                  value={formData.date_retrait}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Statut de l'appareil</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="recu">Reçu (En attente)</option>
                  <option value="en_cours">En cours de réparation</option>
                  <option value="pret">Prêt pour retrait</option>
                  <option value="livre">Livré au client</option>
                  <option value="annule">Annulé / Non réparable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              style={styles.saveBtn}
            >
              {isCreating || isUpdating ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Enregistrer le Bon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '850px',
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#6b7280',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
  },
  errorAlert: {
    margin: '16px 24px 0 24px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
  },
  form: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    backgroundColor: '#f9fafb',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid #f3f4f6',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '10px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  checkboxCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
  },
  addPartBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  partsTableContainer: {
    overflowX: 'auto',
  },
  partsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  th: {
    textAlign: 'left',
    padding: '6px 8px',
    color: '#6b7280',
    fontWeight: '600',
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '6px 8px',
  },
  partInput: {
    width: '100%',
    padding: '6px 8px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  trashBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resteDisplay: {
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: '15px',
  },
  adminProfitBox: {
    marginTop: '10px',
    padding: '10px 14px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#065f46',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelBtn: {
    padding: '9px 18px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 20px',
    backgroundColor: '#0284c7',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    cursor: 'pointer',
  },
};

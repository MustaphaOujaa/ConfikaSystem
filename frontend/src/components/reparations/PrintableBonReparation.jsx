import React from 'react';
import { Printer, X } from 'lucide-react';

export default function PrintableBonReparation({ reparation, onClose }) {
  if (!reparation) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="print-modal-overlay" style={styles.overlay}>
      <div className="no-print" style={styles.actionBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handlePrint} style={styles.printBtn} type="button">
            <Printer size={18} style={{ marginRight: '6px' }} />
            Imprimer le Bon
          </button>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            (Format papier A5 ou Ticket de caisse)
          </span>
        </div>
        <button onClick={onClose} style={styles.closeBtn} type="button">
          <X size={20} />
        </button>
      </div>

      {/* The Printable Document */}
      <div className="printable-bon" style={styles.sheet}>
        {/* Header matching physical paper */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoBadge}>CK</div>
            <div>
              <h1 style={styles.companyName}>CONFIKA</h1>
              <p style={styles.companySlogan}>CONFIANCE • QUALITÉ • PERFORMANCE</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.titleBox}>BON DE RÉPARATION</div>
            <div style={styles.ticketNum}>N° : {reparation.ticket_number || `REP-${reparation.id}`}</div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* 2 Columns: Client Info & Device Info */}
        <div style={styles.twoCols}>
          {/* Client Info */}
          <div style={styles.box}>
            <div style={styles.boxHeader}>
              <span style={styles.iconCircle}>👤</span> INFORMATIONS DU CLIENT
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Nom :</span>
              <span style={styles.value}>{reparation.client_name || '—'}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Téléphone :</span>
              <span style={styles.valueHighlight}>{reparation.client_phone || '—'}</span>
            </div>
          </div>

          {/* Device Info */}
          <div style={styles.box}>
            <div style={styles.boxHeader}>
              <span style={styles.iconCircle}>📱</span> INFORMATIONS DE L'APPAREIL
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Marque :</span>
              <span style={styles.value}>{reparation.brand || '—'}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Modèle :</span>
              <span style={styles.value}>{reparation.model || '—'}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>IMEI / N° Série :</span>
              <span style={styles.value}>{reparation.imei_serial || '—'}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Couleur :</span>
              <span style={styles.value}>{reparation.color || '—'}</span>
            </div>
          </div>
        </div>

        {/* Panne Signalée */}
        <div style={{ ...styles.box, marginTop: '12px' }}>
          <div style={styles.boxHeader}>
            <span style={styles.iconCircle}>⚠️</span> PANNE SIGNALÉE
          </div>
          <div style={styles.checkboxGrid}>
            <label style={styles.checkItem}>
              <span style={reparation.panne_batterie ? styles.boxChecked : styles.boxUnchecked}>
                {reparation.panne_batterie ? '✔' : ''}
              </span>
              Batterie
            </label>
            <label style={styles.checkItem}>
              <span style={reparation.panne_chargeur ? styles.boxChecked : styles.boxUnchecked}>
                {reparation.panne_chargeur ? '✔' : ''}
              </span>
              Chargeur / Connecteur
            </label>
            <label style={styles.checkItem}>
              <span style={reparation.panne_coque ? styles.boxChecked : styles.boxUnchecked}>
                {reparation.panne_coque ? '✔' : ''}
              </span>
              Coque / Châssis
            </label>
            <label style={styles.checkItem}>
              <span style={reparation.panne_sim ? styles.boxChecked : styles.boxUnchecked}>
                {reparation.panne_sim ? '✔' : ''}
              </span>
              SIM / Réseau
            </label>
          </div>
          {reparation.panne_autre && (
            <div style={{ ...styles.row, marginTop: '8px' }}>
              <span style={styles.label}>Autre panne signalée :</span>
              <span style={styles.value}>{reparation.panne_autre}</span>
            </div>
          )}
        </div>

        {/* État de l'appareil */}
        <div style={{ ...styles.box, marginTop: '12px' }}>
          <div style={styles.boxHeader}>
            <span style={styles.iconCircle}>🔍</span> ÉTAT DE L'APPAREIL
          </div>
          <div style={styles.checkboxGrid}>
            <label style={styles.checkItem}>
              <span style={reparation.etat_ecran_casse ? styles.boxChecked : styles.boxUnchecked}>
                {reparation.etat_ecran_casse ? '✔' : ''}
              </span>
              Écran cassé
            </label>
            <label style={styles.checkItem}>
              <span style={reparation.etat_ne_sallume_pas ? styles.boxChecked : styles.boxUnchecked}>
                {reparation.etat_ne_sallume_pas ? '✔' : ''}
              </span>
              Ne s'allume pas
            </label>
            <label style={styles.checkItem}>
              <span style={reparation.etat_fonctionne ? styles.boxChecked : styles.boxUnchecked}>
                {reparation.etat_fonctionne ? '✔' : ''}
              </span>
              Fonctionne
            </label>
          </div>
        </div>

        {/* Detailed problem / Remarks */}
        {(reparation.description_panne || reparation.remarques) && (
          <div style={{ ...styles.box, marginTop: '12px' }}>
            <div style={styles.boxHeader}>
              <span style={styles.iconCircle}>📝</span> REMARQUES & DIAGNOSTIC
            </div>
            {reparation.description_panne && (
              <div style={{ fontSize: '13px', color: '#1f2937', marginBottom: '6px' }}>
                <strong>Panne détaillée :</strong> {reparation.description_panne}
              </div>
            )}
            {reparation.remarques && (
              <div style={{ fontSize: '13px', color: '#4b5563', fontStyle: 'italic' }}>
                <strong>Observations :</strong> {reparation.remarques}
              </div>
            )}
          </div>
        )}

        {/* Dates & Financials */}
        <div style={{ ...styles.twoCols, marginTop: '12px' }}>
          {/* Dates */}
          <div style={styles.box}>
            <div style={styles.boxHeader}>📅 DATES</div>
            <div style={styles.row}>
              <span style={styles.label}>Date de dépôt :</span>
              <span style={styles.value}>{formatDate(reparation.date_depot)}</span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Date prévue :</span>
              <span style={styles.value}>{formatDate(reparation.date_prevue)}</span>
            </div>
            {reparation.date_retrait && (
              <div style={styles.row}>
                <span style={styles.label}>Date de retrait :</span>
                <span style={styles.value}>{formatDate(reparation.date_retrait)}</span>
              </div>
            )}
          </div>

          {/* Finances */}
          <div style={styles.box}>
            <div style={styles.boxHeader}>💰 MONTANTS (MAD / DH)</div>
            <div style={styles.row}>
              <span style={styles.label}>Montant total estimé :</span>
              <span style={{ ...styles.value, fontWeight: '700' }}>
                {parseFloat(reparation.total_price || 0).toFixed(2)} DH
              </span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Acompte versé :</span>
              <span style={{ ...styles.value, color: '#16a34a', fontWeight: '600' }}>
                {parseFloat(reparation.acompte || 0).toFixed(2)} DH
              </span>
            </div>
            <div style={{ ...styles.row, borderTop: '1px dashed #d1d5db', paddingTop: '6px', marginTop: '4px' }}>
              <span style={{ ...styles.label, fontWeight: '700', color: '#b91c1c' }}>Reste à payer :</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#b91c1c' }}>
                {parseFloat(reparation.reste || 0).toFixed(2)} DH
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimers & Signatures */}
        <div style={styles.signatureSection}>
          <div style={styles.signatureBox}>
            <div style={styles.sigLabel}>SIGNATURE CLIENT</div>
            <div style={styles.sigLine} />
          </div>
          <div style={styles.signatureBox}>
            <div style={styles.sigLabel}>SIGNATURE CONFIKA</div>
            <div style={styles.sigLine} />
          </div>
        </div>

        <div style={styles.footerNote}>
          * Tout appareil non récupéré après un délai de 3 mois sera considéré comme abandonné. Veuillez conserver ce bon pour le retrait.
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-bon, .printable-bon * {
            visibility: visible;
          }
          .printable-bon {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 9999,
    overflowY: 'auto',
    padding: '24px 16px',
  },
  actionBar: {
    width: '100%',
    maxWidth: '680px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '12px 18px',
    borderRadius: '10px',
    marginBottom: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  closeBtn: {
    backgroundColor: '#f3f4f6',
    border: 'none',
    color: '#4b5563',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: '680px',
    padding: '28px',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    color: '#1f2937',
    border: '2px solid #0284c7',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontWeight: '900',
    fontSize: '22px',
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '-1px',
  },
  companyName: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '900',
    letterSpacing: '2px',
    color: '#0369a1',
  },
  companySlogan: {
    margin: 0,
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '1px',
    color: '#64748b',
  },
  headerRight: {
    textAlign: 'right',
  },
  titleBox: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontWeight: '800',
    fontSize: '15px',
    padding: '6px 14px',
    borderRadius: '6px',
    letterSpacing: '0.5px',
  },
  ticketNum: {
    marginTop: '6px',
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '1px',
  },
  divider: {
    height: '2px',
    backgroundColor: '#0284c7',
    margin: '12px 0 16px 0',
  },
  twoCols: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  box: {
    border: '1px solid #bae6fd',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
    padding: '10px 12px',
  },
  boxHeader: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#0369a1',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '4px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    letterSpacing: '0.3px',
  },
  iconCircle: {
    fontSize: '13px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    marginBottom: '4px',
  },
  label: {
    color: '#475569',
    fontWeight: '500',
  },
  value: {
    color: '#0f172a',
    fontWeight: '600',
  },
  valueHighlight: {
    color: '#0284c7',
    fontWeight: '700',
    fontSize: '13px',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginTop: '4px',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    gap: '6px',
    color: '#334155',
  },
  boxChecked: {
    width: '16px',
    height: '16px',
    border: '2px solid #0284c7',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontWeight: '900',
    fontSize: '11px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
  },
  boxUnchecked: {
    width: '16px',
    height: '16px',
    border: '1px solid #94a3b8',
    backgroundColor: '#ffffff',
    display: 'inline-flex',
    borderRadius: '3px',
  },
  signatureSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '24px',
    paddingTop: '12px',
  },
  signatureBox: {
    border: '1px dashed #94a3b8',
    borderRadius: '6px',
    height: '75px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  sigLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  sigLine: {
    borderBottom: '1px solid #cbd5e1',
    width: '80%',
    margin: '0 auto',
  },
  footerNote: {
    marginTop: '16px',
    fontSize: '10px',
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};

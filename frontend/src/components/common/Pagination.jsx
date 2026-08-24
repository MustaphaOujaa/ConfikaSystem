import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, lastPage, total, onPageChange }) {
  if (!lastPage || lastPage <= 1) return null;

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        Affichage page <strong style={{ color: '#111827' }}>{currentPage}</strong> sur <strong style={{ color: '#111827' }}>{lastPage}</strong> ({total} éléments au total)
      </div>
      <div style={styles.controls}>
        <button
          style={{ ...styles.btn, disabled: currentPage === 1 }}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} />
          <span>Précédent</span>
        </button>
        <button
          style={{ ...styles.btn, disabled: currentPage === lastPage }}
          disabled={currentPage === lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span>Suivant</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    marginTop: '16px',
    borderRadius: '0 0 8px 8px',
  },
  info: {
    fontSize: '13px',
    color: '#4b5563',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

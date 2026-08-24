import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import { useGetLowStockAlertsQuery } from '../../api/apiSlice';

export default function Navbar() {
  const location = useLocation();

  const getPageTitle = (path) => {
    switch (path) {
      case '/':
        return 'Tableau de Bord Principal';
      case '/products':
        return 'Gestion des Produits & Stock';
      case '/categories':
        return 'Catégories & Marques';
      case '/pos':
        return 'Caisse POS & Vente Directe';
      case '/transactions':
        return 'Historique des Transactions';
      default:
        return 'Système de Gestion Confika';
    }
  };

  const { data: lowStockData } = useGetLowStockAlertsQuery();
  const lowStockCount = lowStockData?.count || 0;

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.pageTitle}>{getPageTitle(location.pathname)}</h1>
      </div>

      <div style={styles.right}>
        {lowStockCount > 0 && (
          <Link to="/products" style={styles.alertBanner} title="Produits nécessitant un réapprovisionnement">
            <AlertCircle size={16} style={{ marginRight: '6px' }} />
            <span>{lowStockCount} Produit{lowStockCount > 1 ? 's' : ''} Stock Bas</span>
          </Link>
        )}

        <Link to="/pos" style={styles.posBtn}>
          <ShoppingCart size={16} style={{ marginRight: '6px' }} />
          <span>Caisse Rapide</span>
        </Link>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '60px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 90,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  alertBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
  },
  posBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
  },
};

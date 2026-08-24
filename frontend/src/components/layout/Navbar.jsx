import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AlertCircle, ShoppingCart, Menu } from 'lucide-react';
import { useGetLowStockAlertsQuery } from '../../api/apiSlice';

export default function Navbar({ onToggleSidebar, isLiveConnected }) {
  const location = useLocation();

  const getPageTitle = (path) => {
    switch (path) {
      case '/':
        return 'Tableau de Bord';
      case '/products':
        return 'Produits & Stock';
      case '/categories':
        return 'Catégories & Marques';
      case '/pos':
        return 'Caisse POS';
      case '/transactions':
        return 'Transactions';
      default:
        return 'Confika System';
    }
  };

  const { data: lowStockData } = useGetLowStockAlertsQuery();
  const lowStockCount = lowStockData?.count || 0;

  return (
    <header className="navbar-header" style={styles.header}>
      <div style={styles.left}>
        <button 
          className="mobile-nav-toggle" 
          onClick={onToggleSidebar}
          aria-label="Ouvrir le menu"
          type="button"
        >
          <Menu size={22} />
        </button>
        <h1 className="navbar-page-title" style={styles.pageTitle}>
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div style={styles.right}>
        {/* Real-time WebSocket Live Status Badge */}
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: isLiveConnected ? '#ecfdf5' : '#f3f4f6',
            color: isLiveConnected ? '#059669' : '#6b7280',
            border: `1px solid ${isLiveConnected ? '#a7f3d0' : '#e5e7eb'}`,
          }}
          title={isLiveConnected ? "Synchronisation en direct active (Laravel Reverb)" : "Connexion au serveur temps réel..."}
        >
          <span 
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isLiveConnected ? '#10b981' : '#9ca3af',
              boxShadow: isLiveConnected ? '0 0 6px #10b981' : 'none',
            }} 
          />
          <span className="navbar-alert-text">
            {isLiveConnected ? 'En direct' : 'Synchro'}
          </span>
        </div>

        {lowStockCount > 0 && (
          <Link to="/products" style={styles.alertBanner} title="Produits nécessitant un réapprovisionnement">
            <AlertCircle size={16} />
            <span className="navbar-alert-text" style={{ marginLeft: '6px' }}>
              {lowStockCount} Alerte{lowStockCount > 1 ? 's' : ''}
            </span>
          </Link>
        )}

        <Link to="/pos" style={styles.posBtn}>
          <ShoppingCart size={16} style={{ marginRight: '6px' }} />
          <span>Caisse</span>
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
    minWidth: 0,
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
    gap: '10px',
    flexShrink: 0,
  },
  alertBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textDecoration: 'none',
  },
  posBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
  },
};

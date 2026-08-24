import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  ShoppingCart, 
  Receipt, 
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { logout, selectCurrentUser } from '../../store/authSlice';
import { useGetLowStockAlertsQuery } from '../../api/apiSlice';

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  const { data: lowStockData } = useGetLowStockAlertsQuery(undefined, {
    pollingInterval: 30000,
  });

  const lowStockCount = lowStockData?.count || 0;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { label: 'Gestion des Produits', path: '/products', icon: Package },
    { label: 'Catégories & Marques', path: '/categories', icon: Tags },
    { label: 'Caisse / Vente (POS)', path: '/pos', icon: ShoppingCart },
    { label: 'Historique des Ventes', path: '/transactions', icon: Receipt },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Top Logo Section */}
      <div style={styles.logoContainer}>
        <img 
          src="/logo.jpeg" 
          alt="Confika System" 
          style={styles.logoImg}
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
          }}
        />
        <div style={styles.brandTitle}>CONFIKA SYSTEM</div>
      </div>

      {/* Navigation Links */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <Icon size={18} style={{ marginRight: '12px' }} />
              <span style={{ flexGrow: 1 }}>{item.label}</span>
              {item.path === '/products' && lowStockCount > 0 && (
                <span style={styles.badge} title={`${lowStockCount} articles en stock bas`}>
                  <AlertTriangle size={12} style={{ marginRight: '3px' }} />
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer User & Logout */}
      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <img src="/icon.jpeg" alt="User Icon" style={styles.userIcon} />
          <div style={styles.userText}>
            <div style={styles.userName}>{user?.name || 'Administrateur'}</div>
            <div style={styles.userRole}>Opérateur Système</div>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn} title="Se déconnecter">
          <LogOut size={16} />
          <span style={{ marginLeft: '8px' }}>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 100,
  },
  logoContainer: {
    padding: '20px 16px',
    borderBottom: '2px solid #dc2626',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logoImg: {
    maxHeight: '55px',
    maxWidth: '100%',
    objectFit: 'contain',
    marginBottom: '8px',
  },
  brandTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: '1px',
  },
  nav: {
    flexGrow: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '11px 16px',
    borderRadius: '6px',
    color: '#4b5563',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  navLinkActive: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 7px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  footer: {
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  userIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    marginRight: '10px',
    objectFit: 'cover',
    border: '1px solid #dc2626',
  },
  userText: {
    overflow: 'hidden',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: '11px',
    color: '#6b7280',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #dc2626',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
};

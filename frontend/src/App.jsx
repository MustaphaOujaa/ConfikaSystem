import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from './store/authSlice';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import PosPage from './pages/PosPage';
import TransactionsPage from './pages/TransactionsPage';
import ReturnsPage from './pages/ReturnsPage';
import CashiersPage from './pages/CashiersPage';
import SecurityPage from './pages/SecurityPage';
import ReparationsPage from './pages/ReparationsPage';

export default function App() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';
  const isReparateur = user?.role === 'reparateur';

  const defaultHome = isAdmin ? '/' : isReparateur ? '/reparations' : '/pos';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={<MainLayout />}>
        {/* If reparateur, index redirects to /reparations; if cashier, to /pos; if admin, renders Dashboard */}
        <Route 
          index 
          element={isAdmin ? <DashboardPage /> : <Navigate to={defaultHome} replace />} 
        />
        <Route 
          path="products" 
          element={!isReparateur ? <ProductsPage /> : <Navigate to="/reparations" replace />} 
        />
        <Route 
          path="categories" 
          element={!isReparateur ? <CategoriesPage /> : <Navigate to="/reparations" replace />} 
        />
        <Route 
          path="pos" 
          element={!isReparateur ? <PosPage /> : <Navigate to="/reparations" replace />} 
        />
        <Route 
          path="transactions" 
          element={!isReparateur ? <TransactionsPage /> : <Navigate to="/reparations" replace />} 
        />
        <Route 
          path="returns" 
          element={!isReparateur ? <ReturnsPage /> : <Navigate to="/reparations" replace />} 
        />
        <Route path="reparations" element={<ReparationsPage />} />
        <Route 
          path="cashiers" 
          element={isAdmin ? <CashiersPage /> : <Navigate to={defaultHome} replace />} 
        />
        <Route 
          path="security" 
          element={isAdmin ? <SecurityPage /> : <Navigate to={defaultHome} replace />} 
        />
      </Route>

      <Route path="*" element={<Navigate to={defaultHome} replace />} />
    </Routes>
  );
}

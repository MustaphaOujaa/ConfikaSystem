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

export default function App() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={<MainLayout />}>
        {/* If cashier, index redirects to /pos; if admin, renders Dashboard */}
        <Route 
          index 
          element={isAdmin ? <DashboardPage /> : <Navigate to="/pos" replace />} 
        />
        <Route path="products" element={<ProductsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={isAdmin ? "/" : "/pos"} replace />} />
    </Routes>
  );
}

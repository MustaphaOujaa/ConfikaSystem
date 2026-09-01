import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../../store/authSlice';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useRealtimeSync } from '../../utils/useRealtimeSync';

export default function MainLayout() {
  const token = useSelector(selectCurrentToken);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  useRealtimeSync();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={styles.container}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="app-main-wrapper">
        <Navbar 
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} 
        />
        <main className="app-content" style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    overflowX: 'hidden',
  },
  content: {
    padding: '24px',
    flexGrow: 1,
    minWidth: 0,
  },
};

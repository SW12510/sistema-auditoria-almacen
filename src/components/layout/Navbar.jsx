// src/components/layout/Navbar.jsx

import React from 'react';
import { useAuth } from '../../hooks/useAuth';

// 1. Recibe la función 'toggleSidebar' como prop
const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="top-navbar">
      
      {/* 2. Este es el nuevo botón "Hamburguesa" */}
      <button className="sidebar-toggle-button" onClick={toggleSidebar}>
        ☰
      </button>

      <div className="user-info">
        <span>
          Bienvenido, <strong>{user?.name}</strong> ({user?.role})
        </span>
      </div>
      <button className="logout-button" onClick={logout}>
        Cerrar Sesión
      </button>
    </header>
  );
};

export default Navbar;
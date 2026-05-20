// src/components/layout/Layout.jsx

import React, { useState } from 'react'; // 1. Importa useState
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  // 2. Crea el estado. 'true' = el menú empieza abierto
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 3. Crea la función que cambia el estado
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="layout-container">
      {/* 4. Pasa el estado al Sidebar para que sepa si mostrarse o no */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* 5. Añade una clase dinámica al main-content para que se ajuste */}
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        
        {/* 6. Pasa la función de toggle al Navbar, para que el botón funcione */}
        <Navbar toggleSidebar={toggleSidebar} />
        
        <div className="page-container-wrapper"> 
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
// src/components/layout/Sidebar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';



const Sidebar = ({ isOpen }) => {
  const { hasRole } = useAuth();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <style>{`     
          .sidebar-container {
          height: 100vh; 
          overflow-y: auto; 
          overflow-x: hidden;}
        .sidebar-container::-webkit-scrollbar {width: 6px;}
        .sidebar-container::-webkit-scrollbar-track {background: transparent;}
        .sidebar-container::-webkit-scrollbar-thumb {
          background-color: #475569; 
          border-radius: 10px;}
        .sidebar-container::-webkit-scrollbar-thumb:hover {background-color: #94a3b8;}
      `}</style>
      <nav className="sidebar-container">
        <ul>
          {/* --- ENLACES DE OPERADOR --- */}
          {hasRole(['operador', 'super_operador', 'supervisor', 'admin']) && (
            <>
              <li><NavLink to="/dashboard">Inicio</NavLink></li> 
              <li><NavLink to="/consulta">Consultas</NavLink></li>
              <li><NavLink to="/conteo">Conteos</NavLink></li>
            </>
          )}

          {hasRole(['super_operador', 'supervisor', 'admin']) && (
            <>
              <li><NavLink to="/modificar-lotes">Modificaciones</NavLink></li>
              <li><NavLink to="/salida-lotes">Salidas</NavLink></li>
            </>
          )}

          {hasRole(['operador', 'super_operador', 'supervisor', 'admin']) && (
            <>
              <li><NavLink to="/mis-reportes">Mis Reportes</NavLink></li>
            </>
          )}

          {/* --- ENLACES DE SUPERVISOR --- */}
          {hasRole(['supervisor', 'admin']) && (
            <>
              <li className="menu-header">SUPERVISOR</li>
              <li><NavLink to="/supervisor/actividades">Actividades</NavLink></li>
              <li><NavLink to="/supervisor/admin-ubicaciones">Ubicaciones</NavLink></li>
              <li><NavLink to="/supervisor/casi-caducar">Caducidades</NavLink></li>
              <li><NavLink to="/supervisor/reportes-todos">Reportes</NavLink></li>
            </>
          )}

          {/* --- ENLACES DE ADMIN --- */}
          {hasRole(['admin']) && (
            <>
              <li className="menu-header">ADMINISTRACIÓN</li>
              <li><NavLink to="/admin/usuarios">Usuarios</NavLink></li>
              <li><NavLink to="/admin/logs">Logs</NavLink></li>
            </>
          )}

          {/* --- ENLACE COMÚN --- */}
          <li><NavLink to="/perfil">Mi Perfil</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
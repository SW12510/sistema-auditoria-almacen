// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; 
import { AuthProvider } from './context/AuthContext';

// Importar Layouts y Guardias
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleGuard from './components/auth/RoleGuard';

// Importar Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import Perfil from './pages/Perfil';
import Consulta from './pages/Consulta';
import Conteo from './pages/Conteo';
import SalidaLotes from './pages/Salida';
import MisReportes from './pages/MisReportes';

// Páginas de Supervisor
import SupCasiCaducar from './pages/supervisor/SupCasiCaducar';
import SupActividades from './pages/supervisor/SupActividades';
import SupReportes from './pages/supervisor/SupReportes';

// Páginas de Admin
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AdminLogs from './pages/admin/AdminLogs';
import ModificarLotes from './pages/ModificarLotes';
import AdminUbicaciones from './pages/supervisor/AdminUbicaciones';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              
              {/* Rutas para TODOS los roles */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/consulta" element={<Consulta />} />
              <Route path="/conteo" element={<Conteo />} />
              <Route path="/mis-reportes" element={<MisReportes />} />

              {/* Rutas para Super Operador, Supervisor y Admin */}
              <Route element={<RoleGuard allowedRoles={['super_operador','supervisor', 'admin']} />}>
                <Route path="/salida-lotes" element={<SalidaLotes />} />
                <Route path="/modificar-lotes" element={<ModificarLotes />} />
              </Route>

              {/* Rutas para Supervisor y Admin */}
              <Route element={<RoleGuard allowedRoles={['supervisor', 'admin']} />}>
                <Route path="/supervisor/admin-ubicaciones" element={<AdminUbicaciones />} />
                <Route path="/supervisor/casi-caducar" element={<SupCasiCaducar />} />
                <Route path="/supervisor/actividades" element={<SupActividades />} />
                <Route path="/supervisor/reportes-todos" element={<SupReportes />} />
              </Route>

              {/* Rutas SOLO para Admin */}
              <Route element={<RoleGuard allowedRoles={['admin']} />}>
                <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                <Route path="/admin/logs" element={<AdminLogs />} />
              </Route>

            </Route>
          </Route>
          
          {/* Redirigir a login si no se encuentra la ruta */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
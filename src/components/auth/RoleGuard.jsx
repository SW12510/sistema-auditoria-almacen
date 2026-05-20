import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Recibe un array de roles permitidos (ej. ['admin'] o ['supervisor', 'admin'])
const RoleGuard = ({ allowedRoles }) => {
  const { user, hasRole } = useAuth();

  if (!user) {
    // Por si acaso, aunque ProtectedRoute ya debería haberlo hecho
    return <Navigate to="/login" />;
  }

  if (!hasRole(allowedRoles)) {
    // Si el usuario no tiene el rol, se le envía a "No Autorizado"
    return <Navigate to="/unauthorized" />;
  }

  // Si tiene el rol, le permitimos ver la página
  return <Outlet />;
};

export default RoleGuard;
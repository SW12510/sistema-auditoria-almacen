// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect } from 'react';
import { login as apiLogin , registrarLog } from '../api/mockApi'; 
import { useNavigate } from 'react-router-dom'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. INICIALIZACIÓN SEGURA:
  // Al cargar, lee la bóveda de la pestaña actual. Si hay basura o un error, asume 'null'.
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('auditoria_user');
      if (savedUser && savedUser !== 'undefined') {
        return JSON.parse(savedUser);
      }
    } catch (error) {
      console.error("Error al leer la sesión guardada:", error);
    }
    return null;
  });

  const navigate = useNavigate(); 

  const login = async (username, password) => {
    try {
      const userData = await apiLogin(username, password);
      
      // 2. GUARDAR SESIÓN:
      sessionStorage.setItem('auditoria_user', JSON.stringify(userData));
      setUser(userData);

      await registrarLog(userData.name, userData.role, 'Inició sesión');
      
      // Lógica de redirección (puedes cambiar estas rutas según lo necesites)
      switch(userData.role) {
        case 'admin':
          navigate('/dashboard');
          break;
        case 'supervisor':
          navigate('/dashboard');
          break;
        case 'super_operador':         // <--- NUEVO ROL
          navigate('/dashboard');         // Lo mandamos a su pantalla principal
          break;
        case 'operador':
          navigate('/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    // 3. LIMPIAR SESIÓN AL SALIR:
    if (user) {
      await registrarLog(user.name, user.role, 'Cerró sesión');
    }
    sessionStorage.removeItem('auditoria_user');
    setUser(null);
    navigate('/login');
  };

  const hasRole = (roles) => {
    return user && roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, hasRole }}>
      {children}
    </AuthContext.Provider>
  );

};

export default AuthContext;
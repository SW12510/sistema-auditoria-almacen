import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="page-container" style={{ textAlign: 'center' }}>
      <h1>Acceso Denegado</h1>
      <p>No tienes los permisos necesarios para ver esta página.</p>
      <Link to="/dashboard">
        <button className="primary">Volver al Dashboard</button>
      </Link>
    </div>
  );
};

export default Unauthorized;
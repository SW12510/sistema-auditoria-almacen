import React, { useState } from 'react';

/**
 * Componente de barra de búsqueda reutilizable.
 * @param {object} props
 * @param {function(string): void} props.onSearch - Función que se llama con el término de búsqueda cada vez que cambia.
 * @param {string} props.placeholder - Texto opcional para el placeholder (ej. "Buscar producto...").
 */
const SearchBar = ({ onSearch, placeholder = "Buscar..." }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Llama a la función del componente padre con cada cambio
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className="search-bar-container" style={{ margin: '1rem 0' }}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        style={{ 
          width: '100%', 
          padding: '0.8rem', 
          fontSize: '1rem',
          border: '1px solid var(--border-color)',
          borderRadius: '4px'
        }}
      />
    </div>
  );
};

export default SearchBar;
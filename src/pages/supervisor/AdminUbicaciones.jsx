import React, { useState, useMemo, useEffect } from 'react';
import { fetchUbicaciones, crearUbicacion, eliminarUbicacion, registrarLog } from '../../api/mockApi';
import { useAuth } from '../../hooks/useAuth';
import useIsMobile from '../../hooks/useIsMobile';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 

const AdminUbicaciones = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient(); 

  const [nuevaUbi, setNuevaUbi] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100); 

  const { data: ubicaciones = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['adminUbicaciones'],
    queryFn: async () => {
      const data = await fetchUbicaciones();
      return data;
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await crearUbicacion(nuevaUbi.trim().toUpperCase());
      await registrarLog(user.name, user.role, `Creó la nueva ubicación en el almacén: ${nuevaUbi.trim().toUpperCase()}`);
      setMessage('✅ Ubicación creada con éxito.');
      setNuevaUbi('');
      queryClient.invalidateQueries(['adminUbicaciones']);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('❌ Error: La ubicación ya existe o hubo un problema de red.');
    }
  };

  const handleEliminar = async (ubi) => {
    setError(''); setMessage('');
    
    if (ubi.estado === 'ocupada') {
        setError(`❌ No puedes eliminar "${ubi.nombre_ubicacion}" porque actualmente contiene lotes de producto.`);
        setTimeout(() => setError(''), 4000);
        return;
    }

    if (window.confirm(`¿Estás 100% seguro de que deseas ELIMINAR el espacio "${ubi.nombre_ubicacion}" del sistema?`)) {
        try {
            await eliminarUbicacion(ubi.id_ubicacion);
            await registrarLog(user.name, user.role, `Eliminó la ubicación del almacén: ${ubi.nombre_ubicacion}`);
            setMessage(`🗑️ La ubicación ${ubi.nombre_ubicacion} ha sido eliminada del mapa.`);
            queryClient.invalidateQueries(['adminUbicaciones']);
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setError(`❌ ${err.message}`);
        }
    }
  };

  const filteredUbicaciones = useMemo(() => {
    if (!searchTerm) return ubicaciones;
    return ubicaciones.filter(ubi => 
      ubi.nombre_ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ubicaciones, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUbicaciones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUbicaciones.length / itemsPerPage);

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando mapa de ubicaciones... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Gestión de Ubicaciones Físicas</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Crea, elimina y verifica espacios en almacen.</p>

      {message && <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '5px', marginBottom: '1rem', fontWeight: 'bold' }}>{message}</div>}
      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '5px', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}

      <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#0369a1' }}>Dar de Alta Nuevo Espacio</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Ej: PASILLO A - RACK 01" 
            value={nuevaUbi} 
            onChange={e => setNuevaUbi(e.target.value)} 
            required 
            style={{ flex: 1, minWidth: '200px', textTransform: 'uppercase' }}
          />
          <button type="submit" className="primary" style={{ width: isMobile ? '100%' : 'auto' }}>➕ Crear Ubicación</button>
        </form>
      </div>

      {/* BUSCADOR RÁPIDO */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar una ubicación específica..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{ width: '100%', maxWidth: '400px' }} 
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0 }}>Mapa Visual de Ocupación</h3>
        <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem' }}>
          <span style={{ color: '#16a34a' }}>● Libre (Clic para borrar)</span>
          <span style={{ color: '#dc2626' }}>● Ocupada (Bloqueada)</span>
        </div>
      </div>

      {/* BARRA DE CONTROLES DE PAGINACIÓN */}
      {filteredUbicaciones.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f1f5f9', padding: '10px 15px', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>Mostrar:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '5px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: 'white', margin: 0 }}
            >
              <option value={50}>50 espacios</option>
              <option value={100}>100 espacios</option>
              <option value={200}>200 espacios</option>
              <option value={500}>500 espacios</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUbicaciones.length)} de {filteredUbicaciones.length}
            </span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', margin: 0, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                ◀ Ant
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', margin: 0, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Sig ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAPA VISUAL */}
      {currentItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          No se encontraron ubicaciones.
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
          gap: '4px', 
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          {currentItems.map(ubi => (
            <div 
              key={ubi.id_ubicacion} 
              onClick={() => handleEliminar(ubi)}
              title={`${ubi.nombre_ubicacion} - (${ubi.estado}) ${ubi.estado === 'disponible' ? 'Clic para eliminar' : ''}`}
              style={{ 
                backgroundColor: ubi.estado === 'disponible' ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${ubi.estado === 'disponible' ? '#16a34a' : '#ef4444'}`,
                color: ubi.estado === 'disponible' ? '#166534' : '#991b1b',
                padding: '4px 2px', 
                borderRadius: '3px', 
                textAlign: 'center',
                fontSize: '0.65rem', 
                fontWeight: 'bold',
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                cursor: ubi.estado === 'disponible' ? 'pointer' : 'not-allowed',
                opacity: ubi.estado === 'disponible' ? 1 : 0.8
              }}
            >
              {ubi.nombre_ubicacion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUbicaciones;
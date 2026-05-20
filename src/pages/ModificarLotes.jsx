import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { modificarLote, fetchAllReports, registrarLog, fetchUbicacionesDisponibles} from '../api/mockApi';
import SearchBar from '../components/common/SearchBar';
import BarcodeScanner from '../components/BarcodeScanner';
import useIsMobile from '../hooks/useIsMobile';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 

const ModificarLotes = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({ id_rep: '', cant: '', ubi: '' });
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['modificarLotesData'],
    queryFn: async () => {
      const [repData, ubiData] = await Promise.all([
        fetchAllReports(),
        fetchUbicacionesDisponibles()
      ]);
      const lotesActivos = repData.filter(r => r.estado_lote !== 'dado_de_baja');
      return { lotes: lotesActivos, ubicaciones: ubiData };
    }
  });

  const lotes = data?.lotes || [];
  const ubicacionesLibres = data?.ubicaciones || [];

  const filteredLotes = useMemo(() => {
    const lowerTerm = searchTerm.trim().toLowerCase();
    if (!lowerTerm) return [];
    
    return lotes.filter(l => 
      (l.n_prod || '').toLowerCase().includes(lowerTerm) || 
      String(l.id_prod).toLowerCase().includes(lowerTerm) ||
      String(l.id_lote).toLowerCase().includes(lowerTerm)
    );
  }, [lotes, searchTerm]);

  const handleSelect = (lote) => {
    setLoteSeleccionado(lote);
    setFormData({ id_rep: lote.id_rep, cant: lote.cant, ubi: lote.ubi });
    setSearchTerm(''); 
    setShowScanner(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(window.confirm(`¿Seguro que deseas aplicar los cambios al lote ${loteSeleccionado.id_lote}?`)){
      setMessage('Guardando cambios... ⏳');
      try {
        await modificarLote(formData.id_rep, { cant: formData.cant, ubi: formData.ubi });
        
        const accionLog = `Corrección de lote [${loteSeleccionado.id_lote}]. Cantidad de ${loteSeleccionado.cant} -> ${formData.cant}. Ubicación de '${loteSeleccionado.ubi}' -> '${formData.ubi}'.`;
        await registrarLog(user.name, user.role, accionLog);

        setMessage('✅ Lote modificado correctamente.');
        setFormData({ id_rep: '', cant: '', ubi: '' });
        setLoteSeleccionado(null);
        
        queryClient.invalidateQueries(['modificarLotesData']);
        
        setTimeout(() => setMessage(''), 4000);
      } catch(err) { 
        alert("❌ Ocurrió un error al modificar el lote. Revisa tu conexión."); 
        setMessage('');
      }
    }
  };

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando lotes disponibles... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Corrección de Inventario</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Ajusta cantidades físicas o reasigna lotes a otras ubicaciones.</p>

      {message && <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '5px', marginBottom: '1rem', fontWeight: 'bold' }}>{message}</div>}

      {/* ========================================================= */}
      {/* SECCIÓN DE BÚSQUEDA */}
      {/* ========================================================= */}
      {!loteSeleccionado && (
        <div style={{ marginBottom: '2rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, color: '#334155' }}>Buscar Lote a Corregir</h3>
          
          <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
            <div style={{ flex: 1 }}>
              <SearchBar onSearch={setSearchTerm} placeholder="Buscar por SKU, Nombre de producto o ID de Lote..." />
            </div>
            <button className="secondary" onClick={() => setShowScanner(!showScanner)} style={{ height: '42px' }}>
              {showScanner ? 'Ocultar Cámara' : '📷 Usar Escáner'}
            </button>
          </div>
          
          {showScanner && <div style={{ marginTop: '1rem' }}><BarcodeScanner onScan={(code) => { setSearchTerm(code); }} /></div>}
          
          {searchTerm && (
            <div style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              {filteredLotes.length > 0 ? (
                filteredLotes.map(l => (
                  <div 
                    key={l.id_rep} 
                    onClick={() => handleSelect(l)} 
                    style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block' }}>Lote: {l.id_lote}</strong>
                      <span style={{ color: '#475569', fontSize: '0.9rem' }}>{l.n_prod} <small>({l.id_prod})</small></span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: '#0369a1', display: 'block' }}>{l.cant} pzs</strong>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>📍 {l.ubi}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No se encontraron lotes activos con ese criterio.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* FORMULARIO DE MODIFICACIÓN */}
      {/* ========================================================= */}
      {loteSeleccionado && (
        <div style={{ backgroundColor: '#fff7ed', padding: '2rem', borderRadius: '8px', border: '1px solid #fed7aa', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ marginTop: 0, color: '#9a3412', marginBottom: '5px' }}>Editando Lote: {loteSeleccionado.id_lote}</h2>
              <p style={{ margin: 0, color: '#c2410c', fontWeight: 'bold' }}>{loteSeleccionado.n_prod} <span style={{ color: '#fb923c' }}>(SKU: {loteSeleccionado.id_prod})</span></p>
            </div>
            <button className="secondary" onClick={() => setLoteSeleccionado(null)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>❌ Cancelar Edición</button>
          </div>
          
          <hr style={{ border: '0', borderTop: '1px solid #fdba74', margin: '1.5rem 0' }} />

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ color: '#431407' }}>Corregir Cantidad Física (Pzs)</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.cant} 
                  onChange={e => setFormData({...formData, cant: e.target.value})} 
                  required 
                  style={{ fontSize: '1.2rem', fontWeight: 'bold', padding: '12px' }}
                />
                <small style={{ color: '#9a3412', display: 'block', marginTop: '5px' }}>* La cantidad anterior era: {loteSeleccionado.cant} pzs.</small>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ color: '#431407' }}>Reasignar Ubicación FÍsica</label>
                <select 
                  value={formData.ubi} 
                  onChange={e => setFormData({...formData, ubi: e.target.value})} 
                  required
                  style={{ padding: '12px' }}
                >
                  <option value={loteSeleccionado.ubi}>📍 Mantener en: {loteSeleccionado.ubi}</option>
                  {ubicacionesLibres.map((ubi, idx) => (
                    <option key={idx} value={ubi.nombre_ubicacion}>
                      📍 {ubi.nombre_ubicacion}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#9a3412', display: 'block', marginTop: '5px' }}>* Solo se muestran ubicaciones vacías.</small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <button type="submit" className="primary" style={{ flex: 2, padding: '15px', fontSize: '1.1rem', backgroundColor: '#ea580c', borderColor: '#c2410c' }}>
                💾 Guardar Corrección en el Sistema
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ModificarLotes;
import React, { useState, useEffect } from 'react';
import { fetchExpiringSoon } from '../../api/mockApi';
import useIsMobile from '../../hooks/useIsMobile';
import { useQuery } from '@tanstack/react-query'; 
const SupCasiCaducar = () => {
  const isMobile = useIsMobile();
  
  const [diasFiltro, setDiasFiltro] = useState(60); 
  const [inputDias, setInputDias] = useState(60);  

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 

  const { data: products = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['casiCaducar', diasFiltro],
    queryFn: async () => {
      const data = await fetchExpiringSoon(diasFiltro);
      return data.filter(item => item.estado_lote !== 'dado_de_baja');
    }
  });

  const handleAplicarFiltro = (e) => {
    e.preventDefault();
    if (inputDias > 0) {
      setDiasFiltro(inputDias);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [diasFiltro]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = products.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(products.length / itemsPerPage);

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando productos por caducar... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Productos Próximos a Caducar</h1>
      
      {/* FILTROS SUPERIORES */}
      <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <p style={{ margin: 0, color: '#475569', fontWeight: 'bold' }}>
            Parámetro de búsqueda:
          </p>
          <small style={{ color: '#64748b' }}>Mostrando lotes que caducan en este rango de tiempo o que ya han caducado.</small>
        </div>
        
        <form onSubmit={handleAplicarFiltro} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
          <label style={{ fontWeight: 'bold', color: '#334155' }}>Días límite:</label>
          <input 
            type="number" 
            value={inputDias}
            onChange={(e) => setInputDias(e.target.value)}
            min="1"
            max="3650"
            style={{ width: '100px', margin: 0, flex: isMobile ? 1 : 'none' }}
          />
          <button type="submit" className="primary" style={{ margin: 0, padding: '10px 15px' }}>
            Aplicar
          </button>
        </form>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '1rem', backgroundColor: '#d1fae5', padding: '2rem', borderRadius: '8px' }}>
          <h2 style={{ color: '#059669', margin: 0 }}>✅ Todo en orden</h2>
          <p style={{ color: '#10b981', marginTop: '0.5rem' }}>No hay ningún lote que caduque en los próximos {diasFiltro} días.</p>
        </div>
      ) : (
        <>
          {/* BARRA DE CONTROLES DE PAGINACIÓN */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f1f5f9', padding: '10px 15px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>Mostrar:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '5px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: 'white', margin: 0 }}
              >
                <option value={10}>10 lotes</option>
                <option value={20}>20 lotes</option>
                <option value={50}>50 lotes</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, products.length)} de {products.length} alertas
              </span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', margin: 0, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Ant</button>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '6px 12px', margin: 0, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Sig ▶</button>
              </div>
            </div>
          </div>

          {isMobile ? (
            /* 📱 VISTA MÓVIL */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentItems.map((item, idx) => {
                const cadDate = new Date(item.cad);
                const today = new Date();
                cadDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                
                const diffTime = cadDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let statusText = ''; let statusColor = ''; let bgLightColor = ''; let borderLightColor = '';
                if (diffDays < 0) { statusText = `Caducado (hace ${Math.abs(diffDays)} días)`; statusColor = '#ef4444'; bgLightColor = '#fef2f2'; borderLightColor = '#fca5a5'; }
                else if (diffDays === 0) { statusText = 'Caduca HOY'; statusColor = '#ea580c'; bgLightColor = '#fff7ed'; borderLightColor = '#fdba74'; }
                else if (diffDays <= 30) { statusText = `Faltan ${diffDays} días`; statusColor = '#f97316'; bgLightColor = '#fff7ed'; borderLightColor = '#fdba74'; }
                else { statusText = `Faltan ${diffDays} días`; statusColor = '#eab308'; bgLightColor = '#fefce8'; borderLightColor = '#fde047'; }

                return (
                  <div key={item.id_rep || idx} style={{ backgroundColor: bgLightColor, padding: '15px', borderRadius: '8px', border: `1px solid ${borderLightColor}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <strong style={{ color: statusColor, fontSize: '1.1rem' }}>{statusText}</strong>
                      <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{item.cant} pzs</strong>
                    </div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#334155' }}>{item.n_prod}</h4>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>
                      SKU: {item.id_prod} | Lote: <strong>{item.id_lote}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: diffDays < 0 ? '#ef4444' : '#475569', fontWeight: 'bold' }}>📅 {cadDate.toLocaleDateString()}</span>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem'}}>📍 {item.ubi}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (

            /* 💻 VISTA ESCRITORIO */
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Fecha Caducidad</th>
                    <th style={{ backgroundColor: '#fff7ed', color: '#c2410c', textAlign: 'center' }}>
                      Estado <br/>
                      <small style={{ fontSize: '0.8em', backgroundColor: '#ffedd5', padding: '2px 6px', borderRadius: '10px' }}>(Límite: ≤ {diasFiltro} días)</small>
                    </th>
                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                    <th>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => {
                    const cadDate = new Date(item.cad);
                    const today = new Date();
                    cadDate.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    
                    const diffTime = cadDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let statusText = ''; let statusColor = '';
                    if (diffDays < 0) { statusText = `Caducado (hace ${Math.abs(diffDays)} días)`; statusColor = '#ef4444'; }
                    else if (diffDays === 0) { statusText = 'Caduca HOY'; statusColor = '#ea580c'; }
                    else if (diffDays <= 30) { statusText = `Faltan ${diffDays} días`; statusColor = '#f97316'; }
                    else { statusText = `Faltan ${diffDays} días`; statusColor = '#eab308'; }

                    return (
                      <tr key={item.id_rep || idx}>
                        <td style={{ fontWeight: 'bold', color: '#334155' }}>{item.id_prod}</td>
                        <td>{item.n_prod}</td>
                        <td style={{ fontWeight: 'bold' }}>{item.id_lote}</td>
                        <td style={{ fontWeight: 'bold', color: diffDays < 0 ? '#ef4444' : 'inherit' }}>{cadDate.toLocaleDateString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ backgroundColor: statusColor, color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 'bold', display: 'inline-block' }}>
                            {statusText}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', backgroundColor: '#f9fcff' }}>{item.cant}</td>
                        <td>
                          <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem'}}>📍 {item.ubi}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SupCasiCaducar;
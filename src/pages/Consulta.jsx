import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchInventoryForConsult, fetchAllReports } from '../api/mockApi';
import SearchBar from '../components/common/SearchBar';
import BarcodeScanner from '../components/BarcodeScanner';
import useIsMobile from '../hooks/useIsMobile';
import { useQuery } from '@tanstack/react-query';

const Consulta = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile(); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]); 
  const [onlyWithStock, setOnlyWithStock] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['consultaInventario', user?.id], 
    queryFn: async () => {
      const [invData, repData] = await Promise.all([
        fetchInventoryForConsult(user),
        fetchAllReports()
      ]);
      const reportesActivos = repData.filter(r => r.estado_lote !== 'dado_de_baja');
      return { inventario: invData, reportes: reportesActivos };
    },
    enabled: !!user,
  });

  const fullInventory = data?.inventario || [];
  const reportes = data?.reportes || [];

  const filteredInventory = useMemo(() => {
    const lowerTerm = searchTerm.trim().toLowerCase();
    const cleanSearchTerm = lowerTerm.replace(/^0+/, ''); 

    return fullInventory.filter(item => {
        const itemName = (item.name || '').toLowerCase();
        const itemSku = String(item.id).toLowerCase();
        const cleanId = itemSku.replace(/^0+/, '');

        const matchText = !lowerTerm || 
                          itemName.includes(lowerTerm) || 
                          itemSku.includes(lowerTerm) || 
                          (cleanSearchTerm && cleanId.includes(cleanSearchTerm));
        
        const lotesActivosDelProducto = reportes.filter(r => String(r.id_prod).trim() === String(item.id).trim());
        const matchStock = !onlyWithStock || lotesActivosDelProducto.length > 0;

        return matchText && matchStock;
    });
  }, [searchTerm, fullInventory, reportes, onlyWithStock]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, onlyWithStock]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  const handleScan = (barcode) => {
    setSearchTerm(barcode);
    setShowScanner(false);
  };

  const toggleRow = (productId) => {
    setExpandedRows(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando inventario... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Consulta de Inventario</h1>
      
      <div className="search-controls" style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <SearchBar onSearch={setSearchTerm} placeholder="Buscar por Nombre o SKU..." />
          </div>
          <br />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyWithStock} onChange={(e) => setOnlyWithStock(e.target.checked)} style={{ width: '20px', height: '20px' }} />
            Solo con lotes físicos
          </label>
        </div>
        <button className="secondary" onClick={() => setShowScanner(!showScanner)} style={{ marginTop: '1rem', width: '100%', padding: '12px' }}>
          {showScanner ? 'Ocultar Escáner' : '📷 Usar Cámara para Buscar'}
        </button>
        {showScanner && <div style={{ marginTop: '1rem' }}><BarcodeScanner onScan={handleScan} /></div>}
      </div>

      {filteredInventory.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f1f5f9', padding: '10px 15px', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>Mostrar:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '5px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: 'white', margin: 0 }}
            >
              <option value={10}>10 filas</option>
              <option value={20}>20 filas</option>
              <option value={50}>50 filas</option>
              <option value={100}>100 filas</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredInventory.length)} de {filteredInventory.length}
            </span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', margin: 0, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                ◀ Anterior
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', margin: 0, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Siguiente ▶
              </button>
            </div>
          </div>

        </div>
      )}

      {isMobile ? (
        /* VISTA MÓVIL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentItems.length > 0 ? (
            currentItems.map((item, index) => {
              const isExpanded = expandedRows.includes(item.id);
              const lotesReportados = reportes.filter(r => String(r.id_prod).trim() === String(item.id).trim());
              const lotesTotal = lotesReportados.reduce((acc, lote) => acc + (lote.cant || 0), 0);

              return (
                <div key={`${item.id}-${index}`} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{item.id}</strong>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>{item.name}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f9fcff', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem' }}>
                    <div><span style={{ color: '#64748b', display: 'block' }}>Cajas: <strong>{item.cajas}</strong> (x{item.piezasPorCaja})</span></div>
                    <div style={{ textAlign: 'right' }}><strong style={{ color: '#0f172a', display: 'block' }}>Sist: {item.cantidad}</strong>{item.sueltas > 0 && <span style={{ color: '#888', fontSize: '0.8rem' }}>(+{item.sueltas} sueltas)</span>}</div>
                  </div>
                  {lotesReportados.length > 0 && (<div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>Lotes: {lotesTotal}</div>)}
                  <button className={isExpanded ? "secondary" : (lotesReportados.length > 0 ? "primary" : "secondary" )} onClick={() => toggleRow(item.id)} style={{ width: '100%', margin: 0, padding: '10px', opacity: lotesReportados.length === 0 ? 0.7 : 1}}>
                    {isExpanded ? 'Ocultar lotes ▴' : `Mostrar ${lotesReportados.length} lotes ▾`}
                  </button>
                  {isExpanded && (
                    <div style={{ marginTop: '10px', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '5px' }}>
                      <h5 style={{ margin: '0 0 10px 0', color: '#334155' }}>📦 Detalles de Lotes</h5>
                      {lotesReportados.length > 0 ? (
                        lotesReportados.map((lote, idx) => (
                          <div key={lote.id_rep || idx} style={{ borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ color: '#0f172a' }}>{lote.id_lote}</strong><strong style={{ color: '#0369a1' }}>{lote.cant} pzs</strong></div>
                            <div style={{ color: '#64748b', marginTop: '4px' }}>📍 {lote.ubi} | Op: {lote.op}</div>
                          </div>
                        ))
                      ) : (<p style={{ margin: 0, color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin lotes.</p>)}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron productos.</p>
          )}
        </div>

      ) : (
        /* VISTA ESCRITORIO */
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>SKU</th><th>Nombre</th><th style={{ backgroundColor: '#f0f9ff', textAlign: 'center' }}>Cajas</th><th style={{ backgroundColor: '#f0f9ff', textAlign: 'center' }}>Pzs/Caja</th><th style={{ fontWeight: 'bold', textAlign: 'center' }}>Total</th><th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((item, index) => {
                  const isExpanded = expandedRows.includes(item.id);
                  const lotesReportados = reportes.filter(r => String(r.id_prod).trim() === String(item.id).trim());

                  return (
                    <React.Fragment key={`${item.id}-${index}`}>
                      <tr style={isExpanded ? { borderBottom: 'none', backgroundColor: '#f8fafc' } : {}}>
                        <td style={{ fontWeight: 'bold' }}>{item.id}</td>
                        <td>{item.name}</td>
                        <td style={{ textAlign: 'center', backgroundColor: '#f9fcff' }}>{item.cajas}</td>
                        <td style={{ textAlign: 'center', backgroundColor: '#f9fcff', color: '#666' }}>x {item.piezasPorCaja}</td>
                        <td style={{ fontWeight: 'bold', fontSize: '1.1em', textAlign: 'center' }}>
                          <div style={{ color: '#0f172a'}}>Sist: {item.cantidad}{(item.sueltas > 0) && (<span style={{ fontSize: '0.7em', color: '#888', fontWeight: 'normal', display: 'block' }}>(+{item.sueltas} sueltas)</span>)}</div>
                          {lotesReportados.length > 0 && (<div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #cbd5e1', color: '#10b981', fontSize: '0.9em' }}>Lote: {lotesReportados.reduce((acc, lote) => acc + (lote.cant || 0), 0)}</div>)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className={isExpanded ? "secondary" : (lotesReportados.length > 0 ? "primary" : "secondary" )} onClick={() => toggleRow(item.id)} style={{ padding: '6px 12px', fontSize: '0.9rem', opacity: lotesReportados.length === 0 ? 0.7 : 1}}>
                            {isExpanded ? 'Ocultar lotes ▴' : `Mostrar ${lotesReportados.length} lotes ▾`}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td colSpan="6" style={{ padding: '1rem', borderTop: 'none' }}>
                            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#334155' }}>📦 Detalles de Lotes</h4>
                              {lotesReportados.length > 0 ? (
                                <table style={{ fontSize: '0.9rem', margin: 0 }}>
                                  <thead><tr><th style={{ backgroundColor: '#e2e8f0' }}>Lote</th><th style={{ backgroundColor: '#e2e8f0' }}>Cant.</th><th style={{ backgroundColor: '#e2e8f0' }}>Ubicación</th><th style={{ backgroundColor: '#e2e8f0' }}>Caducidad</th></tr></thead>
                                  <tbody>
                                    {lotesReportados.map((lote, idx) => (
                                      <tr key={lote.id_rep || idx}>
                                        <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{lote.id_lote}</td><td style={{ textAlign: 'center', fontWeight: 'bold' }}>{lote.cant}</td><td>{lote.ubi}</td><td>{lote.cad ? new Date(lote.cad).toLocaleDateString() : 'N/A'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (<p style={{ margin: 0, color: '#64748b', fontStyle: 'italic' }}>Sin lotes.</p>)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron productos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Consulta;
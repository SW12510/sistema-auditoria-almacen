import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchMyReports } from '../api/mockApi';
import useIsMobile from '../hooks/useIsMobile';
import { useQuery } from '@tanstack/react-query'; 

const MisReportes = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 

  const { data: reports = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['misReportes', user?.name], 
    queryFn: async () => {
      const data = await fetchMyReports(user.name);
      return data;
    },
    enabled: !!user?.name, 
  });

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchText = (r.n_prod || '').toLowerCase().includes(lowerSearch) || 
                        (r.id_prod || '').toLowerCase().includes(lowerSearch) || 
                        (r.id_lote || r.lote || '').toLowerCase().includes(lowerSearch);
      
      let matchDate = true;
      if (r.fecha) {
        const logDateObj = new Date(r.fecha);
        const logDate = new Date(logDateObj.getFullYear(), logDateObj.getMonth(), logDateObj.getDate()).getTime();
        if (dateFrom) { const [y, m, d] = dateFrom.split('-'); if (logDate < new Date(y, m - 1, d).getTime()) matchDate = false; }
        if (dateTo) { const [y, m, d] = dateTo.split('-'); if (logDate > new Date(y, m - 1, d).getTime()) matchDate = false; }
      }
      return matchText && matchDate;
    });
  }, [reports, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando tus reportes... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>

      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Mis Reportes de Conteo</h1>

      {/* CONTROLES DE FILTRADO */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <input type="text" placeholder="🔍 Buscar producto, SKU o lote..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 2, margin: 0, minWidth: '200px' }} />
        <input type="date" title="Desde" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, margin: 0 }} />
        <input type="date" title="Hasta" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, margin: 0 }} />
        <button className="secondary" onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }} style={{ margin: 0 }}>Limpiar</button>
      </div>

      {/* BARRA DE CONTROLES DE PAGINACIÓN */}
      {filteredReports.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f1f5f9', padding: '10px 15px', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>Mostrar:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '5px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: 'white', margin: 0 }}
            >
              <option value={10}>10 reportes</option>
              <option value={20}>20 reportes</option>
              <option value={50}>50 reportes</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredReports.length)} de {filteredReports.length}
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
        
        /* 📱 VISTA MÓVIL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentItems.length > 0 ? (
            currentItems.map((report, idx) => {
              const isBaja = report.estado_lote === 'dado_de_baja';
              return (
                <div key={report.id_rep || idx} style={{ backgroundColor: isBaja ? '#f1f5f9' : 'white', opacity: isBaja ? 0.6 : 1, padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: '#0f172a' }}>Rep #{report.id_rep} {isBaja && <span style={{color: '#ef4444'}}>(Baja)</span>}</strong>
                    <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>📍 {report.ubi}</span>
                  </div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{report.n_prod}</h4>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>
                    SKU: {report.id_prod} | Lote: <strong>{report.id_lote || report.lote}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <small style={{ color: '#94a3b8' }}>{report.fecha ? new Date(report.fecha).toLocaleDateString() : 'N/A'}</small>
                    <strong style={{ fontSize: '1.2rem', color: '#0369a1' }}>{report.cant} pzs</strong>
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No se encontraron reportes con los filtros actuales.</p>
          )}
        </div>

      ) : (

        /* 💻 VISTA ESCRITORIO */
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>ID Reporte</th><th>Fecha</th><th>Producto</th><th>Lote</th><th>Ubicación</th><th style={{ backgroundColor: '#f0f9ff' }}>Cantidad</th></tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((report, idx) => {
                  const isBaja = report.estado_lote === 'dado_de_baja';
                  return (
                  <tr key={report.id_rep || idx} style={{ opacity: isBaja ? 0.4 : 1, backgroundColor: isBaja ? '#f1f5f9' : 'transparent' }}>
                    <td style={{ fontWeight: 'bold' }}>{report.id_rep}{isBaja && <div style={{color: '#ef4444', fontSize: '0.8em'}}>Baja</div>}</td>
                    <td style={{ color: '#64748b' }}>{report.fecha ? new Date(report.fecha).toLocaleString() : 'N/A'}</td>
                    <td>{report.n_prod} <br/><small style={{color: '#94a3b8'}}>{report.id_prod}</small></td>
                    <td>{report.id_lote || report.lote}</td>
                    <td><span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem'}}>📍 {report.ubi}</span></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', backgroundColor: '#f9fcff' }}>{report.cant}</td>
                  </tr>
                )})
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron reportes con los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MisReportes;
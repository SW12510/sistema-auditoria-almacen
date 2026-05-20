import React, { useState, useMemo, useEffect } from 'react';
import { fetchAllReports } from '../../api/mockApi';
import useIsMobile from '../../hooks/useIsMobile';
import { useQuery } from '@tanstack/react-query';

const SupReportes = () => {
  const isMobile = useIsMobile();

  const [searchOp, setSearchOp] = useState('');
  const [searchProd, setSearchProd] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: reports = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['supAllReports'], 
    queryFn: async () => {
      const data = await fetchAllReports();
      return data;
    }
  });

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchOp = (r.op || '').toLowerCase().includes(searchOp.toLowerCase());
      const lowerProd = searchProd.toLowerCase();
      const matchProd = (r.n_prod || '').toLowerCase().includes(lowerProd) || 
                        (r.id_prod || '').toLowerCase().includes(lowerProd) || 
                        (r.id_lote || '').toLowerCase().includes(lowerProd);
      
      let matchDate = true;
      if (r.fecha) {
        const logDateObj = new Date(r.fecha);
        const logDate = new Date(logDateObj.getFullYear(), logDateObj.getMonth(), logDateObj.getDate()).getTime();
        if (dateFrom) { const [y, m, d] = dateFrom.split('-'); if (logDate < new Date(y, m - 1, d).getTime()) matchDate = false; }
        if (dateTo) { const [y, m, d] = dateTo.split('-'); if (logDate > new Date(y, m - 1, d).getTime()) matchDate = false; }
      }
      return matchOp && matchProd && matchDate;
    });
  }, [reports, searchOp, searchProd, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchOp, searchProd, dateFrom, dateTo]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando reportes globales... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Todos los Reportes de Conteo</h1>
      
      {/* CONTROLES DE FILTRADO */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <input type="text" placeholder="👤 Filtrar Operador..." value={searchOp} onChange={e => setSearchOp(e.target.value)} style={{ flex: 1, margin: 0, minWidth: '150px' }} />
        <input type="text" placeholder="🔍 Producto, SKU o Lote..." value={searchProd} onChange={e => setSearchProd(e.target.value)} style={{ flex: 2, margin: 0, minWidth: '200px' }} />
        <input type="date" title="Desde" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, margin: 0 }} />
        <input type="date" title="Hasta" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, margin: 0 }} />
        <button className="secondary" onClick={() => { setSearchOp(''); setSearchProd(''); setDateFrom(''); setDateTo(''); }} style={{ margin: 0 }}>Limpiar</button>
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
              <option value={100}>100 reportes</option>
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

      {filteredReports.length === 0 ? (
        <p style={{textAlign:'center', color: '#64748b', padding: '2rem'}}>No hay reportes que coincidan con la búsqueda.</p>
      ) : isMobile ? (

        /* 📱 VISTA MÓVIL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentItems.map((report, index) => {
            const isBaja = report.estado_lote === 'dado_de_baja';
            return (
              <div key={report.id_rep || index} style={{ backgroundColor: isBaja ? '#f1f5f9' : 'white', opacity: isBaja ? 0.6 : 1, padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: '#0f172a' }}>Rep #{report.id_rep} {isBaja && <span style={{color: '#ef4444'}}>(Baja)</span>}</strong>
                  <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>👤 {report.op}</span>
                </div>
                <h4 style={{ margin: '0 0 5px 0' }}>{report.n_prod}</h4>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>
                  Lote: <strong>{report.id_lote}</strong> | Ubi: {report.ubi}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: '#94a3b8' }}>{report.fecha ? new Date(report.fecha).toLocaleDateString() : 'N/A'}</small>
                  <strong style={{ fontSize: '1.2rem', color: '#0369a1' }}>{report.cant} pzs</strong>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* 💻 VISTA ESCRITORIO */
        <div className='table-responsive'>
          <table>
            <thead>
              <tr><th>ID Reporte</th><th>Operador</th><th>Fecha</th><th>Producto</th><th>ID Producto</th><th>Lote</th><th>Caducidad</th><th>Ubicacion</th><th style={{ backgroundColor: '#f0f9ff' }}>Cant. Contada</th></tr>
            </thead>
            <tbody>
              {/* OJO: Iteramos sobre currentItems */}
              {currentItems.map((report, index) => {
                const isBaja = report.estado_lote === 'dado_de_baja';
                return (
                <tr key={report.id_rep || index} style={{ opacity: isBaja ? 0.4 : 1, backgroundColor: isBaja ? '#f1f5f9' : 'transparent' }}>
                  <td>{report.id_rep} {isBaja && <span style={{display:'block', color: 'red', fontSize:'0.75rem'}}>Baja</span>}</td>
                  <td style={{ fontWeight: 'bold'}}>{report.op}</td>
                  <td>{report.fecha ? new Date(report.fecha).toLocaleString() : 'N/A'}</td>
                  <td>{report.n_prod}</td>
                  <td>{report.id_prod}</td>
                  <td>{report.id_lote}</td>
                  <td>{report.cad ? new Date(report.cad).toLocaleString() : 'N/A'}</td>
                  <td><span style={{backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem'}}>📍 {report.ubi}</span></td>
                  <td style={{ textAlign:'center', fontWeight:'bold', fontSize:'1.1em', backgroundColor:'#f9fcff'}}>{report.cant}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SupReportes;
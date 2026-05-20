import React, { useState, useMemo, useEffect } from 'react';
import { fetchLogs } from '../../api/mockApi';
import useIsMobile from '../../hooks/useIsMobile';
import { useQuery } from '@tanstack/react-query';

const AdminLogs = () => {
  const isMobile = useIsMobile();
  
  const [filterUser, setFilterUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: logs = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['adminLogs'], 
    queryFn: async () => {
      const data = await fetchLogs();
      return data;
    }
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const username = String(log.user || '').toLowerCase();
      const matchUser = filterUser === '' || username.includes(filterUser.toLowerCase());
 
      let matchDate = true;
      if (log.timestamp) {
        const logDateObj = new Date(log.timestamp);
        const logDate = new Date(logDateObj.getFullYear(), logDateObj.getMonth(), logDateObj.getDate()).getTime();
        if (startDate) {
          const [y, m, d] = startDate.split('-');
          if (logDate < new Date(y, m - 1, d).getTime()) matchDate = false;
        }
        if (endDate) {
          const [y, m, d] = endDate.split('-');
          if (logDate > new Date(y, m - 1, d).getTime()) matchDate = false;
        }
      }
      return matchUser && matchDate;
    });
  }, [logs, filterUser, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterUser, startDate, endDate]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando bitácora del sistema... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Logs de Auditoría del Sistema</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Historial de todos los movimientos y sesiones del sistema.</p>

      {/* CONTROLES DE FILTRADO */}
      <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Filtrar por Usuario:</label>
          <input type="text" placeholder="Ej: admin..." value={filterUser} onChange={(e) => setFilterUser(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Desde:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Hasta:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="secondary" onClick={() => { setFilterUser(''); setStartDate(''); setEndDate(''); }} style={{ height: '42px', padding: '0 20px', width: isMobile ? '100%' : 'auto' }}>
          Limpiar Filtros
        </button>
      </div>

      {/* BARRA DE CONTROLES DE PAGINACIÓN */}
      {filteredLogs.length > 0 && (
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
              Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredLogs.length)} de {filteredLogs.length}
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
            currentItems.map((log, idx) => (
              <div key={log.id || idx} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ color: '#94a3b8' }}>#{log.id}</strong>
                  <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    👤 {log.user}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#0f172a', fontWeight: 'bold' }}>
                  {log.action}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: '#64748b' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</small>
                  <span style={{ backgroundColor: '#f3f4f6', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize:'0.75em', textTransform: 'capitalize' }}>
                    {log.role || 'N/A'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No se encontraron registros.</p>
          )}
        </div>

      ) : (

        /* 💻 VISTA ESCRITORIO */
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha y Hora</th>
                <th>Rol</th>
                <th>Usuario</th>
                <th>Acción Realizada</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td style={{ color: '#94a3b8', fontWeight: 'bold' }}>#{log.id}</td>
                    <td style={{ color: '#334155' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                    <td>
                      <span style={{ backgroundColor: '#f3f4f6', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize:'0.85em', textTransform: 'capitalize' }}>
                        {log.role || 'N/A'}
                      </span>
                    </td>
                    <td><span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>👤 {log.user}</span></td>
                    <td>{log.action}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No se encontraron registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      )}
    </div>
  );
};

export default AdminLogs;
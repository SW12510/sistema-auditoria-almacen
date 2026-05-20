import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchMyTasks, updateTaskStatus, fetchSolicitudesBajaPendientes, resolverSolicitudBaja, registrarLog } from '../api/mockApi';
import useIsMobile from '../hooks/useIsMobile';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
const Dashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [currentPageTareas, setCurrentPageTareas] = useState(1);
  const [currentPageSols, setCurrentPageSols] = useState(1);
  const itemsPerPage = 5; 

  const { data: tareas = [], isLoading: loadingTareas, isFetching: fetchingTareas } = useQuery({
    queryKey: ['dashboardTareas', user?.id],
    queryFn: async () => await fetchMyTasks(user.id),
    enabled: !!user?.id && (user.role === 'operador' || user.role === 'super_operador'),
  });

  const { data: solicitudesBaja = [], isLoading: loadingSols, isFetching: fetchingSols } = useQuery({
    queryKey: ['dashboardSolicitudes'],
    queryFn: async () => await fetchSolicitudesBajaPendientes(),
    enabled: !!user?.id && (user.role === 'supervisor' || user.role === 'admin'),
  });

  const isLoading = loadingTareas || loadingSols;
  const isFetching = fetchingTareas || fetchingSols;

  // --- Lógica del Operador (Tareas) ---
  const handleCompletar = async (idTarea) => {
    if(window.confirm("¿Confirmas que has terminado esta actividad?")) {
      await updateTaskStatus(idTarea, 'completada');
      queryClient.invalidateQueries(['dashboardTareas']); 
    }
  };

  // --- Lógica del Supervisor (Aprobaciones) ---
  const handleResolverSolicitud = async (solicitud, accion) => {
    const palabra = accion === 'aprobada' ? 'APROBAR' : 'RECHAZAR';
    if(window.confirm(`¿Estás seguro de que deseas ${palabra} la solicitud de baja del lote ${solicitud.id_lote}?`)){
        await resolverSolicitudBaja(solicitud.id_solicitud, accion, user.name);
        await registrarLog(user.name, user.role, `${accion === 'aprobada' ? 'Aprobó' : 'Rechazó'} la solicitud de baja del lote ${solicitud.id_lote} hecha por ${solicitud.nombre_operador}`);
        queryClient.invalidateQueries(['dashboardSolicitudes']); 
    }
  };

  const indexOfLastTarea = currentPageTareas * itemsPerPage;
  const indexOfFirstTarea = indexOfLastTarea - itemsPerPage;
  const currentTareas = tareas.slice(indexOfFirstTarea, indexOfLastTarea);
  const totalPagesTareas = Math.ceil(tareas.length / itemsPerPage);

  const indexOfLastSol = currentPageSols * itemsPerPage;
  const indexOfFirstSol = indexOfLastSol - itemsPerPage;
  const currentSols = solicitudesBaja.slice(indexOfFirstSol, indexOfLastSol);
  const totalPagesSols = Math.ceil(solicitudesBaja.length / itemsPerPage);

  if (isLoading) {
    return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando tu panel principal... ⏳</h2></div>;
  }

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          🔄 Sincronizando panel...
        </div>
      )}

      <h1>¡Bienvenido, {user?.name}!</h1>
      <p>Has iniciado sesión como: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{user?.role.replace('_', ' ')}</span>.</p>
 
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
 
        {/* ========================================================= */}
        {/* PANEL DEL OPERADOR */}
        {/* ========================================================= */}
        {(user?.role === 'operador' || user?.role === 'super_operador') && (
          <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#0f172a', margin: 0 }}>📋 Mis Tareas Pendientes</h2>
              <span style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>
                {tareas.length} total
              </span>
            </div>

            {tareas.length === 0 ? (
              <p style={{ color: '#10b981', fontWeight: 'bold' }}>✅ No tienes tareas pendientes.</p>
            ) : (
              <>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {currentTareas.map(t => (
                    <li key={t.id_tarea} style={{ backgroundColor: 'white', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '5px', marginBottom: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ margin: '0 0 5px 0' }}>{t.descripcion}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <small style={{ color: '#64748b' }}>Estado: <strong style={{ color: t.estado === 'completada' ? '#10b981' : '#f59e0b', textTransform: 'capitalize' }}>{t.estado}</strong></small>
                        {t.estado === 'pendiente' ? (
                          <button onClick={() => handleCompletar(t.id_tarea)} className="primary" style={{ padding: '6px 10px', margin: 0 }}>✔️ Listo</button>
                        ) : (
                          <span style={{ color: '#10b981', fontSize: '0.85rem' }}>Esperando revisión...</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Controles de Paginación Tareas */}
                {totalPagesTareas > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                    <button onClick={() => setCurrentPageTareas(p => Math.max(p - 1, 1))} disabled={currentPageTareas === 1} style={{ padding: '4px 8px', fontSize: '0.85rem', opacity: currentPageTareas === 1 ? 0.5 : 1 }}>◀ Ant</button>
                    <small style={{ color: '#64748b' }}>Pág {currentPageTareas} de {totalPagesTareas}</small>
                    <button onClick={() => setCurrentPageTareas(p => Math.min(p + 1, totalPagesTareas))} disabled={currentPageTareas === totalPagesTareas} style={{ padding: '4px 8px', fontSize: '0.85rem', opacity: currentPageTareas === totalPagesTareas ? 0.5 : 1 }}>Sig ▶</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PANEL DEL SUPERVISOR (Buzón de Aprobaciones) */}
        {/* ========================================================= */}
        {(user?.role === 'supervisor' || user?.role === 'admin') && (
          <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#fff7ed', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fed7aa' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ color: '#c2410c', margin: 0 }}>🔔 Autorizaciones</h2>
                <p style={{ color: '#9a3412', fontSize: '0.9rem', margin: '5px 0 0 0' }}>Buzón de baja de lotes.</p>
              </div>
              {solicitudesBaja.length > 0 && (
                <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {solicitudesBaja.length} nuevas
                </span>
              )}
            </div>

            {solicitudesBaja.length === 0 ? (
              <div style={{ backgroundColor: '#dcfce7', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginTop: '1rem' }}>
                <p style={{ color: '#16a34a', fontWeight: 'bold', margin: 0, fontSize: '1.1rem' }}>✅ El buzón está limpio.</p>
                <small style={{ color: '#15803d' }}>No hay solicitudes pendientes.</small>
              </div>
            ) : (
              <>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {currentSols.map(sol => (
                    <li key={sol.id_solicitud} style={{ backgroundColor: 'white', padding: '1rem', border: '1px solid #fdba74', borderRadius: '5px', marginBottom: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ margin: '0 0 5px 0', color: '#991b1b' }}>Baja de Lote: {sol.id_lote}</h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569' }}>
                        <strong>Producto:</strong> {sol.n_prod} <br/>
                        <strong>Cantidad:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{sol.cantidad} pzs</span> <br/>
                        <strong>Motivo:</strong> {sol.motivo} <br/>
                        <strong>Solicita:</strong> {sol.nombre_operador}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleResolverSolicitud(sol, 'aprobada')} style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Aprobar</button>
                        <button onClick={() => handleResolverSolicitud(sol, 'rechazada')} style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Rechazar</button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Controles de Paginación Buzón */}
                {totalPagesSols > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #fed7aa' }}>
                    <button onClick={() => setCurrentPageSols(p => Math.max(p - 1, 1))} disabled={currentPageSols === 1} style={{ padding: '4px 8px', fontSize: '0.85rem', opacity: currentPageSols === 1 ? 0.5 : 1, backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}>◀ Ant</button>
                    <small style={{ color: '#9a3412', fontWeight: 'bold' }}>Pág {currentPageSols} de {totalPagesSols}</small>
                    <button onClick={() => setCurrentPageSols(p => Math.min(p + 1, totalPagesSols))} disabled={currentPageSols === totalPagesSols} style={{ padding: '4px 8px', fontSize: '0.85rem', opacity: currentPageSols === totalPagesSols ? 0.5 : 1, backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' }}>Sig ▶</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
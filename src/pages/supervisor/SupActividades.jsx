import React, { useState } from 'react';
import { fetchTasks, assignTask, updateTaskStatus, fetchUsers } from '../../api/mockApi';
import useIsMobile from '../../hooks/useIsMobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const SupActividades = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient(); 
  const [newTask, setNewTask] = useState({ task: '', assignedToId: '', assignedToName: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['supTasks'],
    queryFn: async () => {
      const [dataTasks, dataUsers] = await Promise.all([
        fetchTasks(),
        fetchUsers()
      ]);
      const ops = dataUsers.filter(u => u.role === 'operador' || u.role === 'super_operador');
      return { tasks: dataTasks, operadores: ops };
    }
  });

  const tasks = data?.tasks || [];
  const operadores = data?.operadores || [];

  const handleIdChange = (e) => {
    const idValue = e.target.value;
    const operadorEncontrado = operadores.find(op => String(op.id) === idValue);
    
    setNewTask(prev => ({
      ...prev,
      assignedToId: idValue,
      assignedToName: operadorEncontrado ? operadorEncontrado.name : prev.assignedToName
    }));
  };

  const handleNameChange = (e) => {
    const nameValue = e.target.value;
    const operadorEncontrado = operadores.find(op => op.name.toLowerCase() === nameValue.toLowerCase());

    setNewTask(prev => ({
      ...prev,
      assignedToName: nameValue,
      assignedToId: operadorEncontrado ? String(operadorEncontrado.id) : prev.assignedToId
    }));
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    await assignTask(newTask);
    setNewTask({ task: '', assignedToId: '', assignedToName: '' });
    
    queryClient.invalidateQueries(['supTasks']); 
  };

  const handleLiberar = async (idTarea) => {
    if(window.confirm("¿Has verificado físicamente el trabajo? Al liberar la tarea se dará por finalizada y desaparecerá del dashboard del operador.")) {
      await updateTaskStatus(idTarea, 'liberada');
      queryClient.invalidateQueries(['supTasks']); 
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = tasks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(tasks.length / itemsPerPage);

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{textAlign: 'center', marginTop: '3rem'}}><h2>Cargando tareas... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Actividades de Operadores</h1>
 
      <datalist id="listaIDs">
        {operadores.map(op => <option key={`id-${op.id}`} value={op.id} />)}
      </datalist>
      <datalist id="listaNombres">
        {operadores.map(op => <option key={`name-${op.id}`} value={op.name} />)}
      </datalist>

      {/* FORMULARIO ASIGNACIÓN */}
      <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#0369a1' }}>Asignar Nueva Tarea</h3>
        <form onSubmit={handleAssign} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Descripción de la tarea (Ej: Contar pasillo B)" 
            value={newTask.task} 
            onChange={(e) => setNewTask(p => ({ ...p, task: e.target.value }))} 
            required 
            style={{ flex: 2, minWidth: '250px' }} 
          />
          <input 
            type="number" 
            list="listaIDs" 
            placeholder="ID Operador" 
            value={newTask.assignedToId} 
            onChange={handleIdChange} 
            required 
            style={{ flex: 1 }} 
          />
          <input 
            type="text" 
            list="listaNombres" 
            placeholder="Nombre Operador" 
            value={newTask.assignedToName} 
            onChange={handleNameChange} 
            required 
            style={{ flex: 1 }} 
          />
          <button type="submit" className="primary" style={{ height: '42px', width: isMobile ? '100%' : 'auto' }}>Crear Tarea</button>
        </form>
      </div>

      <h3 style={{ marginTop: '2rem' }}>Control de Tareas ({tasks.length} en total)</h3>

      {/* BARRA DE CONTROLES DE PAGINACIÓN */}
      {tasks.length > 0 && (
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
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, tasks.length)}
            </span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', margin: 0, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Ant</button>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '6px 12px', margin: 0, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Sig ▶</button>
            </div>
          </div>
        </div>
      )}
      
      {isMobile ? (
        
        /* 📱 VISTA MÓVIL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentItems.length > 0 ? (
            currentItems.map(task => (
              <div key={task.id_tarea} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{task.descripcion}</p>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: task.estado === 'pendiente' ? '#fee2e2' : (task.estado === 'completada' ? '#fef3c7' : '#d1fae5'), color: task.estado === 'pendiente' ? '#991b1b' : (task.estado === 'completada' ? '#92400e' : '#065f46') }}>
                    {task.estado}
                  </span>
                </div>
                <p style={{ margin: '0 0 15px 0', color: '#64748b' }}>Asignado a: <strong>{task.nombre_operador}</strong></p>
                
                {task.estado === 'completada' && (
                  <button onClick={() => handleLiberar(task.id_tarea)} style={{ width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold' }}>
                    ✅ Liberar Actividad
                  </button>
                )}
              </div>
            ))
          ) : (
             <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No hay tareas registradas.</p>
          )}
        </div>

      ) : (

        /* 💻 VISTA ESCRITORIO */
        <div className="table-responsive">
          <table>
            <thead><tr><th>ID</th><th>Descripción</th><th>Asignada a</th><th>Estado</th><th style={{ textAlign: 'center' }}>Acción de Supervisión</th></tr></thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map(task => (
                  <tr key={task.id_tarea}>
                    <td>{task.id_tarea}</td>
                    <td>{task.descripcion}</td>
                    <td><strong>{task.nombre_operador}</strong> <small>(ID: {task.id_operador})</small></td>
                    <td>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 'bold', textTransform: 'capitalize', backgroundColor: task.estado === 'pendiente' ? '#fee2e2' : (task.estado === 'completada' ? '#fef3c7' : '#d1fae5'), color: task.estado === 'pendiente' ? '#991b1b' : (task.estado === 'completada' ? '#92400e' : '#065f46') }}>
                        {task.estado === 'completada' ? '⚠️ Esperando Revisión' : task.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {task.estado === 'completada' && (
                        <button onClick={() => handleLiberar(task.id_tarea)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                          ✅ Liberar
                        </button>
                      )}
                      {task.estado === 'liberada' && <span style={{ color: '#64748b' }}>Cerrada</span>}
                      {task.estado === 'pendiente' && <span style={{ color: '#64748b' }}>En progreso...</span>}
                    </td>
                  </tr>
                ))
              ) : (
                 <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No hay tareas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SupActividades;
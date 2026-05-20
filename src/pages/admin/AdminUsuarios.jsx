import React, { useState, useMemo, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../api/mockApi';
import useIsMobile from '../../hooks/useIsMobile';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 

const AdminUsuarios = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient(); 

  const [form, setForm] = useState({ username: '', name: '', role: 'operador', password: '' });
  const [editingUser, setEditingUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: users = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['adminUsers'], 
    queryFn: async () => {
      const data = await fetchUsers();
      return data;
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser.id, form);
        alert("✅ Usuario actualizado correctamente");
        setEditingUser(null);
      } else {
        await createUser(form);
        alert("✅ Usuario creado exitosamente");
      }
      setForm({ username: '', name: '', role: 'operador', password: '' });
      queryClient.invalidateQueries(['adminUsers']); 
    } catch (error) { alert("❌ Error al guardar usuario"); }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setForm({ username: user.username, name: user.name, role: user.role, password: '' });
    if(isMobile) window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleDeleteClick = async (id) => {
    if(window.confirm("¿Seguro que deseas eliminar este usuario?")) {
      try { 
        await deleteUser(id); 
        queryClient.invalidateQueries(['adminUsers']); 
      } 
      catch (error) { alert("❌ Error al eliminar usuario"); }
    }
  };

  // FILTRADO EN MEMORIA
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchText = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === '' || u.role === roleFilter;
      return matchText && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // MANEJO DE ERRORES Y CARGA INICIAL
  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando usuarios... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Administración de Usuarios</h1>

      {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
      <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>{editingUser ? '✏️ Editar Usuario' : '➕ Crear Nuevo Usuario'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label>Usuario (Login)</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label>Nombre Completo</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label>Contraseña</label>
            <input type="password" placeholder={editingUser ? '(Dejar en blanco para mantener)' : ''} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editingUser} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label>Rol de Acceso</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="operador">Operador</option>
              <option value="super_operador">Súper Operador</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
            <button type="submit" className="primary" style={{ flex: 1, height: '42px' }}>{editingUser ? 'Actualizar' : 'Crear'}</button>
            {editingUser && <button type="button" className="secondary" onClick={() => { setEditingUser(null); setForm({ username: '', name: '', role: 'operador', password: '' }); }} style={{ flex: 1, height: '42px' }}>Cancelar</button>}
          </div>
        </form>
      </div>

      {/* CONTROLES DE BÚSQUEDA */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="🔍 Buscar nombre o usuario..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 2, margin: 0, minWidth: '150px' }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ flex: 1, margin: 0, minWidth: '150px' }}>
          <option value="">Todos los Roles</option>
          <option value="admin">Administradores</option>
          <option value="supervisor">Supervisores</option>
          <option value="super_operador">Súper Operadores</option>
          <option value="operador">Operadores</option>
        </select>
      </div>

      {/* BARRA DE CONTROLES DE PAGINACIÓN */}
      {filteredUsers.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f1f5f9', padding: '10px 15px', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>Mostrar:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '5px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: 'white', margin: 0 }}
            >
              <option value={10}>10 usuarios</option>
              <option value={20}>20 usuarios</option>
              <option value={50}>50 usuarios</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} de {filteredUsers.length}
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
            currentItems.map(user => (
              <div key={user.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{user.name}</strong>
                  <span style={{ backgroundColor: user.role === 'admin' ? '#fee2e2' : (user.role === 'supervisor' ? '#fef3c7' : '#e0e7ff'), color: user.role === 'admin' ? '#991b1b' : (user.role === 'supervisor' ? '#92400e' : '#3730a3'), padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                    {user.role}
                  </span>
                </div>
                <p style={{ margin: '0 0 15px 0', color: '#64748b' }}>Usuario: <strong>{user.username}</strong> | ID: {user.id}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="primary" onClick={() => handleEditClick(user)} style={{ flex: 1, margin: 0, padding: '10px' }}>✏️ Editar</button>
                  <button onClick={() => handleDeleteClick(user.id)} style={{ flex: 1, margin: 0, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px' }}>🗑️ Borrar</button>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No se encontraron usuarios.</p>
          )}
        </div>

      ) : (

        /* 💻 VISTA ESCRITORIO */
        <div className="table-responsive">
          <table>
            <thead><tr><th>ID</th><th>Usuario</th><th>Nombre</th><th>Rol</th><th style={{ textAlign: 'center' }}>Acciones</th></tr></thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 'bold' }}>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.name}</td>
                    <td>
                      <span style={{ backgroundColor: user.role === 'admin' ? '#fee2e2' : (user.role === 'supervisor' ? '#fef3c7' : '#e0e7ff'), color: user.role === 'admin' ? '#991b1b' : (user.role === 'supervisor' ? '#92400e' : '#3730a3'), padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="primary" onClick={() => handleEditClick(user)} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>✏️ Editar</button>
                      <button onClick={() => handleDeleteClick(user.id)} style={{ marginLeft: '8px', background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: '0.9rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Eliminar</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No se encontraron usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      )}
    </div>
  );
};

export default AdminUsuarios;
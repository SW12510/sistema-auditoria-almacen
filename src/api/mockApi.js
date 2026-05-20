// src/api/mockApi.js

// --- Funciones de Login ---

export const login = async (username, password) => {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error de autenticación');
    
    const u = data.user;
    
    return {
        id: u.id || u.ID,
        username: u.username || u.USERNAME,
        name: u.name || u.NAME || u.nombre || u.NOMBRE,
        role: u.role || u.ROLE || u.rol || u.ROL
    };
    
  } catch (error) {
    throw error;
  }
};


// --- API de Operador ---

export const fetchInventoryForConsult = async () => {
  try{
    const response = await fetch('/api/inventario');

    if (!response.ok){
      throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const inventarioMapeado = data.map(item => {
      const ppc = Number(item.cant) || 1;
      const te = Number(item.existencia) || 0;
      
      const cc = Math.floor(te / ppc);
      const sc = te % ppc;
      
      return{
        id: item.cve_lar,
        name: item.des1,
        cajas: cc,
        piezasPorCaja: ppc,
        cantidad: te,
        sueltas: sc
      };
    });

    return inventarioMapeado;

  } catch (error){
    console.error("Error en Fetch inventory: ", error);
    return[];
  }
};

export const submitCountReport = async (reportData) => {
  try {
    const response = await fetch('/api/reportes', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) throw new Error('Error en servidor al guardar reporte');
    
    return await response.json();
  } catch (error) {
    console.error("Error submitCountReport:", error);
    throw error;
  }
};

export const fetchMyTasks = async (userId) => {
    const res = await fetch(`/api/tareas/mis-tareas/${userId}`);
    return await res.json();
};

export const registrarSalidaLote = async (datosSalida) => {
    const res = await fetch('/api/salidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosSalida)
    });
    if (!res.ok) throw new Error("Error al registrar la salida");
    return await res.json();
};

export const fetchLogSalidas = async () => {
    const res = await fetch('/api/salidas');
    return await res.json();
};

export const fetchLotesDisponibles = async () => {
    try {
        const res = await fetch('/api/lotes-disponibles');
        if (!res.ok) throw new Error("Error al cargar los lotes");
        return await res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

// --- API de Super Operador ---



export const modificarLote = async (id_rep, nuevaData) => {
    const res = await fetch(`/api/reportes/modificar/${id_rep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaData)
    });
    if(!res.ok) throw new Error("Error al modificar");
    return await res.json();
};

export const registrarVentaLotes = async (datosVenta) => {
    const res = await fetch('/api/salidas/venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosVenta)
    });
    if (!res.ok) throw new Error("Error al registrar la venta");
    return await res.json();
};



// --- API de Supervisor ---

export const fetchExpiringSoon = async (dias = 90) => { 
    try {
        const response = await fetch(`/api/reportes/proximos-a-caducar?dias=${dias}`);
        if (!response.ok) throw new Error('Error al obtener caducidades');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const fetchTasks = async () => {
    const res = await fetch('/api/tareas');
    return await res.json();
};

export const assignTask = async (taskData) => {
    await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            descripcion: taskData.task,
            id_operador: taskData.assignedToId,
            nombre_operador: taskData.assignedToName
        })
    });
};

export const updateTaskStatus = async (taskId, nuevoEstado) => {
    await fetch(`/api/tareas/${taskId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
    });
};


export const fetchAllReports = async () => {
  try {
    const response = await fetch('/api/todos-los-reportes');

    if (!response.ok) {
      throw new Error('Error al conectar con el servidor')
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error en fetchAllReports: ", error);
    return[];
  }
};

export const fetchMyReports = async (userName) => {
  try {
    const response = await fetch(`/api/reportes/mis-reportes/${encodeURIComponent(userName)}`);
    if (!response.ok) throw new Error('Error al cargar mis reportes');
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

export const crearSolicitudBaja = async (datos) => {
    const res = await fetch('/api/solicitudes-baja', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
    if (!res.ok) throw new Error("Error al crear solicitud");
};

export const fetchSolicitudesBajaPendientes = async () => {
    const res = await fetch('/api/solicitudes-baja/pendientes');
    return await res.json();
};

export const resolverSolicitudBaja = async (id, accion, supervisorNombre) => {
    await fetch(`/api/solicitudes-baja/${id}/resolver`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion, supervisor: supervisorNombre }) });
};

// --- API de Admin ---

export const fetchLogs = async () => {
    try{
        const response = await fetch('/api/logs');
        if (!response.ok) throw new Error('Error al obtener los logs');
        return await response.json();
    } catch (error) {
        console.error(error);
        return[];
    }
};

export const fetchUsers = async () => {
    try {
        const response = await fetch('/api/usuarios');
        if (!response.ok) throw new Error('Error al cargar usuarios');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const updateUser = async (userId, userData) => {
    try {
        const response = await fetch(`/api/usuarios/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userData.username,
                password: userData.password,
                name: userData.name,
                role: userData.role
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error al actualizar el usuario');
        }
        
        return data;
    } catch (error) {
        throw error;
    }
};

export const deleteUser = async (userId) => {
    try {
        const response = await fetch(`/api/usuarios/${userId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    } catch (error) {
        throw error;
    }
};

export const createUser = async (userData) => {
    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: userData.username, 
                password: userData.password, 
                name: userData.name, 
                role: userData.role 
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    } catch (error) {
        throw error;
    }
};

export const registrarLog = async (usuario, rol, accion) => {
    try {
        await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, rol, accion })
        });
    } catch (error) { console.error("Error al registrar log", error); }
};

export const crearUbicacion = async (nombre) => {
    const res = await fetch('/api/ubicaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre })
    });
    if (!res.ok) throw new Error("La ubicación ya existe o hubo un error.");
    return await res.json();
};

export const fetchUbicaciones = async () => {
    const res = await fetch('/api/ubicaciones');
    return await res.json();
};

export const fetchUbicacionesDisponibles = async () => {
    const res = await fetch('/api/ubicaciones/disponibles');
    return await res.json();
};

export const eliminarUbicacion = async (id_ubicacion) => {
    const res = await fetch(`/api/ubicaciones/${id_ubicacion}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar la ubicación");
    return data;
};
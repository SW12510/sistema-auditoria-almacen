const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https')
const path = require('path');
const app = express();
const PORT = 5000;
const { getConnection1, getConnection2 } = require('./db');
const { error } = require('console');
const { pool } = require('mssql');
const sql = require('mssql');

app.use(cors());
app.use(express.json());

const reportsPath = path.join(__dirname, '../public/reports.csv');

const initializeReportsFile = () => {
    if (!fs.existsSync(reportsPath)) {
        const header = "ID_REPORTE,ID_PRODUCTO,NOMBRE,UBICACION,ID_LOTE,CADUCIDAD,CANTIDAD_CONTADA,OPERADOR,FECHA_HORA\n";
        fs.writeFileSync(reportsPath, header, 'utf8');
        console.log("📝 Archivo reports.csv creado con columna de Lote.");
    }
};

initializeReportsFile();

app.post('/api/reportes', async (req, res) => {
    const { productId, productName, ubicacion, lote, caducidad, cantidadContada, operatorName, op } = req.body;
    
    const nombreOperador = op || operatorName || 'Operador Desconocido';

    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();

        const result = await pool.request()
            .input('id_prod', sql.VarChar(50), productId)
            .input('n_prod', sql.VarChar(255), productName)
            .input('ubi', sql.VarChar(100), ubicacion)
            .input('lote', sql.VarChar(50), lote)
            .input('cad', sql.Date, caducidad) 
            .input('cant', sql.Int, cantidadContada)
            .input('op', sql.VarChar(100), nombreOperador)
            .query(`
                INSERT INTO reportes
                (id_prod, n_prod, ubi, id_lote, cad, cant, op)
                VALUES
                (@id_prod, @n_prod, @ubi, @lote, @cad, @cant, @op);

                -- Retornamos el ID recién creado
                SELECT SCOPE_IDENTITY() AS id_rep;
            `);
            
        let insertadoId = null;
        if (result.recordset && result.recordset.length > 0) {
            insertadoId = result.recordset[0].id_rep;
        }

        console.log(`✅ Reporte #${insertadoId} guardado exitosamente por ${nombreOperador}`);
        res.json({ success: true, message: 'Reporte guardado con éxito', reportId: insertadoId });

    } catch(err) { 
        console.error("❌ Error al insertar el reporte:", err);
        res.status(500).json({ success: false, message: 'Error interno de base de datos al guardar' });
    }
});

// OBTENER MIS REPORTES por nombre de operador
app.get('/api/reportes/mis-reportes/:userName', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        
        const result = await pool.request()
            .input('userName', sql.VarChar(100), req.params.userName)
            .query(`
                SELECT * FROM reportes 
                WHERE op = @userName 
                ORDER BY fecha DESC
            `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error("Error al consultar mis reportes:", err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/inventario', async (req, res) => {
    try {
        const {getConnection1} = require('./db');
        const pool = await getConnection1();

        const result = await pool.request().query(`
            SELECT 
                cve_lar,
                des1,
                cant,
                existencia
            FROM inventario
        `);
        res.json(result.recordset);
    } catch (err){
        console.error("Error al consultar el inventario, ", err);
        res.status(500).json({error: 'Error al obtener la base de datos'});
    }
});
app.get('/api/todos-los-reportes', async (req, res) => {
    try{
        const {getConnection1} = require('./db');
        const pool = await getConnection1();

        const result = await pool.request().query(`
            SELECT * FROM reportes
            ORDER BY fecha DESC
        `);

        res.json(result.recordset);
    } catch(err){
        console.error("Error al consultar la tabla de reportes: ", err);
        res.status(500).json({ error: 'Error al obtener datos de la base de datos'})
    }
});

// OBTENER PRODUCTOS PRÓXIMOS A CADUCAR (Dinámico)
app.get('/api/reportes/proximos-a-caducar', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        
        const dias = req.query.dias ? parseInt(req.query.dias) : 90;

        const result = await pool.request()
            .input('dias', sql.Int, dias)
            .query(`
                SELECT 
                    id_rep, id_prod, n_prod, ubi, id_lote, cad, cant
                FROM reportes
                WHERE cad IS NOT NULL 
                  AND cad <= DATEADD(day, @dias, GETDATE())
                ORDER BY cad ASC
            `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error al consultar caducidades:", err);
        res.status(500).json({ error: 'Error interno de base de datos' });
    }
});

// ==========================================
//        SISTEMA DE USUARIOS Y LOGIN
// ==========================================

// 1. LOGIN DE USUARIO
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        
        const result = await pool.request()
            .input('user', sql.VarChar, username)
            .input('pass', sql.VarChar, password)
            .query(`
                SELECT id_usuario as id, username, nombre as name, rol as role 
                FROM usuarios 
                WHERE username = @user AND password = @pass
            `);

        if (result.recordset.length > 0) {
            res.json({ success: true, user: result.recordset[0] });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// 2. OBTENER TODOS LOS USUARIOS (Para el panel de Admin)
app.get('/api/usuarios', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query('SELECT id_usuario as id, username, nombre as name, rol as role FROM usuarios');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// 3. CREAR USUARIO
app.post('/api/usuarios', async (req, res) => {
    const { username, password, name, role } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        await pool.request()
            .input('user', sql.VarChar, username)
            .input('pass', sql.VarChar, password)
            .input('nombre', sql.VarChar, name)
            .input('rol', sql.VarChar, role)
            .query('INSERT INTO usuarios (username, password, nombre, rol) VALUES (@user, @pass, @nombre, @rol)');
        
        res.json({ success: true, message: 'Usuario creado exitosamente' });
    } catch (err) {
        console.error("Error creando usuario:", err);
        if (err.number === 2627) {
            res.status(400).json({ success: false, message: 'El nombre de usuario ya está en uso' });
        } else {
            res.status(500).json({ success: false, message: 'Error al crear usuario' });
        }
    }
});

// 4. ELIMINAR USUARIO
app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM usuarios WHERE id_usuario = @id');
            
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
});

// 5. ACTUALIZAR USUARIO
app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password, name, role } = req.body;
    
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        
        let query = '';
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('user', sql.VarChar, username)
            .input('nombre', sql.VarChar, name)
            .input('rol', sql.VarChar, role);

        if (password && password.trim() !== '') {
            request.input('pass', sql.VarChar, password);
            query = 'UPDATE usuarios SET username = @user, password = @pass, nombre = @nombre, rol = @rol WHERE id_usuario = @id';
        } else {
            query = 'UPDATE usuarios SET username = @user, nombre = @nombre, rol = @rol WHERE id_usuario = @id';
        }

        await request.query(query);
        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
        
    } catch (err) {
        console.error("❌ Error actualizando usuario:", err);
        if (err.number === 2627) {
            res.status(400).json({ success: false, message: 'Ese nombre de usuario ya está ocupado' });
        } else {
            res.status(500).json({ success: false, message: 'Error al actualizar el usuario' });
        }
    }
});

// ==========================================
//        RUTAS DE TAREAS / ACTIVIDADES
// ==========================================

// 1. Obtener todas las tareas
app.get('/api/tareas', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query(`SELECT * FROM tareas ORDER BY id_tarea DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Error al obtener tareas' }); }
});

// 2. Obtener tareas de un operador específico
app.get('/api/tareas/mis-tareas/:userId', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request()
            .input('userId', sql.Int, req.params.userId)
            .query(`SELECT * FROM tareas WHERE id_operador = @userId AND estado != 'liberada' ORDER BY id_tarea DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Error al obtener mis tareas' }); }
});

// 3. Crear una nueva tarea
app.post('/api/tareas', async (req, res) => {
    const { descripcion, id_operador, nombre_operador } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        await pool.request()
            .input('desc', sql.VarChar(500), descripcion)
            .input('idOp', sql.Int, id_operador)
            .input('nomOp', sql.VarChar(100), nombre_operador)
            .query(`INSERT INTO tareas (descripcion, id_operador, nombre_operador) VALUES (@desc, @idOp, @nomOp)`);
        res.json({ success: true, message: 'Tarea asignada correctamente' });
    } catch (err) { res.status(500).json({ error: 'Error al crear tarea' }); }
});

// 4. Cambiar estado de la tarea (Completar o Liberar)
app.put('/api/tareas/:id/estado', async (req, res) => {
    const { estado } = req.body;
    const columnaFecha = estado === 'completada' ? 'fecha_completada' : 'fecha_liberada';
 
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('estado', sql.VarChar(50), estado)
            .query(`UPDATE tareas SET estado = @estado, ${columnaFecha} = GETDATE() WHERE id_tarea = @id`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error al actualizar tarea' }); }
});

// ==========================================
//        LOGS DEL SISTEMA
// ==========================================

// 1. OBTENER LOGS
app.get('/api/logs', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query(`
            SELECT id_log as id, fecha_hora as timestamp, usuario as [user], rol as role, accion as action
            FROM logs_sistema ORDER BY fecha_hora DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// 2. GUARDAR LOGS
app.post('/api/logs', async (req, res) => {
    const { usuario, rol, accion } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        await pool.request()
            .input('usu', sql.VarChar(100), usuario)
            .input('rol', sql.VarChar(50), rol)
            .input('acc', sql.VarChar(500), accion)
            .query(`INSERT INTO logs_sistema (usuario, rol, accion) VALUES (@usu, @rol, @acc)`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error al registrar log' }); }
});


// ==========================================
//        SUPER-OPERADOR
// ==========================================

// 1. Registrar una nueva salida de lote (Baja Completa)
app.post('/api/salidas', async (req, res) => {
    const { productId, productName, lote, cantidad_total, motivo, userId, operatorName } = req.body;
 
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
 
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);
 
            await request
                .input('id_prod', sql.VarChar(50), productId)
                .input('n_prod', sql.VarChar(255), productName)
                .input('id_lote', sql.VarChar(50), lote)
                .input('cantidad', sql.Int, cantidad_total)
                .input('motivo', sql.VarChar(255), motivo)
                .input('id_op', sql.Int, userId)
                .input('nom_op', sql.VarChar(100), operatorName)
                .query(`
                    INSERT INTO log_salidas (id_prod, n_prod, id_lote, cantidad, motivo, id_operador, nombre_operador)
                    VALUES (@id_prod, @n_prod, @id_lote, @cantidad, @motivo, @id_op, @nom_op)
                `);

            const request2 = new sql.Request(transaction);
            await request2
                .input('lote_baja', sql.VarChar(50), lote)
                .input('prod_baja', sql.VarChar(50), productId)
                .query(`
                    UPDATE reportes
                    SET estado_lote = 'dado_de_baja'
                    WHERE id_lote = @lote_baja AND id_prod = @prod_baja
                `);

            await transaction.commit();
            res.json({ success: true, message: 'Lote dado de baja exitosamente.' });
 
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
 
    } catch (err) {
        console.error("❌ Error al dar de baja el lote:", err);
        res.status(500).json({ error: 'Error interno al procesar la baja' });
    }
});

// 2. MODIFICAR LOTE (Cant y Ubi)
app.put('/api/reportes/modificar/:id_rep', async (req, res) => {
    const { cant, ubi } = req.body; 
    
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        
        await pool.request()
            .input('id', sql.Int, req.params.id_rep)
            .input('cant', sql.Int, cant)
            .input('ubi', sql.VarChar(100), ubi)
            .query(`UPDATE reportes SET cant = @cant, ubi = @ubi WHERE id_rep = @id`);
            
        res.json({ success: true, message: 'Lote actualizado correctamente' });
        
    } catch (err) {
        console.error("❌ Error en el servidor al modificar lote:", err);
        res.status(500).json({ error: 'Error al modificar lote' });
    }
});

// 3. OBTENER LOTES DISPONIBLES
app.get('/api/lotes-disponibles', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query(`
            SELECT
                id_rep,       /* <-- LLAVE MAESTRA AGREGADA */
                id_prod,
                n_prod,
                id_lote,
                cant
            FROM reportes
            WHERE cant > 0 AND estado_lote != 'dado_de_baja'
            ORDER BY n_prod ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener lotes' });
    }
});

// 4. REGISTRAR BAJA DEFINITIVA
app.post('/api/salidas', async (req, res) => {
    const { productId, productName, lote, cantidad_total, motivo, userId, operatorName, id_rep } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);
            await request
                .input('id_prod', sql.VarChar(50), productId)
                .input('n_prod', sql.VarChar(255), productName)
                .input('id_lote', sql.VarChar(50), lote)
                .input('cantidad', sql.Int, cantidad_total)
                .input('motivo', sql.VarChar(255), motivo)
                .input('id_op', sql.Int, userId)
                .input('nom_op', sql.VarChar(100), operatorName)
                .query(`INSERT INTO log_salidas (id_prod, n_prod, id_lote, cantidad, motivo, id_operador, nombre_operador) VALUES (@id_prod, @n_prod, @id_lote, @cantidad, @motivo, @id_op, @nom_op)`);

            const request2 = new sql.Request(transaction);
            await request2
                .input('id_rep', sql.Int, id_rep)
                .query(`UPDATE reportes SET cant = 0, estado_lote = 'dado_de_baja' WHERE id_rep = @id_rep`); // <-- AHORA ES EXACTO

            await transaction.commit();
            res.json({ success: true });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// 5. REGISTRAR VENTA MÚLTIPLE
app.post('/api/salidas/venta', async (req, res) => {
    const { lotesVendidos, userId, operatorName } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const lote of lotesVendidos) {
                const cant_vender = parseInt(lote.cant_vender);
                const cant_original = parseInt(lote.cant_original);
                const esBajaTotal = cant_vender >= cant_original;
                const motivoExacto = esBajaTotal ? 'Venta (Lote Agotado)' : 'Venta (Parcial)';

                const reqLog = new sql.Request(transaction);
                await reqLog
                    .input('id_prod', sql.VarChar(50), lote.id_prod)
                    .input('n_prod', sql.VarChar(255), lote.n_prod)
                    .input('id_lote', sql.VarChar(50), lote.id_lote)
                    .input('cantidad', sql.Int, cant_vender)
                    .input('motivo', sql.VarChar(255), motivoExacto)
                    .input('id_op', sql.Int, userId)
                    .input('nom_op', sql.VarChar(100), operatorName)
                    .query(`INSERT INTO log_salidas (id_prod, n_prod, id_lote, cantidad, motivo, id_operador, nombre_operador) VALUES (@id_prod, @n_prod, @id_lote, @cantidad, @motivo, @id_op, @nom_op)`);
 
                const reqUpdate = new sql.Request(transaction);
                if (esBajaTotal) {
                    await reqUpdate
                        .input('id_rep', sql.Int, lote.id_rep)
                        .query(`UPDATE reportes SET cant = 0, estado_lote = 'dado_de_baja' WHERE id_rep = @id_rep`);
                } else {
                    await reqUpdate
                        .input('id_rep', sql.Int, lote.id_rep)
                        .input('cant_vendida', sql.Int, cant_vender)
                        .query(`UPDATE reportes SET cant = cant - @cant_vendida WHERE id_rep = @id_rep`);
                }
            }
            await transaction.commit();
            res.json({ success: true });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al procesar la venta' });
    }
});

// Salidas
app.get('/api/salidas', async(requ,res) =>{
    try {
        const {getConnection1} = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query(`
            SELECT * From log_salidas ORDER BY fecha_salida DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({error: 'Error al obtener el log de salidas'});
    }
});

// ==========================================
// --- FLUJO DE APROBACIÓN DE BAJAS ---
// ==========================================

// 1. Creacion de Solicitud
app.post('/api/solicitudes-baja', async (req, res) => {
    const { id_rep, id_prod, n_prod, id_lote, cantidad, motivo, id_operador, nombre_operador } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        await pool.request()
            .input('id_rep', sql.Int, id_rep).input('id_prod', sql.VarChar(50), id_prod)
            .input('n_prod', sql.VarChar(255), n_prod).input('id_lote', sql.VarChar(50), id_lote)
            .input('cant', sql.Int, cantidad).input('mot', sql.VarChar(255), motivo)
            .input('id_op', sql.Int, id_operador).input('nom_op', sql.VarChar(100), nombre_operador)
            .query(`
                INSERT INTO solicitudes_baja (id_rep, id_prod, n_prod, id_lote, cantidad, motivo, id_operador, nombre_operador)
                VALUES (@id_rep, @id_prod, @n_prod, @id_lote, @cant, @mot, @id_op, @nom_op)
            `);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error al crear solicitud' }); }
});

// 2. Obtencion de solicitud
app.get('/api/solicitudes-baja/pendientes', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query(`SELECT * FROM solicitudes_baja WHERE estado = 'pendiente' ORDER BY fecha_solicitud ASC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Error al obtener solicitudes' }); }
});

// 3. Resolucion de solicitud
app.put('/api/solicitudes-baja/:id/resolver', async (req, res) => {
    const { accion, supervisor } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
 
        if (accion === 'rechazada') {
            await pool.request().input('id', sql.Int, req.params.id).input('sup', sql.VarChar(100), supervisor)
                .query(`UPDATE solicitudes_baja SET estado = 'rechazada', fecha_resolucion = GETDATE(), autorizado_por = @sup WHERE id_solicitud = @id`);
            return res.json({ success: true });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const reqData = await new sql.Request(transaction).input('id', sql.Int, req.params.id)
                .query(`SELECT * FROM solicitudes_baja WHERE id_solicitud = @id`);
            const sol = reqData.recordset[0];

            await new sql.Request(transaction)
                .input('id_prod', sql.VarChar(50), sol.id_prod).input('n_prod', sql.VarChar(255), sol.n_prod)
                .input('id_lote', sql.VarChar(50), sol.id_lote).input('cantidad', sql.Int, sol.cantidad)
                .input('motivo', sql.VarChar(255), sol.motivo).input('id_op', sql.Int, sol.id_operador).input('nom_op', sql.VarChar(100), sol.nombre_operador)
                .query(`INSERT INTO log_salidas (id_prod, n_prod, id_lote, cantidad, motivo, id_operador, nombre_operador) VALUES (@id_prod, @n_prod, @id_lote, @cantidad, @motivo, @id_op, @nom_op)`);

            await new sql.Request(transaction).input('id_rep', sql.Int, sol.id_rep)
                .query(`UPDATE reportes SET cant = 0, estado_lote = 'dado_de_baja' WHERE id_rep = @id_rep`);

            await new sql.Request(transaction).input('id', sql.Int, req.params.id).input('sup', sql.VarChar(100), supervisor)
                .query(`UPDATE solicitudes_baja SET estado = 'aprobada', fecha_resolucion = GETDATE(), autorizado_por = @sup WHERE id_solicitud = @id`);

            await transaction.commit();
            res.json({ success: true });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) { res.status(500).json({ error: 'Error al resolver solicitud' }); }
});

// ==========================================
// --- MODULO DE UBICACIONES ---
// ==========================================

// 1. Crear nueva ubicación
app.post('/api/ubicaciones', async (req, res) => {
    const { nombre } = req.body;
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .query(`INSERT INTO ubicaciones (nombre_ubicacion) VALUES (@nombre)`);
        res.json({ success: true, message: 'Ubicación creada' });
    } catch (err) {
        if(err.message.includes('UNIQUE')) return res.status(400).json({ error: 'La ubicación ya existe.' });
        res.status(500).json({ error: 'Error al crear ubicación' });
    }
});

// 2. Obtener TODAS las ubicaciones y calcular su estado
app.get('/api/ubicaciones', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query(`
            SELECT 
                u.id_ubicacion, 
                u.nombre_ubicacion,
                CASE 
                    WHEN EXISTS (SELECT 1 FROM reportes r WHERE r.ubi = u.nombre_ubicacion AND r.estado_lote = 'activo') 
                    THEN 'ocupada' 
                    ELSE 'disponible' 
                END as estado
            FROM ubicaciones u
            ORDER BY u.nombre_ubicacion ASC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Error al obtener ubicaciones' }); }
});

// 3. Obtener ubicaciones DISPONIBLES
app.get('/api/ubicaciones/disponibles', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        const result = await pool.request().query(`
            SELECT nombre_ubicacion 
            FROM ubicaciones 
            WHERE nombre_ubicacion NOT IN (
                SELECT ubi FROM reportes WHERE estado_lote = 'activo' AND ubi IS NOT NULL
            )
            ORDER BY nombre_ubicacion ASC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Error al obtener ubicaciones libres' }); }
});

// 4. Eliminar una ubicación (Solo si está libre)
app.delete('/api/ubicaciones/:id', async (req, res) => {
    try {
        const { getConnection1 } = require('./db');
        const pool = await getConnection1();
        
        const checkUbi = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT nombre_ubicacion FROM ubicaciones WHERE id_ubicacion = @id`);
            
        if (checkUbi.recordset.length === 0) return res.status(404).json({ error: 'La ubicación no existe.' });
        const nombreUbi = checkUbi.recordset[0].nombre_ubicacion;

        const checkOcupada = await pool.request()
            .input('ubi', sql.VarChar(100), nombreUbi)
            .query(`SELECT 1 FROM reportes WHERE ubi = @ubi AND estado_lote = 'activo'`);
            
        if (checkOcupada.recordset.length > 0) {
            return res.status(400).json({ error: 'No se puede eliminar. Hay mercancía física en esta ubicación.' });
        }

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM ubicaciones WHERE id_ubicacion = @id`);

        res.json({ success: true, nombre: nombreUbi });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno al intentar eliminar la ubicación.' });
    }
});

// ==========================================
//        PUERTO Y CERTIFICADO
// ==========================================

const frontendPath = path.join(__dirname, '../dist');
app.use(express.static(frontendPath));

app.use((req,res) => {
    res.sendFile(path.join(frontendPath, 'index.html'))
});

try {
    const privateKey = fs.readFileSync('server.key', 'utf8');
    const certificate = fs.readFileSync('server.cert', 'utf8');
    const cretendials = { key: privateKey, cert: certificate};

    const httpsServer = https.createServer(cretendials, app);

    httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
} catch (error) {
    console.error("Error al cargar los certificados");
    console.error(error);
}
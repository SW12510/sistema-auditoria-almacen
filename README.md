#  Sistema de Auditoría de Almacén - Amaya Comercial

Sistema web de arquitectura Cliente-Servidor diseñado para la gestión, conteo y auditoría de inventarios mediante escaneo de códigos de barras en dispositivos móviles. Desarrollado con el stack MERN (React, Node.js) y SQL Server.

##  Requisitos Previos

Para ejecutar este proyecto en un entorno local o de producción, asegúrate de tener instalado:
* **Node.js** (v16 o superior)
* **Microsoft SQL Server** (Configurado con autenticación Mixta o de Windows)
* **PM2** (Instalado globalmente: `npm install -g pm2`)

##  Instalación y Configuración

**1. Clonar el repositorio e instalar dependencias:**
bash
git clone [https://github.com/SW12510/sistema-auditoria-almacen.git](https://github.com/SW12510/sistema-auditoria-almacen.git)
cd sistema-auditoria-almacen
npm install

**2. Variables de Entorno (.env):
Crea un archivo .env en la raíz del proyecto para conectar la base de datos. Usa el siguiente formato:
DB_USER=tu_usuario_sql
DB_PASSWORD=tu_password_sql
DB_SERVER=localhost
DB_DATABASE=nombre_base_datos
PORT=5000

**3. Certificados de Seguridad (HTTPS):
Dado que la aplicación requiere el uso de la cámara del dispositivo móvil para escanear, es obligatorio correr el servidor bajo HTTPS. Debes generar y colocar los archivos server.key y server.cert en la raíz del backend.

Despliegue en Producción
1. Compilar el Frontend:
Genera la versión optimizada de React creando la carpeta /dist: npm run build

2. Iniciar el Servidor Web:
Utiliza PM2 para ejecutar el backend en segundo plano y asegurar su alta disponibilidad: pm2 start index.js --name "AmayaInventory"

3. Acceso al sistema:
Ingresa desde cualquier navegador o dispositivo en la misma red Wi-Fi a través de: https://<IP-DEL-SERVIDOR>:5000

**Script de creacion de BD
-- Crear la base de datos
CREATE DATABASE AmayaInventory;
GO
USE AmayaInventory;
GO

-- 1. Tabla de Usuarios (Autenticación y Roles)
CREATE TABLE usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(50) NOT NULL -- 'operador', 'super_operador', 'supervisor', 'admin'
);

-- 2. Tabla de Productos (Catálogo Maestro)
CREATE TABLE productos (
    id_producto VARCHAR(50) PRIMARY KEY, -- SKU o Código de Barras
    nombre_producto VARCHAR(150) NOT NULL,
    cajas INT DEFAULT 0,
    piezas_por_caja INT DEFAULT 1,
    piezas_sueltas INT DEFAULT 0,
    cantidad_total INT DEFAULT 0
);

-- 3. Tabla de Ubicaciones Físicas (Mapa del Almacén)
CREATE TABLE ubicaciones (
    id_ubicacion INT IDENTITY(1,1) PRIMARY KEY,
    nombre_ubicacion VARCHAR(100) NOT NULL UNIQUE, -- Ej. 'PASILLO A - RACK 1'
    estado VARCHAR(20) DEFAULT 'disponible' -- 'disponible' u 'ocupada'
);

-- 4. Tabla de Reportes (Inventario Físico Real)
CREATE TABLE reportes (
    id_rep INT IDENTITY(1,1) PRIMARY KEY,
    id_prod VARCHAR(50) NOT NULL,
    id_lote VARCHAR(50) NOT NULL,
    cant INT NOT NULL,
    ubi VARCHAR(100) NOT NULL,
    cad DATE NOT NULL,
    estado_lote VARCHAR(50) DEFAULT 'activo', -- 'activo' o 'dado_de_baja'
    fecha_conteo DATETIME DEFAULT GETDATE(),
    id_operador INT,
    FOREIGN KEY (id_prod) REFERENCES productos(id_producto),
    FOREIGN KEY (id_operador) REFERENCES usuarios(id_usuario)
);

-- 5. Tabla de Salidas (Descuentos y Ventas)
CREATE TABLE salidas (
    id_salida INT IDENTITY(1,1) PRIMARY KEY,
    id_prod VARCHAR(50) NOT NULL,
    id_lote VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    fecha_salida DATETIME DEFAULT GETDATE(),
    id_operador INT,
    FOREIGN KEY (id_prod) REFERENCES productos(id_producto),
    FOREIGN KEY (id_operador) REFERENCES usuarios(id_usuario)
);

-- 6. Tabla de Tareas (Asignaciones de Supervisores)
CREATE TABLE tareas (
    id_tarea INT IDENTITY(1,1) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    id_operador INT NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'completada', 'liberada'
    fecha_asignacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_operador) REFERENCES usuarios(id_usuario)
);

-- 7. Tabla de Solicitudes de Baja (Buzón de Autorizaciones)
CREATE TABLE solicitudes_baja (
    id_solicitud INT IDENTITY(1,1) PRIMARY KEY,
    id_rep INT NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    id_operador INT NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'aprobada', 'rechazada'
    fecha_solicitud DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_rep) REFERENCES reportes(id_rep),
    FOREIGN KEY (id_operador) REFERENCES usuarios(id_usuario)
);

-- 8. Tabla de Logs (Bitácora de Auditoría)
CREATE TABLE logs (
    id_log INT IDENTITY(1,1) PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT GETDATE()
);

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { crearSolicitudBaja, registrarSalidaLote, registrarVentaLotes, fetchLogSalidas, fetchLotesDisponibles, registrarLog, login as apiLogin } from '../api/mockApi';
import BarcodeScanner from '../components/BarcodeScanner';
import useIsMobile from '../hooks/useIsMobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const SalidaLotes = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient(); 

  const [activeTab, setActiveTab] = useState('venta');
 
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [scannedSku, setScannedSku] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const [ventaData, setVentaData] = useState({});

  const [cantidadTotal, setCantidadTotal] = useState(null);
  const [formData, setFormData] = useState({ productId: '', productName: '', lote: '', id_rep: '', motivo: 'Merma / Daño' });
 
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [supCreds, setSupCreds] = useState({ username: '', password: '' });

  const [searchLog, setSearchLog] = useState('');
  const [motivoFilter, setMotivoFilter] = useState('');
  const [dateFromLog, setDateFromLog] = useState('');
  const [dateToLog, setDateToLog] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['salidasData'], 
    queryFn: async () => {
      const [logsData, lotesData] = await Promise.all([fetchLogSalidas(), fetchLotesDisponibles()]);
      return { logs: logsData, lotes: lotesData };
    }
  });

  const logSalidas = data?.logs || [];
  const lotesDisponibles = data?.lotes || [];

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
    setMessage('');
    setScannedSku('');
    setShowScanner(false);
    setVentaData({});
    setFormData({ productId: '', productName: '', lote: '', id_rep: '', motivo: 'Merma / Daño' });
    setCantidadTotal(null);
  };

  const handleScan = (barcode) => {
    setScannedSku(barcode);
    setShowScanner(false);
    setVentaData({});
    setFormData({ ...formData, lote: '', id_rep: '', productId: '', productName: '' });
    setCantidadTotal(null);
  };

  const lotesDelProducto = lotesDisponibles.filter(l => l.id_prod === scannedSku || scannedSku.includes(l.id_prod));

  const handleCheckboxChange = (lote, isChecked) => {
    setVentaData(prev => ({
      ...prev,
      [lote.id_rep]: {
        ...prev[lote.id_rep],
        checked: isChecked,
        cant_vender: prev[lote.id_rep]?.cant_vender || 1, 
        cant_original: lote.cant,
        id_prod: lote.id_prod,
        n_prod: lote.n_prod,
        id_lote: lote.id_lote,
        id_rep: lote.id_rep
      }
    }));
  };

  const handleCantidadVentaChange = (id_rep, cantidad) => {
    setVentaData(prev => ({
      ...prev,
      [id_rep]: { ...prev[id_rep], cant_vender: cantidad === '' ? '' : parseInt(cantidad) }
    }));
  };

  const handleSubmitVenta = async (e) => {
    e.preventDefault();
    const seleccionados = Object.values(ventaData).filter(l => l.checked);
    
    if (seleccionados.length === 0) return setError('Selecciona al menos un lote para vender.');
    if (seleccionados.some(l => !l.cant_vender || l.cant_vender <= 0)) return setError('Revisa que las cantidades a vender sean mayores a 0.');
    
    setMessage('Procesando venta... ⏳');
    setError('');
    
    try {
      await registrarVentaLotes({ lotesVendidos: seleccionados, userId: user.id, operatorName: user.name });
      
      for(const lote of seleccionados){
         const esBaja = lote.cant_vender >= lote.cant_original;
         const accionLog = `Venta de ${lote.cant_vender} pzs del lote ${lote.id_lote}. ${esBaja ? '(Lote agotado)' : '(Descuento parcial)'}`;
         await registrarLog(user.name, user.role, accionLog);
      }

      setMessage('✅ Venta registrada exitosamente.');
      handleTabSwitch('venta');
      queryClient.invalidateQueries(['salidasData']); 
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage('');
      setError('❌ Error al procesar la venta.');
    }
  };

  const handleLoteBajaSeleccion = (lote) => {
    setFormData({ 
      ...formData, 
      lote: lote.id_lote, 
      productId: lote.id_prod, 
      productName: lote.n_prod, 
      id_rep: lote.id_rep 
    });
    setCantidadTotal(lote.cant);
  };

  const solicitarBaja = async (e) => {
    e.preventDefault();
    setMessage('Enviando solicitud al supervisor... ⏳');
    setError('');

    try {
      const datosSolicitud = {
        id_rep: formData.id_rep,
        id_prod: formData.productId,
        n_prod: formData.productName,
        id_lote: formData.lote,
        cantidad: cantidadTotal,
        motivo: formData.motivo,
        id_operador: user.id,
        nombre_operador: user.name
      };

      await crearSolicitudBaja(datosSolicitud);
      await registrarLog(user.name, user.role, `Envió a buzón una solicitud para dar de baja el lote [${formData.lote}]`);

      setMessage('✅ Solicitud enviada correctamente. El supervisor la revisará desde su panel.');
      handleTabSwitch('baja');
      queryClient.invalidateQueries(['salidasData']); 
      setTimeout(() => setMessage(''), 5000);

    } catch (err) {
      setMessage('');
      setError('❌ Ocurrió un error al enviar la solicitud.');
    }
  };

  const filteredLogs = useMemo(() => {
    return logSalidas.filter(log => {
      const lowerSearch = searchLog.toLowerCase();
      const matchText = (log.n_prod || '').toLowerCase().includes(lowerSearch) || 
                        (log.id_prod || '').toLowerCase().includes(lowerSearch) || 
                        (log.id_lote || '').toLowerCase().includes(lowerSearch) ||
                        (log.nombre_operador || '').toLowerCase().includes(lowerSearch);
      
      const matchMotivo = motivoFilter === '' || log.motivo === motivoFilter;

      let matchDate = true;
      if (log.fecha_salida) {
        const logDateObj = new Date(log.fecha_salida);
        const logDate = new Date(logDateObj.getFullYear(), logDateObj.getMonth(), logDateObj.getDate()).getTime();
        if (dateFromLog) { const [y, m, d] = dateFromLog.split('-'); if (logDate < new Date(y, m - 1, d).getTime()) matchDate = false; }
        if (dateToLog) { const [y, m, d] = dateToLog.split('-'); if (logDate > new Date(y, m - 1, d).getTime()) matchDate = false; }
      }
      return matchText && matchMotivo && matchDate;
    });
  }, [logSalidas, searchLog, motivoFilter, dateFromLog, dateToLog]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchLog, motivoFilter, dateFromLog, dateToLog]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}><h2>Cargando inventario y bitácora... ⏳</h2></div>;

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Salidas de Almacén</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Selecciona el módulo correspondiente a la operación.</p>

      {/* TABS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button className={activeTab === 'venta' ? 'primary' : 'secondary'} onClick={() => handleTabSwitch('venta')} style={{ flex: 1, padding: '15px', fontSize: '1.1rem' }}>
          🛒 Módulo de Ventas
        </button>
        <button className={activeTab === 'baja' ? 'primary' : 'secondary'} onClick={() => handleTabSwitch('baja')} style={{ flex: 1, padding: '15px', fontSize: '1.1rem' }}>
          🗑️ Módulo de Bajas
        </button>
      </div>

      {message && <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '5px', marginBottom: '1rem', fontWeight: 'bold' }}>{message}</div>}
      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '5px', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}

      {/* ========================================================= */}
      {/* BUSCADOR */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="secondary" onClick={() => setShowScanner(!showScanner)}>
            {showScanner ? 'Ocultar Cámara' : '📷 Activar Escáner'}
        </button>
        <input 
          type="text" 
          placeholder="O escribe el SKU manualmente..." 
          value={scannedSku} 
          onChange={e => setScannedSku(e.target.value)} 
          style={{ flex: 1, margin: 0 }} 
        />
      </div>
      {showScanner && <div style={{ marginBottom: '1rem' }}><BarcodeScanner onScan={handleScan} /></div>}

      {/* ========================================================= */}
      {/* MÓDULO VENTA */}
      {/* ========================================================= */}
      {activeTab === 'venta' && scannedSku && (
        <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, color: '#166534' }}>Lotes Disponibles para Venta</h3>
          <form onSubmit={handleSubmitVenta}>
            {lotesDelProducto.length > 0 ? (
              <div className="table-responsive">
                <table style={{ backgroundColor: 'white' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Vender</th>
                      <th>Lote</th>
                      <th>Disponibilidad</th>
                      <th>Pzs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesDelProducto.map(lote => {
                      const isChecked = !!ventaData[lote.id_rep]?.checked;
                      return (
                        <tr key={lote.id_rep} style={{ backgroundColor: isChecked ? '#dcfce7' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={isChecked} onChange={(e) => handleCheckboxChange(lote, e.target.checked)} />
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{lote.id_lote}</td>
                          <td>{lote.cant} pzs</td>
                          <td>
                            <input type="number" min="1" max={lote.cant} disabled={!isChecked} value={ventaData[lote.id_rep]?.cant_vender || ''} onChange={(e) => handleCantidadVentaChange(lote.id_rep, e.target.value)} style={{ margin: 0, width: '100px' }} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#991b1b', fontWeight: 'bold' }}>No se encontraron lotes activos para el SKU: {scannedSku}</p>
            )}
            <button type="submit" className="primary" style={{ marginTop: '1.5rem', width: '100%', fontSize: '1.2rem', padding: '15px' }}>
              🛒 Procesar Venta Seleccionada
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MÓDULO BAJA */}
      {/* ========================================================= */}
      {activeTab === 'baja' && scannedSku && (
        <div style={{ backgroundColor: '#fff7ed', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, color: '#c2410c' }}>Dar de Baja Lote</h3>
          <form onSubmit={solicitarBaja}>
            
            {lotesDelProducto.length > 0 ? (
              <div className="table-responsive" style={{ marginBottom: '1.5rem' }}>
                <table style={{ backgroundColor: 'white' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Seleccion</th>
                      <th>Lote</th>
                      <th>Total a dar de baja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesDelProducto.map(lote => {
                      const isSelected = formData.id_rep === lote.id_rep;
                      return (
                        <tr key={lote.id_rep} style={{ backgroundColor: isSelected ? '#ffedd5' : 'transparent', cursor: 'pointer' }} onClick={() => handleLoteBajaSeleccion(lote)}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="radio" name="bajaSelect" style={{ width: '20px', height: '20px' }} checked={isSelected} readOnly />
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{lote.id_lote}</td>
                          <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{lote.cant} pzs</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#991b1b', fontWeight: 'bold' }}>No se encontraron lotes activos para el SKU: {scannedSku}</p>
            )}

            {formData.id_rep && (
              <>
                <div className="form-group">
                  <label>Motivo de la Baja Definitiva</label>
                  <select name="motivo" value={formData.motivo} onChange={(e) => setFormData({...formData, motivo: e.target.value})} required>
                    <option value="Merma / Daño">Merma / Daño</option>
                    <option value="Caducidad">Caducidad</option>
                    <option value="Devolución a Proveedor">Devolución a Proveedor</option>
                  </select>
                </div>
                <button type="submit" className="primary" style={{ backgroundColor: '#ea580c', borderColor: '#c2410c', fontSize: '1.1rem', padding: '12px', width: '100%' }}>
                  Solicitar Autorización de Baja ({cantidadTotal} pzs)
                </button>
              </>
            )}
          </form>
        </div>
      )}

       {/* ========================================================= */}
      {/* BITÁCORA GENERAL CON FILTROS Y PAGINACIÓN */}
      {/* ========================================================= */}
      <h3 style={{ marginTop: '3rem' }}>Bitácora de Salidas y Ventas Recientes</h3>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <input type="text" placeholder="🔍 Buscar Producto, Lote, Operador..." value={searchLog} onChange={e => setSearchLog(e.target.value)} style={{ flex: 2, margin: 0, minWidth: '200px' }} />
        <select value={motivoFilter} onChange={e => setMotivoFilter(e.target.value)} style={{ flex: 1, margin: 0, minWidth: '150px' }}>
          <option value="">Todos los motivos</option>
          <option value="Venta (Parcial)">Venta Parcial</option>
          <option value="Venta (Lote Agotado)">Venta (Lote Agotado)</option>
          <option value="Merma / Daño">Merma / Daño</option>
          <option value="Caducidad">Caducidad</option>
          <option value="Devolución a Proveedor">Devolución</option>
          <option value="Ajuste de Inventario">Ajuste</option>
        </select>
        <input type="date" value={dateFromLog} onChange={e => setDateFromLog(e.target.value)} style={{ flex: 1, margin: 0 }} />
        <input type="date" value={dateToLog} onChange={e => setDateToLog(e.target.value)} style={{ flex: 1, margin: 0 }} />
        <button className="secondary" onClick={() => { setSearchLog(''); setMotivoFilter(''); setDateFromLog(''); setDateToLog(''); }} style={{ margin: 0 }}>Limpiar</button>
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
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', margin: 0, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Anterior</button>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '6px 12px', margin: 0, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Siguiente ▶</button>
            </div>
          </div>
        </div>
      )}

      {isMobile ? (
        /* VISTA MÓVIL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>No hay registros en esta página.</p>
          ) : (
            currentItems.map(log => (
              <div key={log.id_salida} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: '#64748b' }}>#{log.id_salida}</strong>
                  <span style={{ color: log.motivo === 'Venta (Parcial)' ? '#16a34a' : '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>-{log.cantidad} pzs</span>
                </div>
                <h4 style={{ margin: '0 0 5px 0' }}>{log.n_prod}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Lote: <strong>{log.id_lote}</strong> | SKU: {log.id_prod}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}><strong>{log.nombre_operador}</strong></p>
                <hr style={{ margin: '10px 0', border: '0', borderTop: '1px solid #f1f5f9' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: '#94a3b8' }}>{new Date(log.fecha_salida).toLocaleString()}</small>
                  <span style={{ backgroundColor: log.motivo === 'Venta (Parcial)' ? '#dcfce7' : '#fee2e2', color: log.motivo === 'Venta (Parcial)' ? '#166534' : '#991b1b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>{log.motivo}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* VISTA ESCRITORIO */
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>ID</th><th>Fecha</th><th>Producto</th><th>Lote</th><th>Piezas</th><th>Motivo</th><th>Operador</th></tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No hay registros en esta página.</td></tr>
              ) : (
                currentItems.map(log => (
                  <tr key={log.id_salida}>
                    <td>#{log.id_salida}</td>
                    <td>{new Date(log.fecha_salida).toLocaleString()}</td>
                    <td>{log.n_prod} <br/><small>{log.id_prod}</small></td>
                    <td>{log.id_lote}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: log.motivo === 'Venta (Parcial)' ? '#16a34a' : '#ef4444' }}>-{log.cantidad}</td>
                    <td><span style={{ backgroundColor: log.motivo === 'Venta (Parcial)' ? '#dcfce7' : '#fee2e2', color: log.motivo === 'Venta (Parcial)' ? '#166534' : '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>{log.motivo}</span></td>
                    <td>{log.nombre_operador}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default SalidaLotes;
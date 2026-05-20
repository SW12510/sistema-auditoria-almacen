import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { submitCountReport, fetchInventoryForConsult, registrarLog, fetchUbicacionesDisponibles } from '../api/mockApi';
import BarcodeScanner from '../components/BarcodeScanner';
import useIsMobile from '../hooks/useIsMobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Conteo = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile(); 
  const queryClient = useQueryClient(); 
  
  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    ubicacion: '',
    lote: '', 
    caducidad: '',
    cantidadContada: 0,
  });

  const [calculadora, setCalculadora] = useState({
    cajas: 0,
    piezasPorCaja: 0,
    sueltas: 0
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['conteoData', user?.id], 
    queryFn: async () => {
      const [datosInv, datosUbi] = await Promise.all([
        fetchInventoryForConsult(user),
        fetchUbicacionesDisponibles()
      ]);
      return { inventario: datosInv, ubicaciones: datosUbi };
    },
    enabled: !!user,
  });

  const inventarioReal = data?.inventario || [];
  const ubicacionesLibres = data?.ubicaciones || [];

  useEffect(() => {
    const total = (parseInt(calculadora.cajas || 0) * parseInt(calculadora.piezasPorCaja || 0)) + parseInt(calculadora.sueltas || 0);
    setFormData(prev => ({ ...prev, cantidadContada: total }));
  }, [calculadora]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCalcChange = (e) => {
    const { name, value } = e.target;
    const numValue = value < 0 ? 0 : value;
    setCalculadora(prev => ({ ...prev, [name]: numValue }));
  };

  // 🔍 SÚPER FUNCIÓN DE BÚSQUEDA CON BANDERAS DE DEPURACIÓN
  const buscarProducto = (barcode) => {
    console.log("-----------------------------------------");
    console.log("🚩 PASO 1: Recibiendo escaneo original ->", `[${barcode}]`);
    
    if (!barcode || String(barcode).trim() === '') {
      console.warn("⚠️ ERROR PASO 1: El escáner envió un texto vacío o nulo.");
      return;
    }

    const codigoLimpio = String(barcode).trim().replace(/\s+/g, '').replace(/^0+/, '').toUpperCase();
    console.log("🚩 PASO 2: Código después de limpieza ->", `[${codigoLimpio}]`);

    console.log(`🚩 PASO 3: Revisando catálogo (Total productos: ${inventarioReal.length})`);
    if (inventarioReal.length === 0) {
      console.error("⛔ ERROR CRÍTICO PASO 3: El inventario está vacío.");
      setError("Error interno: El catálogo de productos no está cargado.");
      return;
    }

    console.log("🚩 PASO 4: Iniciando búsqueda en memoria...");
    
    const product = inventarioReal.find(item => {
      const idOriginal = item.id || item.id_prod;
      if (!idOriginal) {
        console.warn(`⚠️ Advertencia: Se encontró un producto sin ID en la fila:`, item);
        return false; 
      }

      const idBaseDatosLimpio = String(idOriginal).trim().replace(/\s+/g, '').replace(/^0+/, '').toUpperCase();
      return idBaseDatosLimpio === codigoLimpio;
    });

    if (product) {
      console.log("✅ PASO 5: ¡ÉXITO! Producto encontrado ->", product.name);
      console.log("-----------------------------------------"); 
      
      setFormData(prev => ({ 
        ...prev, 
        productId: String(product.id || product.id_prod), 
        productName: product.name || product.n_prod,
        ubicacion: prev.ubicacion || (Array.isArray(product.ubicacion) ? product.ubicacion[0] : (product.ubicacion || ''))
      }));
      
      setCalculadora(prev => ({ 
        ...prev, 
        piezasPorCaja: product.piezasPorCaja || prev.piezasPorCaja || 1
      }));
      
      setError('');
      setShowScanner(false); 
    } else {
      console.error(`❌ PASO 5: FRACASO. El código [${codigoLimpio}] no coincidió con ningún ID del catálogo.`);
      console.table(inventarioReal.slice(0, 3).map(p => ({ "ID BD": p.id || p.id_prod, "Nombre": p.name || p.n_prod })));
      console.log("-----------------------------------------"); 

      setError(`❌ Producto [${codigoLimpio}] no encontrado. Revisa la consola (F12) para más detalles.`);
      setFormData(prev => ({ ...prev, productName: '' }));
      setCalculadora(prev => ({ ...prev, piezasPorCaja: 0 }));
    }
  };

  const handleScan = (codigoEscaneado) => buscarProducto(codigoEscaneado);
  const handleManualSearch = (e) => buscarProducto(e.target.value);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      buscarProducto(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Enviando reporte... ⏳');
    setError('');
 
    try {
      const reportData = {
        userId: user.id,
        operatorName: user.name,
        op: user.name,
        ...formData
      };
 
      await submitCountReport(reportData);
 
      const accionLog = `Conteo de ${formData.cantidadContada} piezas del lote: ${formData.lote}`;
      await registrarLog(user.name, user.role, accionLog);

      setMessage('✅ Reporte de conteo enviado exitosamente.');
 
      setFormData({ productId: '', productName: '', ubicacion: '', lote: '', caducidad: '', cantidadContada: 0 });
      setCalculadora({ cajas: 0, piezasPorCaja: 0, sueltas: 0 });
      
      queryClient.invalidateQueries(['conteoData']);
 
    } catch (err) {
      setMessage('');
      setError(`❌ Error: ${err.message}`);
    }
  };

  if (isError) return <div className="page-container"><h2 style={{ color: '#ef4444' }}>❌ Error de conexión con el servidor.</h2></div>;
  if (isLoading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h2>Cargando catálogo de productos... ⏳</h2>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {isFetching && !isLoading && (
        <div style={{ position: 'fixed', top: isMobile ? '10px' : '20px', right: isMobile ? '10px' : '20px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1000 }}>
          🔄 Sincronizando...
        </div>
      )}

      <h1>Realizar Conteo Físico</h1>

      <div className="scan-controls" style={{ marginBottom: '2rem' }}>
        <button 
          type="button"
          className="secondary" 
          onClick={() => setShowScanner(!showScanner)}
          style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}
        >
          {showScanner ? 'Ocultar Escáner ▴' : '📷 Escanear Código de Barras'}
        </button>
        {showScanner && (
          <div style={{ marginTop: '1rem' }}>
            <BarcodeScanner onScan={handleScan} />
          </div>
        )}
      </div>
      
      {error && <p className="error-message" style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '5px', fontWeight: 'bold' }}>{error}</p>}
      {message && <p className="success-message" style={{ color: '#10b981', backgroundColor: '#d1fae5', padding: '10px', borderRadius: '5px', fontWeight: 'bold' }}>{message}</p>}

      <form onSubmit={handleSubmit} className="conteo-form">
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>ID Producto (SKU)</label>
            <input 
              type="text" 
              name="productId" 
              value={formData.productId} 
              onChange={handleChange} 
              onBlur={handleManualSearch} 
              onKeyDown={handleKeyDown}
              required 
              placeholder="Escanea o escribe (Enter para buscar)" 
            />
          </div>
          <div className="form-group">
            <label>Nombre Producto</label>
            <input 
              type="text" 
              name="productName" 
              value={formData.productName} 
              onChange={handleChange} 
              required 
              placeholder="Producto (Se autocompleta)" 
              style={{ backgroundColor: '#f3f4f6' }} 
              readOnly
            />
          </div>
        </div>

        <div className="form-group">
          <label>Ubicación Física</label>
          <select 
            name="ubicacion" 
            value={formData.ubicacion} 
            onChange={handleChange} 
            required
            style={{ padding: '10px', backgroundColor: '#f3f4f6' }}
          >
            <option value="">-- Selecciona dónde lo estás guardando --</option>
            {ubicacionesLibres.map((ubi, idx) => (
              <option key={idx} value={ubi.nombre_ubicacion}>
                📍 {ubi.nombre_ubicacion}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>ID de Lote Físico</label>
            <input type="text" name="lote" value={formData.lote} onChange={handleChange} required placeholder="Ej: L-8842" style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="form-group">
            <label>Fecha de Caducidad</label>
            <input type="date" name="caducidad" value={formData.caducidad} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ background: '#f0f7ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, color: '#0369a1', fontSize: '1.1rem' }}>📦 Calculadora de Cantidad</h3>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Cajas enteras:</label>
              <input type="number" name="cajas" value={calculadora.cajas} onChange={handleCalcChange} min="0" />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Pzs por Caja:</label>
              <input type="number" name="piezasPorCaja" value={calculadora.piezasPorCaja} onChange={handleCalcChange} min="0" />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Piezas Sueltas:</label>
              <input type="number" name="sueltas" value={calculadora.sueltas} onChange={handleCalcChange} min="0" />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total a Reportar:</label>
          <input 
            type="number" 
            name="cantidadContada" 
            value={formData.cantidadContada} 
            readOnly 
            style={{ backgroundColor: '#1f2937', color: '#10b981', fontWeight: 'bold', fontSize: '1.5rem', textAlign: 'center' }} 
          />
        </div>
        
        <button type="submit" className="primary" disabled={formData.cantidadContada <= 0} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', cursor: formData.cantidadContada <= 0 ? 'not-allowed' : 'pointer' }}>
          📤 Enviar Reporte
        </button>
      </form>
    </div>
  );
};

export default Conteo;
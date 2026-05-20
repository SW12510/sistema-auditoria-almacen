// src/components/BarcodeScanner.jsx

import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

const BarcodeScanner = ({ onScan }) => {

  const handleScan = (result) => {
    if (result && result.length > 0) {
      // 1. Obtenemos el valor bruto del escáner
      const rawValue = result[0].rawValue;

      // 2. APLICAMOS LA LIMPIEZA (Forma 1):
      // .trim() elimina espacios en blanco accidentales
      // .replace(/^0+/, '') busca ceros al inicio (^) y los elimina todos
      const cleanValue = rawValue.trim().replace(/^0+/, '');

      console.log(`Escaneado original: ${rawValue} -> Limpio: ${cleanValue}`);

      // 3. Enviamos el valor limpio al componente padre
      onScan(cleanValue);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '500px', 
      margin: 'auto', 
      border: '2px solid var(--primary-color)', 
      borderRadius: '8px', 
      overflow: 'hidden' 
    }}>
      
      <Scanner
        onScan={handleScan}
        onError={(error) => console.error(error)}
        components={{
            audio: false, 
            finder: true, 
        }}
        constraints={{
            facingMode: 'environment' 
        }}
        styles={{
            container: { width: '100%' }
        }}
      />

      <p style={{ 
        textAlign: 'center', 
        padding: '10px', 
        background: 'rgba(0,0,0,0.5)', 
        color: 'white', 
        margin: 0, 
        fontSize: '0.9rem' 
      }}>
        Apunta la cámara al código de barras
      </p>
    </div>
  );
};

export default BarcodeScanner;
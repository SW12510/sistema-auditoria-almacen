import React from 'react';

/**
 * Componente de tabla reutilizable y dinámico.
 * @param {object} props
 * @param {Array<object>} props.columns - Array de objetos de configuración de columna.
 * Ej: { key: 'name', header: 'Nombre', render: (item) => <span>{item.name}</span> }
 * @param {Array<object>} props.data - Array de objetos con los datos de cada fila.
 * @param {string} props.emptyMessage - Mensaje a mostrar si 'data' está vacío.
 */
const ReportTable = ({ columns, data, emptyMessage = "No hay datos para mostrar." }) => {

  if (!data || data.length === 0) {
    return <p style={{ textAlign: 'center', margin: '2rem' }}>{emptyMessage}</p>;
  }

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id || index}> {/* Usa item.id si existe, si no, el índice */}
              
              {columns.map((col) => (
                <td key={col.key}>
                  {/* Si la columna tiene una función 'render' personalizada, la usa.
                    Si no, simplemente muestra el valor de la 'key' (ej. item['name']).
                  */}
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
              
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTable;
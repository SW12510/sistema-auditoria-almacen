import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
// 1. Importamos la función real que creamos en el paso anterior
import { updateUser } from '../api/mockApi';

const Perfil = () => {
  const { user } = useAuth();
  const [pass, setPass] = useState({ new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false); // Para mostrar el texto en rojo o verde

  const handleChangePass = async (e) => {
    e.preventDefault();
    setIsError(false);
    
    // Validación de contraseñas iguales
    if (pass.new !== pass.confirm) {
      setMessage('❌ Las contraseñas no coinciden.');
      setIsError(true);
      return;
    }

    try {
      // 2. Llamamos a la API enviando los datos del usuario logueado pero con la nueva contraseña
      const userDataToUpdate = {
        username: user.username,
        name: user.name,
        role: user.role,
        password: pass.new // Aquí enviamos la nueva contraseña
      };

      await updateUser(user.id, userDataToUpdate);
      
      // 3. Si todo sale bien, mostramos éxito y limpiamos los campos
      setMessage('✅ Contraseña actualizada correctamente en el sistema.');
      setPass({ new: '', confirm: '' });
      
    } catch (error) {
      console.error("Error cambiando contraseña:", error);
      setMessage(`❌ Error al actualizar: ${error.message}`);
      setIsError(true);
    }
  };

  return (
    <div className="page-container">
      <h1>Mi Perfil</h1>
      <h3>Información de Usuario (No editable)</h3>
      <table>
        <tbody>
          <tr>
            <td><strong>ID de Usuario:</strong></td>
            <td>{user.id}</td>
          </tr>
          <tr>
            <td><strong>Nombre:</strong></td>
            <td>{user.name}</td>
          </tr>
          <tr>
            <td><strong>Usuario:</strong></td>
            <td>{user.username}</td>
          </tr>
          <tr>
            <td><strong>Rol:</strong></td>
            <td>{user.role}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ marginTop: '2rem' }}>Cambiar Contraseña</h3>
      <form onSubmit={handleChangePass}>
        <div className="form-group">
          <label>Nueva Contraseña:</label>
          <input 
            type="password" 
            value={pass.new} 
            onChange={(e) => setPass(p => ({...p, new: e.target.value}))}
            required
            minLength="3" // Pequeña validación extra
          />
        </div>
        <div className="form-group">
          <label>Confirmar Contraseña:</label>
          <input 
            type="password" 
            value={pass.confirm} 
            onChange={(e) => setPass(p => ({...p, confirm: e.target.value}))}
            required
            minLength="3"
          />
        </div>
        
        {/* Mostramos el mensaje en rojo si es error, o en verde si es éxito */}
        {message && (
          <p style={{ 
            color: isError ? '#ef4444' : '#10b981', 
            fontWeight: 'bold',
            backgroundColor: isError ? '#fee2e2' : '#d1fae5',
            padding: '10px',
            borderRadius: '5px'
          }}>
            {message}
          </p>
        )}
        
        <button type="submit" className="primary">Guardar Nueva Contraseña</button>
      </form>
    </div>
  );
};

export default Perfil;
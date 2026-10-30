import { API_URL } from '../config';
// Servicio para manejar la comunicación con el backend de juegos

const API_BASE_URL = `${API_URL}/`;

/**
 * Servicio para la gestión de partidas/juegos
 */
const gameService = {
  /**
   * Crea una nueva partida en el backend
   * @param {Object} gameData - Datos opcionales del juego
   * @returns {Promise<Object>} - Datos de la partida creada incluyendo PIN
   */
  async crearPartida(gameData = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}crear-partida/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: gameData.estado || 'CONFIGURACION',
          max_equipos: gameData.maxEquipos || 4,
          max_participantes: gameData.maxParticipantes || 100,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la partida');
      }

      const data = await response.json();
      return {
        id: data.id,
        pin: data.codigoAcceso,
        estado: data.estado,
        maxEquipos: data.maxEquipos,
        maxParticipantes: data.maxParticipantes,
        fechaCreacion: data.fechaCreacion,
      };
    } catch (error) {
      console.error('Error en crearPartida:', error);
      throw error;
    }
  },

  /**
   * Asigna grupos y sus integrantes a una partida existente
   * @param {number} partidaId - ID de la partida
   * @param {Array} grupos - Array de grupos con sus alumnos
   * @returns {Promise<Object>} - Resultado de la asignación
   */
  async asignarGrupos(partidaId, grupos) {
    try {
      // Transformar el formato de grupos del frontend al formato esperado por el backend
      const gruposFormateados = grupos.map((grupo, index) => ({
        nombre: grupo.nombre || `Equipo ${index + 1}`,
        alumnos: grupo.integrantes.map(estudiante => ({
          id_correo_usuario: estudiante.correo || estudiante.email,
          primer_nombre: estudiante.nombre,
          apellido_paterno: estudiante.apellido_paterno || '',
          apellido_materno: estudiante.apellido_materno || '',
        }))
      }));

      console.log('📤 Enviando grupos al backend:', {
        partidaId,
        gruposFormateados
      });

      const response = await fetch(`${API_BASE_URL}partida/${partidaId}/asignar-grupos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grupos: gruposFormateados
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al asignar grupos');
      }

      const data = await response.json();
      console.log('✅ Grupos asignados exitosamente:', data);
      
      return {
        mensaje: data.mensaje,
        partidaId: data.partida_id,
        gruposCreados: data.grupos_creados,
      };
    } catch (error) {
      console.error('❌ Error en asignarGrupos:', error);
      throw error;
    }
  },

  /**
   * Obtiene los grupos de una partida
   * @param {number} partidaId - ID de la partida
   * @returns {Promise<Array>} - Array de grupos con sus integrantes
   */
  async obtenerGrupos(partidaId) {
    try {
      const response = await fetch(`${API_BASE_URL}partida/${partidaId}/obtener-grupos/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener grupos');
      }

      const data = await response.json();
      return data.grupos || [];
    } catch (error) {
      console.error('Error en obtenerGrupos:', error);
      throw error;
    }
  },

  /**
   * Crea una partida completa con grupos asignados en un solo flujo
   * @param {Array} grupos - Array de grupos con sus integrantes
   * @param {Object} gameConfig - Configuración adicional del juego
   * @returns {Promise<Object>} - Datos completos de la partida creada
   */
  async crearPartidaConGrupos(grupos, gameConfig = {}) {
    try {
      console.log('🎮 Iniciando creación de partida con grupos...');
      
      // Paso 1: Crear la partida
      const partidaData = await this.crearPartida({
        estado: 'CONFIGURACION', // Empieza en CONFIGURACION, luego cambia a EN_CURSO al comenzar
        maxEquipos: grupos.length,
        maxParticipantes: grupos.reduce((total, grupo) => total + grupo.integrantes.length, 0),
        ...gameConfig
      });

      console.log('✅ Partida creada con ID:', partidaData.id, 'PIN:', partidaData.pin);

      // Paso 2: Asignar los grupos a la partida
      const resultadoGrupos = await this.asignarGrupos(partidaData.id, grupos);

      console.log('✅ Grupos asignados exitosamente');

      return {
        ...partidaData,
        grupos: resultadoGrupos.gruposCreados,
        gruposCreados: resultadoGrupos.gruposCreados, // Incluir códigos de equipo
        mensaje: 'Partida y grupos creados exitosamente'
      };
    } catch (error) {
      console.error('❌ Error en crearPartidaConGrupos:', error);
      throw error;
    }
  },

  /**
   * Verifica si una partida existe por su PIN
   * @param {string} pin - PIN de la partida
   * @returns {Promise<boolean>} - true si existe, false si no
   */
  async verificarPartida(pin) {
    try {
      // Este endpoint aún no existe en el backend, pero lo preparamos
      const response = await fetch(`${API_BASE_URL}partida/verificar/${pin}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error en verificarPartida:', error);
      return false;
    }
  },
};

export default gameService;

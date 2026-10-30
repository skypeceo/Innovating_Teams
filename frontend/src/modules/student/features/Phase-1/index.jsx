import { API_URL } from '../../../../config';
// src/modules/student/features/Phase-1/index.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PhaseSalaEspera({ onStart, isProf }) {
  
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pin, setPin] = useState('');
  const [myTeamId, setMyTeamId] = useState(null);

  // --- EFECTO: CARGAR DATOS DEL BACKEND ---
  useEffect(() => {
    // Obtener datos del estudiante del localStorage
    const partidaId = localStorage.getItem('partida_id');
    const partidaCodigo = localStorage.getItem('partida_codigo');
    const equipoId = localStorage.getItem('equipo_id');
    
    if (!partidaId) {
      setError('No se encontró información de la partida');
      setIsLoading(false);
      return;
    }

    setPin(partidaCodigo || '');
    setMyTeamId(equipoId ? parseInt(equipoId) : null);

    // Función para cargar grupos desde el backend
    const cargarGrupos = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/partida/${partidaId}/obtener-grupos/`
        );
        
        if (response.data && response.data.grupos) {
          // Transformar los datos del backend al formato del componente
          const gruposFormateados = response.data.grupos.map(grupo => ({
            id: grupo.equipo_id,
            name: grupo.nombre_equipo,
            members: (grupo.usuarios || []).map(usuario => 
              `${usuario.nombre} ${usuario.apellido}`.trim()
            ),
            max: 4,
            codigo: grupo.codigo_equipo
          }));
          
          setGroups(gruposFormateados);
          setError(null);
        }
      } catch (err) {
        console.error('Error al cargar grupos:', err);
        setError('Error al cargar los grupos de la partida');
      } finally {
        setIsLoading(false);
      }
    };

    // Función para detectar cambio de estado (profesor inicia juego)
    const checkEstadoPartida = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/partida/${partidaId}/estado-actual/`
        );
        
        // Si el estado es INICIADA o fase >= 1, iniciar el juego (ir a fase 0 = video)
        if (response.data && (response.data.estado_actual === 'INICIADA' || response.data.fase_actual >= 1)) {
          console.log('🎮 Juego iniciado por el profesor, avanzando a video...');
          onStart(); // Llama a la función del padre que cambia phase de -1 a 0
        }
      } catch (err) {
        console.error('Error al verificar estado:', err);
        // No mostrar error al usuario, solo log
      }
    };

    // Cargar grupos inmediatamente
    cargarGrupos();

    // Polling: actualizar cada 3 segundos para ver nuevos estudiantes que se unan
    const pollingInterval = setInterval(cargarGrupos, 3000);

    // Polling de estado: verificar cada 2 segundos si el juego inició
    const estadoInterval = setInterval(checkEstadoPartida, 2000);

    return () => {
      clearInterval(pollingInterval);
      clearInterval(estadoInterval);
    };
  }, []);

  // Calcular total de jugadores conectados (CON PROTECCIÓN '?.')
  const totalPlayers = groups.reduce((acc, g) => acc + (g?.members?.length || 0), 0);

  // Mostrar error si existe
  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-20 px-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-lg font-semibold">❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      
      {/* --- HEADER --- */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 text-center border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-mint-400 via-blue-500 to-purple-500"></div>

        <h1 className="text-4xl font-extrabold text-slate-800 mb-2">Sala de Espera</h1>
        
        <div className="inline-block bg-slate-100 rounded-xl px-6 py-3 mb-6 border border-slate-200">
          <span className="text-slate-500 text-sm uppercase tracking-wider font-bold mr-3">PIN DE LA SALA:</span>
          <span className="text-3xl font-mono font-bold text-slate-800 tracking-widest">{pin || 'Cargando...'}</span>
        </div>

        <p className="text-slate-600 mb-6 max-w-2xl mx-auto text-lg">
          {isLoading 
            ? "Cargando equipos de la partida..." 
            : `¡${groups.length} equipos listos! Esperando que todos los estudiantes se unan.`}
        </p>

        {/* GIF Lúdico */}
        <div className="flex justify-center mb-6">
          <img 
            src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXBhZ2Z5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5eGZ5/xTk9ZvMnbIiIew7IpW/giphy.gif" 
            alt="Esperando..." 
            className="h-32 rounded-xl shadow-inner object-cover"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
        
        {/* Botón de inicio */}
        {isProf && (
          <button
            onClick={onStart}
            className="btn bg-mint-500 hover:bg-mint-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transform transition hover:scale-105"
          >
            ▶ Iniciar Votación Ahora
          </button>
        )}
      </div>

      {/* --- GRID DE GRUPOS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          // Skeleton loading
          [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-50 rounded-2xl h-64 animate-pulse"></div>
          ))
        ) : groups.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500 text-lg">No se encontraron equipos en esta partida</p>
          </div>
        ) : (
          groups.map((group, index) => {
            // Protección: Si el grupo es undefined, renderizar un placeholder seguro
            if (!group) return <div key={index} className="bg-slate-50 rounded-2xl h-40 animate-pulse"></div>;

            const hasMembers = group.members && group.members.length > 0;
            const isMyTeam = myTeamId && group.id === myTeamId;
            
            // Colores: amarillo si es mi equipo, verde si tiene miembros, gris si está vacío
            let headerColorClass = 'bg-slate-50';
            let borderClass = 'border-slate-100';
            let shadowClass = 'shadow-md';
            
            if (isMyTeam) {
              headerColorClass = 'bg-amber-100';
              borderClass = 'border-amber-300';
              shadowClass = 'shadow-lg ring-2 ring-amber-400';
            } else if (hasMembers) {
              headerColorClass = 'bg-emerald-50';
              borderClass = 'border-emerald-200';
            }

            return (
              <div key={group.id} className={`bg-white rounded-2xl ${shadowClass} overflow-hidden border ${borderClass} flex flex-col transition-all duration-500 relative`}>
                
                {/* Badge "Tu equipo" */}
                {isMyTeam && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-pulse">
                      ⭐ Tu equipo
                    </span>
                  </div>
                )}

                {/* Cabecera del Grupo */}
                <div className={`p-4 border-b border-slate-100 flex justify-between items-center transition-colors duration-500 ${headerColorClass}`}>
                  <h3 className={`font-bold truncate ${hasMembers || isMyTeam ? 'text-slate-800' : 'text-slate-400'}`}>
                    {group.name}
                  </h3>
                  <span className="bg-white/80 px-2 py-1 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
                    {group.members?.length || 0}/{group.max}
                  </span>
                </div>

                {/* Código de Equipo (si es mi equipo) */}
                {isMyTeam && group.codigo && (
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs text-amber-700 font-mono">
                      Código: <span className="font-bold">{group.codigo}</span>
                    </p>
                  </div>
                )}

                {/* Lista de Miembros */}
                <div className="p-4 flex-1 min-h-[140px] bg-slate-50/30">
                  {!hasMembers ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm space-y-3">
                      {/* Spinner animado */}
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-500">Esperando que se unan...</p>
                        <p className="text-xs text-slate-400 mt-1">Ningún estudiante conectado aún</p>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {group.members.map((member, idx) => (
                        <li key={idx} className={`flex items-center gap-3 p-2 rounded-lg border shadow-sm animate-in fade-in zoom-in duration-300 ${
                          isMyTeam ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            isMyTeam ? 'bg-amber-500' : getAvatarColor(idx)
                          }`}>
                            {member.charAt(0).toUpperCase()}
                          </div>
                          <span className={`font-medium text-sm ${
                            isMyTeam ? 'text-amber-900' : 'text-slate-700'
                          }`}>{member}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-8 text-center space-y-3">
        <span className="inline-flex items-center gap-2 bg-slate-900/80 backdrop-blur-md text-white px-5 py-2 rounded-full shadow-lg border border-white/10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-mint-500"></span>
          </span>
          <span className="font-mono font-bold text-lg">{totalPlayers}</span>
          <span className="text-sm font-medium opacity-90">estudiantes conectados</span>
        </span>
        
        {myTeamId && (
          <p className="text-slate-500 text-sm">
            Estás en el <span className="font-bold text-amber-600">{groups.find(g => g.id === myTeamId)?.name || 'equipo'}</span>
          </p>
        )}

        <p className="text-slate-400 text-xs">
          🔄 Actualizando en tiempo real cada 3 segundos
        </p>
      </div>

    </div>
  );
}

// Helper para colores de avatares
function getAvatarColor(index) {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", 
    "bg-green-500", "bg-emerald-500", "bg-teal-500", 
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", 
    "bg-indigo-500", "bg-violet-500", "bg-purple-500", 
    "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"
  ];
  return colors[index % colors.length];
}
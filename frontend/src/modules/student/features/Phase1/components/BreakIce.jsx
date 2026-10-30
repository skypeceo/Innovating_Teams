import { API_URL } from '../../../../../config';
import React, { useEffect, useState } from "react";
import Timer from '../../../../../components/Timer';

const EQUIPO_ID_TEST = 1;
const ESTUDIANTES_URL = `${API_URL}/equipos/${EQUIPO_ID_TEST}/estudiantes/`;

function BreakIce({ onComplete }) {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlumnos = async () => {
      try {
        setLoading(true);
        const response = await fetch(ESTUDIANTES_URL);

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();
        setAlumnos(data);
      } catch (err) {
        console.error("Error al cargar estudiantes:", err);
        setError(err.message);
      } finally {
        setLoading(false);

        // Si tu flujo de fase usa onComplete para avanzar
        if (onComplete) onComplete();
      }
    };

    fetchAlumnos();
  }, [onComplete]);

  return (
    <div className="p-6 bg-slate-50 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-slate-800 mb-0">
          👥 Integrantes del Grupo
        </h3>
        <div className="text-2xl font-mono font-bold text-emerald-600">
          <Timer initialSeconds={300} autoStart={false} isProf={false} />
        </div>
      </div>

      {loading && (
        <p className="text-slate-600 italic">Cargando estudiantes...</p>
      )}

      {error && (
        <p className="text-red-600 font-semibold">
          Error al cargar datos: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {alumnos.length > 0 ? (
            <table className="min-w-full border border-slate-300 bg-white rounded-lg">
              <thead className="bg-slate-200">
                <tr>
                  <th className="py-2 px-4 border-b text-left text-slate-700 font-semibold">
                    #
                  </th>
                  <th className="py-2 px-4 border-b text-left text-slate-700 font-semibold">
                    Nombre
                  </th>
                  <th className="py-2 px-4 border-b text-left text-slate-700 font-semibold">
                    Apellido
                  </th>
                  <th className="py-2 px-4 border-b text-left text-slate-700 font-semibold">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((alumno, index) => (
                  <tr
                    key={alumno.id}
                    className="hover:bg-slate-100 transition-colors"
                  >
                    <td className="py-2 px-4 border-b text-center">{index + 1}</td>
                    <td className="py-2 px-4 border-b">
                      {alumno.usuario?.nombre || "-"}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {alumno.usuario?.apellido || "-"}
                    </td>
                    <td className="py-2 px-4 border-b text-slate-600">
                      {alumno.usuario?.email || "Sin correo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-500">
              No hay estudiantes registrados en este equipo.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default BreakIce;

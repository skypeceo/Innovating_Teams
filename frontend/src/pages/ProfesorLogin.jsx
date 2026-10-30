import { API_URL } from '../config';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showErrorAlert, showSuccessAlert } from "../utils/sweetAlerts"; // Importa las funciones
export default function ProfesorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Endpoint específico para profesores
      const url = `${API_URL}/login/profesor/`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorMessage = "Credenciales inválidas";
        showErrorAlert(errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await res.json();

      if (data.role !== "PROFESOR") {
        const errorMessage = "No tiene permisos para acceder como profesor";
        showErrorAlert(errorMessage);
        throw new Error(errorMessage);
      }





      // Guarda el token y otros datos en localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);

      
      showSuccessAlert("Inicio de sesión exitoso");
      // Redirige al módulo de profesores
      navigate("/profesor");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1200px_600px_at_80%_10%,#204b86_0%,#163a6a_40%,#0f2b4d_100%)] text-white relative overflow-hidden">
      {/* ← Volver */}
      <a
        href="/prelogin"
        className="absolute top-6 left-6 text-white opacity-80 hover:opacity-100 transition"
      >
        ← Volver
      </a>

      {/* Tarjeta */}
      <section className="bg-white text-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-grid w-16 h-16 place-items-center bg-gradient-to-br from-[#3AB6B5] to-[#1E5AA8] text-white font-bold rounded-xl mx-auto mb-3">
            IT
          </div>
          <h2 className="text-3xl font-extrabold text-[#0b1f3a] mb-1">
            Iniciar sesión como Profesor
          </h2>
          <p className="text-gray-500 text-sm">
            Accede a tu cuenta para gestionar tus clases
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-semibold">Correo electrónico</label>
            <input
              type="email"
              placeholder="usuario@innovating.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 rounded-lg border focus:ring-2 focus:ring-[#1E5AA8] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 rounded-lg border focus:ring-2 focus:ring-[#1E5AA8] focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-red-600 bg-red-100 p-2 rounded-lg text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-[#F68C1F] hover:bg-[#e97a18] text-white py-3 font-bold rounded-lg shadow-lg transition-transform transform hover:-translate-y-[2px] active:translate-y-0"
          >
            Ingresar
          </button>
        </form>



          <footer className="text-center text-gray-500 text-sm mt-6">
          Correo: usuario2@innovate.com | Contraseña: contraseña123
        </footer>
        <footer className="text-center text-gray-500 text-sm mt-6">
          © 2025 Innovating Team
        </footer>
      </section>
    </div>
  );
}
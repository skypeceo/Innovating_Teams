import { API_URL } from '../config';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showErrorAlert, showSuccessAlert } from "../utils/sweetAlerts"; // Importa las funciones
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Endpoint específico para administradores
      const url = `${API_URL}/login/admin/`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      

      if (!res.ok) throw new Error("Credenciales inválidas");
      const data = await res.json();

      // Verifica que el rol sea "ADMINISTRADOR"
     if (data.role !== "ADMINISTRADOR") {
        const errorMessage = "No tiene permisos para acceder como administrador";
        showErrorAlert(errorMessage); // Mostrar alerta de error
        throw new Error(errorMessage);
      }

      // Guarda el token y otros datos en localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);

      showSuccessAlert("Inicio de sesión exitoso");

      // Redirige al módulo de administradores
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1000px_500px_at_70%_10%,#0f2b4d_0%,#0b1f3a_45%,#07152a_100%)] text-white relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[60vw] h-[60vw] bg-gradient-to-br from-[#1E5AA8] to-[#3AB6B5] rounded-full blur-[140px] opacity-20 -top-[20vh] -left-[15vw]"></div>
        <div className="absolute w-[70vw] h-[70vw] bg-gradient-to-tr from-[#3AB6B5] to-[#1E5AA8] rounded-full blur-[160px] opacity-25 -bottom-[25vh] -right-[20vw]"></div>
      </div>

      <section className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="text-center mb-6">
          <div className="inline-grid w-16 h-16 place-items-center bg-gradient-to-br from-[#3AB6B5] to-[#1E5AA8] text-white font-bold rounded-xl mx-auto mb-4 shadow-lg">
            ADM
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Panel Administrador</h2>
          <p className="text-white/70 text-sm">Acceso privado</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-semibold text-sm">Correo corporativo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@innovating.com"
              className="mt-1 w-full px-4 py-2 rounded-lg bg-white/15 border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#3AB6B5] placeholder-white/40 text-black"
            />
          </div>

          <div>
            <label className="font-semibold text-sm">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full px-4 py-2 rounded-lg bg-white/15 border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#3AB6B5] placeholder-white/40 text-black"
            />
          </div>

          {error && (
            <p className="text-red-300 bg-red-900/40 border border-red-600/40 px-3 py-2 rounded-lg text-center text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#1E5AA8] to-[#3AB6B5] hover:brightness-110 active:brightness-95 text-white py-3 font-bold rounded-xl shadow-lg transition-transform transform hover:-translate-y-[2px]"
          >
            Ingresar
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/60">
          <p>Uso exclusivo de administradores autorizados.</p>
          <p>Correo: usuario5@innovate.com</p>
          <p>Contraseña: contraseña123</p>
          <a href="/prelogin" className="underline hover:text-white/90">Volver</a>
        </div>
      </section>
    </div>
  );
}
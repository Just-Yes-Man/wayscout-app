import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { MapPin, AlertTriangle } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulación de login - en producción conectaría con backend
    navigate("/");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4 shadow-sm">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl text-slate-900 mb-2">WayScout</h1>
          <p className="text-slate-600">
            Alertas en tiempo real para tus viajes
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="space-y-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
          >
            Iniciar Sesión
          </Button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-slate-600">
            ¿No tienes cuenta?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-blue-600 underline hover:text-blue-700"
            >
              Regístrate aquí
            </button>
          </p>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">
              Recibe notificaciones sobre deslaves, tráfico y condiciones
              climáticas en tiempo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

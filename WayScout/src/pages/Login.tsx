import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { MapPin, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const getLoginErrorMessage = (error: unknown) => {
    if (error && typeof error === "object" && "code" in error) {
      switch ((error as { code: string }).code) {
        case "auth/invalid-credential":
          return "Credenciales incorrectas. Revisa tu correo y contraseña.";
        case "auth/user-not-found":
          return "No encontramos una cuenta con ese correo.";
        case "auth/invalid-email":
          return "El correo no tiene un formato valido.";
        case "auth/too-many-requests":
          return "Demasiados intentos. Intentalo mas tarde.";
        default:
          return "No fue posible iniciar sesion. Intenta de nuevo.";
      }
    }
    return "No fue posible iniciar sesion. Intenta de nuevo.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      const destination =
        (location.state as { from?: string } | null)?.from ?? "/";
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setErrorMessage("Ingresa tu correo para recuperar la contrasena.");
      return;
    }

    setIsResetting(true);
    setErrorMessage(null);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setErrorMessage("Te enviamos un correo para restablecer la contrasena.");
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsResetting(false);
    }
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
          <div className="text-center">
            <h2 className="text-xl text-slate-900">Bienvenido de vuelta</h2>
            <p className="text-sm text-slate-500">
              Ingresa con tu correo para continuar
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Ingresando..." : "Iniciar Sesión"}
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
          <button
            onClick={handlePasswordReset}
            className="mt-3 text-sm text-slate-500 hover:text-slate-700"
            disabled={isResetting}
          >
            {isResetting ? "Enviando correo..." : "¿Olvidaste tu contraseña?"}
          </button>
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

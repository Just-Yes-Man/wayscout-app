import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { MapPin, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getRegisterErrorMessage = (error: unknown) => {
    if (error && typeof error === "object" && "code" in error) {
      switch ((error as { code: string }).code) {
        case "auth/email-already-in-use":
          return "Ya existe una cuenta con ese correo.";
        case "auth/invalid-email":
          return "El correo no tiene un formato valido.";
        case "auth/weak-password":
          return "La contrasena debe tener al menos 6 caracteres.";
        default:
          return "No fue posible crear la cuenta. Intenta de nuevo.";
      }
    }
    return "No fue posible crear la cuenta. Intenta de nuevo.";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(getRegisterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4 shadow-sm">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl text-slate-900 mb-2">Crear Cuenta</h1>
          <p className="text-slate-600">Únete a nuestra comunidad</p>
        </div>

        {/* Register Form */}
        <form
          onSubmit={handleRegister}
          className="space-y-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
        >
          {errorMessage ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700">
              Nombre completo
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
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
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-700">
              Confirmar contraseña
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando cuenta..." : "Registrarse"}
          </Button>
        </form>

        {/* Terms */}
        <p className="mt-6 text-sm text-center text-slate-600">
          Al registrarte aceptas nuestros{" "}
          <span className="underline">Términos y Condiciones</span> y{" "}
          <span className="underline">Política de Privacidad</span>
        </p>
      </div>
    </div>
  );
}

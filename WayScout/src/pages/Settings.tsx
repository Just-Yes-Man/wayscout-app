import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Bell,
  MapPin,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Car,
  CloudRain,
} from "lucide-react";

export function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState({
    all: true,
    deslave: true,
    trafico: true,
    clima: false,
    nearby: true,
    verified: true,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-4">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-5 border-b border-slate-100 mb-4">
        <h1 className="text-2xl mb-1 text-slate-900">Configuración</h1>
        <p className="text-slate-500 text-sm">Personaliza tu experiencia</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-slate-900">Perfil</h3>
          </div>
          <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-slate-900">{user?.name ?? "Usuario"}</p>
                <p className="text-sm text-slate-600">{user?.email ?? ""}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-900 mb-1">Todas las notificaciones</p>
                <p className="text-sm text-slate-600">
                  Activar/desactivar todas
                </p>
              </div>
              <Switch
                checked={notifications.all}
                onCheckedChange={() => toggleNotification("all")}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-slate-900">Deslaves</p>
                  <p className="text-sm text-slate-600">Alertas de derrumbes</p>
                </div>
              </div>
              <Switch
                checked={notifications.deslave}
                onCheckedChange={() => toggleNotification("deslave")}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-slate-900">Tráfico</p>
                  <p className="text-sm text-slate-600">Congestión vehicular</p>
                </div>
              </div>
              <Switch
                checked={notifications.trafico}
                onCheckedChange={() => toggleNotification("trafico")}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CloudRain className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-slate-900">Clima</p>
                  <p className="text-sm text-slate-600">Condiciones adversas</p>
                </div>
              </div>
              <Switch
                checked={notifications.clima}
                onCheckedChange={() => toggleNotification("clima")}
              />
            </div>
          </div>
        </div>


        {/* Location Preferences */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Preferencias de Ubicación
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-900 mb-1">Alertas cercanas</p>
                <p className="text-sm text-slate-600">
                  Solo eventos en tu área (5km)
                </p>
              </div>
              <Switch
                checked={notifications.nearby}
                onCheckedChange={() => toggleNotification("nearby")}
              />
            </div>

            <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="text-left">
                <p className="text-slate-900 mb-1">Radio de alertas</p>
                <p className="text-sm text-slate-600">5 kilómetros</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Verification */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Verificación
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-900 mb-1">Solo reportes verificados</p>
                <p className="text-sm text-slate-600">
                  Mostrar solo canales oficiales
                </p>
              </div>
              <Switch
                checked={notifications.verified}
                onCheckedChange={() => toggleNotification("verified")}
              />
            </div>

            <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="text-left">
                <p className="text-slate-900 mb-1">Convertirte en verificado</p>
                <p className="text-sm text-slate-600">
                  Solicita verificación de tu cuenta
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Other Options */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span className="text-slate-900">Ayuda y Soporte</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
          <div className="text-center text-sm text-slate-500 space-y-1">
            <p>WayScout v1.0.0</p>
            <p>© 2026 WayScout. Todos los derechos reservados.</p>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full py-6 border-red-300 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}

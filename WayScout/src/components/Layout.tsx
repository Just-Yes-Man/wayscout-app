import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, Settings, PlusCircle } from "lucide-react";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="border-t border-border bg-card shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          <button
            onClick={() => navigate("/")}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              isActive("/")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs">Inicio</span>
          </button>

          <button
            onClick={() => navigate("/create-report")}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              isActive("/create-report")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlusCircle className="w-6 h-6 mb-1" />
            <span className="text-xs">Reportar</span>
          </button>

          <button
            onClick={() => navigate("/settings")}
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              isActive("/settings")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

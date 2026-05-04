import { createBrowserRouter } from "react-router-dom";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { EventDetail } from "./pages/EventDetail";
import { CreateReport } from "./pages/CreateReport";
import { Settings } from "./pages/Settings";
import { PlanTrip } from "./pages/PlanTrip";
import { Layout } from "./components/Layout";
import { RedirectIfAuth, RequireAuth } from "./components/auth/AuthGate";

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuth />,
    children: [
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/register",
        Component: Register,
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Home },
          { path: "event/:id", Component: EventDetail },
          { path: "create-report", Component: CreateReport },
          { path: "plan-trip", Component: PlanTrip },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);

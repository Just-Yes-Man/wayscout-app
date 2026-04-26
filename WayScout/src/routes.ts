import { createBrowserRouter } from "react-router-dom";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { EventDetail } from "./pages/EventDetail";
import { CreateReport } from "./pages/CreateReport";
import { Settings } from "./pages/Settings";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "event/:id", Component: EventDetail },
      { path: "create-report", Component: CreateReport },
      { path: "settings", Component: Settings },
    ],
  },
]);

import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardLogistica from "./DashboardLogistica";
import DashboardSuperAdmin from "./DashboardSuperAdmin";

const Index = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // SuperAdmin → platform management only
  if (user.role === 'superadm') return <DashboardSuperAdmin />;

  // RH / Convidado (visualizador) → RH dashboard
  if (user.role === 'rh' || user.role === 'visualizador') return <Navigate to="/rh" replace />;

  // Solicitante → go to solicitations directly
  if (user.role === 'solicitante') return <Navigate to="/solicitar-material" replace />;

  // Admin, Logística, Almoxarifado → Logistics dashboard
  return <DashboardLogistica />;
};

export default Index;

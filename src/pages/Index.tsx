import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardLogistica from "./DashboardLogistica";

const Index = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // Role-based routing: RH goes to /rh, visualizador goes to /rh (read-only)
  if (user.role === 'rh') return <Navigate to="/rh" replace />;
  if (user.role === 'visualizador') return <Navigate to="/rh" replace />;

  // Logística, admin, superadm, etc → Logistics dashboard
  return <DashboardLogistica />;
};

export default Index;

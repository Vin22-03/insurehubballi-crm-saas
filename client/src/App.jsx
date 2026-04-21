import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import { useAuth } from "./context/AuthContext";
import AdminAdvisors from "./pages/AdminAdvisors";
import AdminTemplates from "./pages/AdminTemplates";
import AdvisorLeads from "./pages/AdvisorLeads";
function ProtectedRoute({ children, allowedRole }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/advisor"
        element={
          <ProtectedRoute allowedRole="ADVISOR">
            <AdvisorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/advisors"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminAdvisors />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/templates"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminTemplates />
    </ProtectedRoute>
  }
/>
<Route
  path="/advisor/leads"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <AdvisorLeads />
    </ProtectedRoute>
  }
/>
    </Routes>
    
  );
}

export default App;
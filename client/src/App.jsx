import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import { useAuth } from "./context/AuthContext";
import AdminAdvisors from "./pages/AdminAdvisors";
import AdminTemplates from "./pages/AdminTemplates";
import AdvisorLeads from "./pages/AdvisorLeads";
import AdminAdvisorPerformance from "./pages/AdminAdvisorPerformance";
import AdminAdvisorLeads from "./pages/AdminAdvisorLeads";
import AdvisorBrowseContacts from "./pages/AdvisorBrowseContacts";
import AdvisorContactsHome from "./pages/AdvisorContactsHome";
import AdvisorCreateContact from "./pages/AdvisorCreateContact";
import AdvisorImportContacts from "./pages/AdvisorImportContacts";
import AdvisorContactBatches from "./pages/AdvisorContactBatches";
import AdminContacts from "./pages/AdminContacts";
import ProfilePage from "./pages/ProfilePage";
import AdminPasswordRequests from "./pages/AdminPasswordRequests";
import AdminResources from "./pages/AdminResources";
import AdvisorResources from "./pages/AdvisorResources";
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
  path="/advisor/profile"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <ProfilePage />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/resources"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminResources />
    </ProtectedRoute>
  }
/>

<Route
  path="/advisor/resources"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <AdvisorResources />
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
<Route
  path="/admin/password-requests"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminPasswordRequests />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/advisors/performance"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminAdvisorPerformance />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/advisors/:advisorId/leads"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminAdvisorLeads />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/contacts"
  element={
    <ProtectedRoute allowedRole="ADMIN">
      <AdminContacts />
    </ProtectedRoute>
  }
/>
<Route
  path="/advisor/contacts/browse"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <AdvisorBrowseContacts />
    </ProtectedRoute>
  }
/>
<Route
  path="/advisor/contacts"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <AdvisorContactsHome />
    </ProtectedRoute>
  }
/>
<Route
  path="/advisor/contacts/create"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <AdvisorCreateContact />
    </ProtectedRoute>
  }
/>
<Route
  path="/advisor/contacts/import"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <AdvisorImportContacts />
    </ProtectedRoute>
  }
/>
<Route
  path="/advisor/contacts/batches"
  element={
    <ProtectedRoute allowedRole="ADVISOR">
      <AdvisorContactBatches />
    </ProtectedRoute>
  }
/>
    </Routes>
    
  );
}

export default App;
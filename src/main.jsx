import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import StaffLogin from "./portals/StaffLogin";

function App() {
  const [session, setSession] = useState(null);

  if (!session) {
    return <StaffLogin onAuthenticated={setSession} />;
  }

  // TODO: once authenticated, route into onboarding form (if needsOnboarding),
  // then password change (if needsPasswordChange), then the main Staff Portal
  // UI — reuse the screens already built in BDWaksStaffPortal.jsx, swapping
  // MOCK_STAFF for `session.staff` and grantedModules for `session.modules`.
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 border border-bdborder max-w-md w-full">
        <h2 className="font-display text-xl font-bold mb-2">Logged in ✅</h2>
        <p className="text-sm text-bdmuted mb-1">Welcome, {session.staff.full_name}</p>
        <p className="text-xs text-bdmuted mb-3">Staff ID: {session.staff.staff_id}</p>
        <p className="text-xs text-bdmuted">Modules granted: {session.modules.join(", ") || "none yet"}</p>
        {session.needsOnboarding && (
          <p className="text-xs mt-3 text-red-600">⚠ Onboarding form must be completed before password change.</p>
        )}
        {session.needsPasswordChange && (
          <p className="text-xs mt-1 text-amber-600">⚠ Password change required.</p>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

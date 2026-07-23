import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import StaffLogin from "./portals/StaffLogin";
import AdminDashboard from "./portals/AdminDashboard";
import CustomerPortal from "./portals/CustomerPortal";
import RiderPortal from "./portals/RiderPortal";

const PORTALS = [
  { key: "staff", label: "🧑‍💼 Staff", emoji: "🧑‍💼" },
  { key: "customer", label: "🛒 Customer", emoji: "🛒" },
  { key: "rider", label: "🏍️ Rider", emoji: "🏍️" },
];

function App() {
  const [activePortal, setActivePortal] = useState("staff");
  const [staffSession, setStaffSession] = useState(null);

  return (
    <div>
      {/* Portal switcher — for testing all three at once. Remove/hide this
          before real customers or riders use their own dedicated domains. */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-bdink flex justify-center gap-1 p-1.5 shadow-lg">
        {PORTALS.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePortal(p.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold ${activePortal === p.key ? "bg-bdgold text-bdgreen" : "text-bdivory"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="pt-11">
        {activePortal === "staff" && <StaffPortalFlow session={staffSession} setSession={setStaffSession} />}
        {activePortal === "customer" && <CustomerPortal />}
        {activePortal === "rider" && <RiderPortal />}
      </div>
    </div>
  );
}

function StaffPortalFlow({ session, setSession }) {
  if (!session) {
    return <StaffLogin onAuthenticated={setSession} />;
  }

  if (session.needsOnboarding || session.needsPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 border border-bdborder max-w-md w-full">
          <h2 className="font-display text-xl font-bold mb-2">🕓 Almost there</h2>
          <p className="text-sm text-bdmuted mb-1">Welcome, {session.staff.full_name}</p>
          {session.needsOnboarding && (
            <p className="text-xs mt-3 text-red-600">⚠️ Onboarding form must be completed before password change. (Screen coming in the next build pass.)</p>
          )}
          {session.needsPasswordChange && (
            <p className="text-xs mt-1 text-amber-600">⚠️ Password change required. (Screen coming in the next build pass.)</p>
          )}
          <button
            onClick={() => setSession({ ...session, needsOnboarding: false, needsPasswordChange: false })}
            className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold bg-bdgreen text-bdgold"
          >
            Skip for now (testing only)
          </button>
        </div>
      </div>
    );
  }

  if (session.modules.includes("admin")) {
    return <AdminDashboard session={session} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 border border-bdborder max-w-md w-full">
        <h2 className="font-display text-xl font-bold mb-2">✅ Logged in</h2>
        <p className="text-sm text-bdmuted mb-1">Welcome, {session.staff.full_name}</p>
        <p className="text-xs text-bdmuted mb-3">Staff ID: {session.staff.staff_id}</p>
        <p className="text-xs text-bdmuted">Modules granted: {session.modules.join(", ") || "none yet"}</p>
        <p className="text-xs mt-3 text-bdmuted">Non-admin module dashboards are built in upcoming passes.</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

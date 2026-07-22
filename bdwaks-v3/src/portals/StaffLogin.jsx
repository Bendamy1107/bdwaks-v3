import React, { useState } from "react";
import { loginStaff } from "../lib/auth";
import { getStaffModuleAccess, getStaffSpecialPermissions } from "../lib/auth";

/**
 * Real, working staff login. On success, calls onAuthenticated with:
 *   { staff, modules, permissions, needsOnboarding, needsPasswordChange }
 * The parent app should route accordingly (onboarding form -> password
 * change -> main portal), matching BDWaks_System_Spec.md exactly.
 */
export default function StaffLogin({ onAuthenticated }) {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");
    if (!staffId || !password) {
      setErrorMsg("Enter your Staff ID and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await loginStaff(staffId.trim(), password);
      if (!result.success) {
        setErrorMsg(result.message);
        setLoading(false);
        return;
      }
      const { staff } = result;
      const [modules, permissions] = await Promise.all([
        getStaffModuleAccess(staff.id),
        getStaffSpecialPermissions(staff.id),
      ]);

      onAuthenticated({
        staff,
        modules,
        permissions,
        needsOnboarding: !staff.onboarding_form_completed,
        needsPasswordChange: staff.must_change_password,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bdgreen">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-center mb-1 text-bdivory">BD Waks</h1>
        <p className="text-center text-sm mb-8 text-bdgold">Staff Portal Login</p>

        <div className="bg-white rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-bdmuted">Staff ID</label>
            <input
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="BDW/BO-1807"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-bdborder text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-bdmuted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-bdborder text-sm outline-none"
            />
          </div>

          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50"
          >
            {loading ? "Checking..." : "Log in"}
          </button>
          <p className="text-[11px] text-center text-bdmuted">
            First login? Use the default password given to you at enrollment.
          </p>
        </div>
      </div>
    </div>
  );
}

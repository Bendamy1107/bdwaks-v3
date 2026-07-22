import React, { useState, useEffect, useCallback } from "react";
import { loginRider } from "../lib/auth";
import {
  setRiderOnlineStatus, getRiderIncomingAssignments, getRiderActiveOrder,
  respondToAssignment, updateOrderStatus, getRiderEarnings,
} from "../lib/api";

export default function RiderPortal() {
  const [session, setSession] = useState(null);
  if (!session) return <RiderLogin onAuthenticated={setSession} />;
  return <RiderHome session={session} />;
}

function RiderLogin({ onAuthenticated }) {
  const [riderId, setRiderId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");
    if (!riderId || !password) { setErrorMsg("❌ Enter your Rider ID and password."); return; }
    setLoading(true);
    try {
      const result = await loginRider(riderId.trim(), password);
      if (!result.success) { setErrorMsg("❌ " + result.message); setLoading(false); return; }
      onAuthenticated({ rider: result.rider });
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bdgreen">
      <div className="w-full max-w-sm">
        <p className="text-5xl text-center mb-2">🏍️</p>
        <h1 className="font-display text-3xl font-bold text-center mb-1 text-bdivory">BD Waks</h1>
        <p className="text-center text-sm mb-8 text-bdgold">Rider Portal</p>
        <div className="bg-white rounded-2xl p-6 space-y-4">
          <input value={riderId} onChange={(e) => setRiderId(e.target.value)} placeholder="Rider ID (e.g. BDW/RD-1807)" className="w-full px-3 py-2.5 rounded-xl border border-bdborder text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Password" className="w-full px-3 py-2.5 rounded-xl border border-bdborder text-sm" />
          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
          <button onClick={handleLogin} disabled={loading} className="w-full py-3 rounded-xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
            {loading ? "Checking..." : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RiderHome({ session }) {
  const [screen, setScreen] = useState("home"); // home | earnings
  const [isOnline, setIsOnline] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignData, activeData, earningsData] = await Promise.all([
        getRiderIncomingAssignments(session.rider.id),
        getRiderActiveOrder(session.rider.id),
        getRiderEarnings(session.rider.id),
      ]);
      setAssignments(assignData);
      setActiveOrder(activeData);
      setEarnings(earningsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session.rider.id]);

  useEffect(() => { load(); }, [load]);

  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    try { await setRiderOnlineStatus(session.rider.id, next); } catch (err) { console.error(err); }
  };

  const respond = async (assignment, response) => {
    try {
      await respondToAssignment(assignment.id, response, session.rider.id, assignment.order.id);
      await load();
    } catch (err) { console.error(err); alert("❌ Failed to respond."); }
  };

  const advanceStatus = async (nextStatus) => {
    try { await updateOrderStatus(activeOrder.id, nextStatus); await load(); }
    catch (err) { console.error(err); alert("❌ Failed to update status."); }
  };

  const weekTotal = earnings.reduce((s, e) => s + Number(e.amount), 0);

  if (screen === "earnings") {
    return (
      <div className="min-h-screen bg-bdivory pb-10">
        <div className="sticky top-0 z-20 px-5 py-4 flex items-center gap-3 bg-bdgreen">
          <button onClick={() => setScreen("home")} className="text-bdivory">⬅</button>
          <h2 className="font-display font-bold text-lg text-bdivory">💰 Earnings</h2>
        </div>
        <div className="p-5">
          <div className="rounded-2xl p-5 mb-4 bg-bdgreen">
            <p className="text-xs text-bdgold">Total (90% share, paid weekly)</p>
            <p className="font-display text-3xl font-bold text-bdivory mt-1">₦{weekTotal.toLocaleString()}</p>
          </div>
          <div className="space-y-2">
            {earnings.length === 0 && <p className="text-sm text-bdmuted text-center py-8">No earnings recorded yet.</p>}
            {earnings.map((e) => (
              <div key={e.id} className="bg-white rounded-xl p-3 border border-bdborder flex justify-between">
                <p className="text-xs text-bdmuted">{new Date(e.created_at).toLocaleDateString()}</p>
                <p className="font-display font-bold text-bdgreen">₦{Number(e.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bdivory pb-10">
      <header className="bg-bdgreen px-5 pt-6 pb-8">
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-bdivory">🌿 BD Waks</h1>
            <p className="text-xs text-bdgold">{session.rider.full_name} · {session.rider.rider_id}</p>
          </div>
          <button onClick={() => setScreen("earnings")} className="text-2xl">💰</button>
        </div>
        <div className="bg-white rounded-2xl p-5 text-center">
          <p className="text-sm text-bdmuted mb-3">{isOnline ? "🟢 You're online" : "⚪ You're offline"}</p>
          <button onClick={toggleOnline} className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl ${isOnline ? "bg-bdgreen" : "bg-gray-200"}`}>
            {isOnline ? "🟢" : "⚪"}
          </button>
          <p className={`text-xs font-semibold mt-3 ${isOnline ? "text-bdgreen" : "text-bdmuted"}`}>{isOnline ? "Go offline" : "Go online"}</p>
        </div>
      </header>

      <div className="px-5 -mt-4 space-y-3">
        {loading && <p className="text-sm text-bdmuted">Loading...</p>}

        {!loading && assignments.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl p-4 border-2 border-bdgold shadow-md">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">📬 New order request</span>
              <span className="font-display font-bold text-sm text-bdgreen">{a.order?.order_number}</span>
            </div>
            <p className="text-sm text-bdmuted mb-1">📍 {a.order?.delivery_address}</p>
            <p className="text-sm text-bdmuted mb-3">📞 {a.order?.guest_phone}</p>
            <div className="flex gap-2">
              <button onClick={() => respond(a, "rejected")} className="flex-1 py-2.5 rounded-xl font-semibold border-2 border-red-500 text-red-600">❌ Reject</button>
              <button onClick={() => respond(a, "accepted")} className="flex-1 py-2.5 rounded-xl font-semibold bg-bdgreen text-bdgold">✅ Accept</button>
            </div>
          </div>
        ))}

        {!loading && activeOrder && (
          <div className="bg-white rounded-2xl p-4 border border-bdborder">
            <div className="flex justify-between mb-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">🚚 Active delivery</span>
              <span className="font-display font-bold text-sm text-bdgreen">{activeOrder.order_number}</span>
            </div>
            <p className="text-sm text-bdmuted mb-1">📍 {activeOrder.delivery_address}</p>
            <p className="text-sm text-bdmuted mb-3">📞 {activeOrder.guest_phone}</p>
            <p className="text-sm font-medium capitalize mb-3">Status: {activeOrder.status.replace(/_/g, " ")}</p>
            {activeOrder.status === "dispatched" && (
              <button onClick={() => advanceStatus("en_route")} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-bdgreen text-bdgold">🚗 Mark En Route</button>
            )}
            {activeOrder.status === "en_route" && (
              <button onClick={() => advanceStatus("delivered")} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-bdgreen text-bdgold">✅ Mark Delivered</button>
            )}
          </div>
        )}

        {!loading && assignments.length === 0 && !activeOrder && (
          <div className="bg-white rounded-2xl p-6 border border-bdborder text-center">
            <p className="text-sm text-bdmuted">{isOnline ? "⏳ Waiting for order requests..." : "Go online to start receiving orders"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

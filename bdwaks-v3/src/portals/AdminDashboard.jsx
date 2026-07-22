import React, { useState, useEffect, useCallback } from "react";
import {
  getAllStaff, getAllOrders, getPendingPaymentVerifications, verifyPayment,
  getCompanyBankAccount, setCompanyBankAccount, enrollStaffReal, getAllMessages,
  getAllRiders, getAllRiderApplications, decideRiderApplication,
} from "../lib/api";

const MODULES = ["admin", "finance", "payroll", "hr", "inventory", "rider_coordination", "general_manager"];
const PERMISSIONS = ["finance_transaction_approval", "payroll_officer", "deputy_ceo_approval"];

const NAV_ITEMS = [
  { key: "overview", label: "Overview", emoji: "🏠" },
  { key: "staff", label: "Staff Directory", emoji: "👥" },
  { key: "enroll", label: "Enroll Staff", emoji: "➕" },
  { key: "payments", label: "Payment Verification", emoji: "💳" },
  { key: "orders", label: "All Orders", emoji: "📦" },
  { key: "riders", label: "Riders", emoji: "🏍️" },
  { key: "messages", label: "All Messages", emoji: "💬" },
  { key: "bank", label: "Bank Details", emoji: "🏦" },
];

export default function AdminDashboard({ session }) {
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);
  const [messages, setMessages] = useState([]);
  const [riders, setRiders] = useState([]);
  const [riderApplications, setRiderApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [staffData, ordersData, paymentsData, bankData, messagesData, ridersData, applicationsData] = await Promise.all([
        getAllStaff(), getAllOrders(), getPendingPaymentVerifications(), getCompanyBankAccount(),
        getAllMessages(), getAllRiders(), getAllRiderApplications(),
      ]);
      setStaff(staffData); setOrders(ordersData); setPendingPayments(paymentsData);
      setBankAccount(bankData); setMessages(messagesData); setRiders(ridersData); setRiderApplications(applicationsData);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Couldn't load some data — check the console for details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleVerifyPayment = async (orderId) => {
    try { await verifyPayment(orderId, session.staff.id); await loadAll(); }
    catch (err) { console.error(err); alert("❌ Failed to verify payment — check console."); }
  };

  const handleDecideApplication = async (applicationId, status) => {
    try { await decideRiderApplication(applicationId, { status, reviewedBy: session.staff.id }); await loadAll(); }
    catch (err) { console.error(err); alert("❌ Failed to update application — check console."); }
  };

  const pendingApplicationsCount = riderApplications.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-bdivory to-amber-50">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 bg-bdgreen transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5">
          <h1 className="font-display text-xl font-bold text-bdivory">🌿 BD Waks</h1>
          <p className="text-xs text-bdgold">Admin Dashboard</p>
        </div>
        <div className="mx-3 mb-3 px-4 py-3 rounded-xl bg-bdgreendark">
          <p className="text-sm font-semibold text-bdivory">{session.staff.full_name}</p>
          <p className="text-[11px] text-bdgold">{session.staff.staff_id}</p>
        </div>
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const badge = item.key === "payments" ? pendingPayments.length
              : item.key === "riders" ? pendingApplicationsCount : 0;
            return (
              <button
                key={item.key}
                onClick={() => { setTab(item.key); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${tab === item.key ? "bg-bdgold text-bdgreen font-semibold" : "text-bdivory"}`}
              >
                <span className="flex items-center gap-2"><span>{item.emoji}</span>{item.label}</span>
                {badge > 0 && <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">{badge}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-bdgreen">
          <button onClick={() => setSidebarOpen(true)} className="text-bdivory text-xl">☰</button>
          <span className="font-display font-bold text-bdivory">🌿 BD Waks Admin</span>
        </div>

        <div className="p-5 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-bdgreen">
              {NAV_ITEMS.find((n) => n.key === tab)?.emoji} {NAV_ITEMS.find((n) => n.key === tab)?.label}
            </h2>
            <button onClick={loadAll} className="text-xs px-3 py-1.5 rounded-full bg-white border border-bdborder">🔄 Refresh</button>
          </div>

          {loading && <p className="text-sm text-bdmuted">Loading live data...</p>}
          {errorMsg && <p className="text-sm text-red-600 mb-3">{errorMsg}</p>}

          {!loading && tab === "overview" && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <StatCard emoji="💳" color="bg-red-50 border-red-200" label="Pending payments" value={pendingPayments.length} />
                <StatCard emoji="📦" color="bg-blue-50 border-blue-200" label="Orders in progress" value={orders.filter((o) => o.status !== "delivered").length} />
                <StatCard emoji="👥" color="bg-green-50 border-green-200" label="Enrolled staff" value={staff.length} />
                <StatCard emoji="🟢" color="bg-emerald-50 border-emerald-200" label="Riders online" value={riders.filter((r) => r.is_online).length} />
                <StatCard emoji="🏍️" color="bg-amber-50 border-amber-200" label="Total riders" value={riders.length} />
                <StatCard emoji="📝" color="bg-purple-50 border-purple-200" label="Rider applications" value={pendingApplicationsCount} />
              </div>

              <div className="bg-white rounded-2xl p-5 border border-bdborder">
                <p className="text-sm font-semibold mb-3">✨ Everything at a glance</p>
                <ChecklistRow ok={pendingPayments.length === 0} label={pendingPayments.length === 0 ? "No payments waiting" : `${pendingPayments.length} payment(s) need verification`} onClick={() => setTab("payments")} />
                <ChecklistRow ok={pendingApplicationsCount === 0} label={pendingApplicationsCount === 0 ? "No rider applications pending" : `${pendingApplicationsCount} rider application(s) pending`} onClick={() => setTab("riders")} />
                <ChecklistRow ok={orders.filter((o) => o.status !== "delivered").length === 0} label={`${orders.filter((o) => o.status !== "delivered").length} order(s) still in fulfillment`} onClick={() => setTab("orders")} />
              </div>
            </div>
          )}

          {!loading && tab === "staff" && (
            <div className="space-y-2">
              {staff.length === 0 && <EmptyState emoji="👥" text="No staff enrolled yet." />}
              {staff.map((s) => (
                <div key={s.id} className="bg-white rounded-xl p-4 border border-bdborder">
                  <p className="text-sm font-semibold">{s.full_name}</p>
                  <p className="text-xs text-bdmuted">{s.staff_id} · {s.email} · {s.phone}</p>
                  <div className="flex gap-2 mt-1">
                    <Pill color={s.employment_status === "active" ? "green" : "red"}>{s.employment_status === "active" ? "✅" : "❌"} {s.employment_status}</Pill>
                    <Pill color="amber">🕓 {s.probation_status}</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "enroll" && <EnrollStaffForm onEnrolled={loadAll} />}

          {!loading && tab === "payments" && (
            <div className="space-y-3">
              {pendingPayments.length === 0 && <EmptyState emoji="✅" text="No payments pending review." />}
              {pendingPayments.map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-4 border border-bdborder">
                  <div className="flex justify-between mb-1">
                    <p className="font-display font-bold text-sm text-bdgreen">{p.order_number}</p>
                    <span className="text-xs text-bdmuted">{new Date(p.payment_uploaded_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-bdmuted">{p.customer?.full_name || p.guest_name || "Guest"}</p>
                  <p className="font-display font-bold text-bdgreen mb-2">₦{Number(p.total_amount).toLocaleString()}</p>
                  {p.payment_proof_url && <a href={p.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs underline text-bdgreen block mb-2">📎 View uploaded receipt</a>}
                  <button onClick={() => handleVerifyPayment(p.id)} className="w-full py-2 rounded-lg text-xs font-semibold bg-bdgreen text-bdgold">✅ Confirm &amp; release order</button>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "orders" && (
            <div className="space-y-2">
              {orders.length === 0 && <EmptyState emoji="📦" text="No orders yet." />}
              {orders.map((o) => (
                <div key={o.id} className="bg-white rounded-xl p-4 border border-bdborder flex justify-between">
                  <div>
                    <p className="text-sm font-semibold text-bdgreen">{o.order_number}</p>
                    <p className="text-xs text-bdmuted">{o.customer?.full_name || o.guest_name || "Guest"}</p>
                  </div>
                  <div className="text-right">
                    <Pill color={o.status === "delivered" ? "green" : "amber"}>{o.status === "delivered" ? "✅" : "🚚"} {o.status.replace(/_/g, " ")}</Pill>
                    <p className="text-xs text-bdmuted mt-1">₦{Number(o.total_amount).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "riders" && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-bdmuted mb-2">🏍️ All riders</p>
                <div className="space-y-2">
                  {riders.length === 0 && <EmptyState emoji="🏍️" text="No riders yet." />}
                  {riders.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl p-4 border border-bdborder flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold">{r.full_name}</p>
                        <p className="text-xs text-bdmuted">{r.rider_id} · {r.phone}</p>
                      </div>
                      <Pill color={r.is_online ? "green" : "gray"}>{r.is_online ? "🟢 Online" : "⚪ Offline"}</Pill>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-bdmuted mb-2">📝 Applications pending approval</p>
                <div className="space-y-2">
                  {pendingApplicationsCount === 0 && <EmptyState emoji="✅" text="No pending applications." />}
                  {riderApplications.filter((a) => a.status === "pending").map((a) => (
                    <div key={a.id} className="bg-white rounded-xl p-4 border border-bdborder">
                      <p className="text-sm font-semibold">{a.full_name}</p>
                      <p className="text-xs text-bdmuted">{a.phone} · {a.email}</p>
                      <p className="text-xs text-bdmuted">{a.vehicle_type} — {a.vehicle_model}</p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleDecideApplication(a.id, "accepted")} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-bdgreen text-bdgold">✅ Accept</button>
                        <button onClick={() => handleDecideApplication(a.id, "rejected")} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-red-500 text-red-600">❌ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && tab === "messages" && (
            <div className="space-y-2">
              {messages.length === 0 && <EmptyState emoji="💬" text="No messages yet." />}
              {messages.map((m) => (
                <div key={m.id} className="bg-white rounded-xl p-3 border border-bdborder">
                  <div className="flex justify-between mb-1">
                    <p className="text-xs font-semibold">{m.sender_type} → {m.recipient_type}{m.department ? ` (${m.department})` : ""}</p>
                    <span className="text-[10px] text-bdmuted">{new Date(m.sent_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{m.body}</p>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "bank" && <BankDetailsForm bankAccount={bankAccount} staffId={session.staff.id} onSaved={loadAll} />}
        </div>
      </main>
    </div>
  );
}

function StatCard({ emoji, color, label, value }) {
  return (
    <div className={`rounded-2xl p-4 border ${color}`}>
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-xs text-bdmuted">{label}</p>
      <p className="font-display text-2xl font-bold text-bdgreen mt-1">{value}</p>
    </div>
  );
}

function ChecklistRow({ ok, label, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 text-sm py-2 border-b border-bdborder last:border-0 text-left">
      <span>{ok ? "✅" : "⚠️"}</span>
      <span className={ok ? "text-bdmuted" : "text-bdink font-medium"}>{label}</span>
    </button>
  );
}

function EmptyState({ emoji, text }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-bdborder text-center">
      <p className="text-3xl mb-2">{emoji}</p>
      <p className="text-sm text-bdmuted">{text}</p>
    </div>
  );
}

function Pill({ color, children }) {
  const colors = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-700",
    gray: "bg-gray-100 text-gray-500",
  };
  return <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold inline-block ${colors[color]}`}>{children}</span>;
}

function EnrollStaffForm({ onEnrolled }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const toggle = (arr, setArr, key) => setArr(arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key]);

  const submit = async () => {
    if (!form.fullName || !form.email || !form.phone) { setErrorMsg("❌ Fill in name, email, and phone."); return; }
    setSubmitting(true); setErrorMsg("");
    try {
      const res = await enrollStaffReal({ ...form, modules, permissions });
      setResult(res); setForm({ fullName: "", email: "", phone: "" }); setModules([]); setPermissions([]);
      onEnrolled();
    } catch (err) { console.error(err); setErrorMsg("❌ " + (err.message || "Enrollment failed.")); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-bdborder space-y-3">
      <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <p className="text-xs font-medium text-bdmuted pt-2">Grant access to modules</p>
      <div className="flex flex-wrap gap-2">
        {MODULES.map((m) => (
          <button key={m} onClick={() => toggle(modules, setModules, m)} className={`px-3 py-1.5 rounded-full text-xs border ${modules.includes(m) ? "bg-bdgreen text-bdgold border-bdgreen" : "bg-white border-bdborder"}`}>
            {modules.includes(m) ? "✅ " : ""}{m}
          </button>
        ))}
      </div>
      <p className="text-xs font-medium text-bdmuted pt-2">Special permissions</p>
      <div className="flex flex-wrap gap-2">
        {PERMISSIONS.map((p) => (
          <button key={p} onClick={() => toggle(permissions, setPermissions, p)} className={`px-3 py-1.5 rounded-full text-xs border ${permissions.includes(p) ? "bg-bdgold text-bdgreen border-bdgold" : "bg-white border-bdborder"}`}>
            {permissions.includes(p) ? "✅ " : ""}{p.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-bdmuted">
          ✅ Enrolled! Staff ID: <span className="font-semibold text-bdgreen">{result.staff_id}</span>
          <br />Default password: <span className="font-semibold text-bdgreen">bdwaks2025</span>
        </div>
      )}
      <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
        {submitting ? "Enrolling..." : "➕ Enroll staff member"}
      </button>
    </div>
  );
}

function BankDetailsForm({ bankAccount, staffId, onSaved }) {
  const [form, setForm] = useState({ bankName: bankAccount?.bank_name || "", accountNumber: bankAccount?.account_number || "", accountName: bankAccount?.account_name || "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ bankName: bankAccount?.bank_name || "", accountNumber: bankAccount?.account_number || "", accountName: bankAccount?.account_name || "" });
  }, [bankAccount]);

  const save = async () => {
    setSaving(true);
    try { await setCompanyBankAccount({ ...form, updatedBy: staffId }); onSaved(); }
    catch (err) { console.error(err); alert("❌ Failed to save — check console."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-bdborder space-y-3">
      <p className="text-xs text-bdmuted">🔒 Only Admin and Finance can update this</p>
      <input placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <input placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <input placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-bdgreen text-bdgold disabled:opacity-50">{saving ? "Saving..." : "💾 Save changes"}</button>
    </div>
  );
}

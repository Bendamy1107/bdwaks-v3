import React, { useState, useEffect, useCallback } from "react";
import {
  getAllStaff, getAllOrders, getPendingPaymentVerifications, verifyPayment,
  getCompanyBankAccount, setCompanyBankAccount, enrollStaffReal, getAllMessages,
} from "../lib/api";

const MODULES = ["admin", "finance", "payroll", "hr", "inventory", "rider_coordination", "general_manager"];
const PERMISSIONS = ["finance_transaction_approval", "payroll_officer", "deputy_ceo_approval"];

export default function AdminDashboard({ session }) {
  const [tab, setTab] = useState("overview");
  const [staff, setStaff] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [staffData, ordersData, paymentsData, bankData, messagesData] = await Promise.all([
        getAllStaff(),
        getAllOrders(),
        getPendingPaymentVerifications(),
        getCompanyBankAccount(),
        getAllMessages(),
      ]);
      setStaff(staffData);
      setOrders(ordersData);
      setPendingPayments(paymentsData);
      setBankAccount(bankData);
      setMessages(messagesData);
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't load some data — check the console for details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleVerifyPayment = async (orderId) => {
    try {
      await verifyPayment(orderId, session.staff.id);
      await loadAll();
    } catch (err) {
      console.error(err);
      alert("Failed to verify payment — check console.");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-bdgreen px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-bdivory">BD Waks Admin</h1>
          <p className="text-xs text-bdgold">{session.staff.full_name} · {session.staff.staff_id}</p>
        </div>
        <button onClick={loadAll} className="text-xs text-bdivory underline">Refresh</button>
      </header>

      <nav className="flex gap-2 px-5 pt-4 flex-wrap">
        {[
          { key: "overview", label: "Overview" },
          { key: "staff", label: "Staff Directory" },
          { key: "enroll", label: "Enroll Staff" },
          { key: "payments", label: `Payment Verification${pendingPayments.length ? ` (${pendingPayments.length})` : ""}` },
          { key: "orders", label: "All Orders" },
          { key: "messages", label: "All Messages" },
          { key: "bank", label: "Bank Details" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border ${tab === t.key ? "bg-bdgreen text-bdgold" : "bg-white text-bdink border-bdborder"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="p-5 max-w-3xl">
        {loading && <p className="text-sm text-bdmuted">Loading live data...</p>}
        {errorMsg && <p className="text-sm text-red-600 mb-3">{errorMsg}</p>}

        {!loading && tab === "overview" && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Pending payments" value={pendingPayments.length} />
            <StatCard label="Orders in progress" value={orders.filter((o) => o.status !== "delivered").length} />
            <StatCard label="Enrolled staff" value={staff.length} />
            <StatCard label="Messages" value={messages.length} />
          </div>
        )}

        {!loading && tab === "staff" && (
          <div className="space-y-2">
            {staff.length === 0 && <p className="text-sm text-bdmuted">No staff enrolled yet.</p>}
            {staff.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-4 border border-bdborder">
                <p className="text-sm font-semibold">{s.full_name}</p>
                <p className="text-xs text-bdmuted">{s.staff_id} · {s.email} · {s.phone}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bdgreen/10 text-bdgreen capitalize">{s.employment_status}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 capitalize">{s.probation_status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "enroll" && <EnrollStaffForm onEnrolled={loadAll} />}

        {!loading && tab === "payments" && (
          <div className="space-y-3">
            {pendingPayments.length === 0 && <p className="text-sm text-bdmuted">No payments pending review.</p>}
            {pendingPayments.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 border border-bdborder">
                <div className="flex justify-between mb-1">
                  <p className="font-display font-bold text-sm text-bdgreen">{p.order_number}</p>
                  <span className="text-xs text-bdmuted">{new Date(p.payment_uploaded_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-bdmuted">{p.customer?.full_name || p.guest_name || "Guest"}</p>
                <p className="font-display font-bold text-bdgreen mb-2">₦{Number(p.total_amount).toLocaleString()}</p>
                {p.payment_proof_url && (
                  <a href={p.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs underline text-bdgreen block mb-2">
                    View uploaded receipt
                  </a>
                )}
                <button onClick={() => handleVerifyPayment(p.id)} className="w-full py-2 rounded-lg text-xs font-semibold bg-bdgreen text-bdgold">
                  Confirm & release order
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "orders" && (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl p-4 border border-bdborder flex justify-between">
                <div>
                  <p className="text-sm font-semibold text-bdgreen">{o.order_number}</p>
                  <p className="text-xs text-bdmuted">{o.customer?.full_name || o.guest_name || "Guest"}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] px-2 py-1 rounded-full bg-bdgold/30 text-bdgreen capitalize">{o.status.replace(/_/g, " ")}</span>
                  <p className="text-xs text-bdmuted mt-1">₦{Number(o.total_amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "messages" && (
          <div className="space-y-2">
            {messages.length === 0 && <p className="text-sm text-bdmuted">No messages yet.</p>}
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

        {!loading && tab === "bank" && (
          <BankDetailsForm bankAccount={bankAccount} staffId={session.staff.id} onSaved={loadAll} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-bdborder">
      <p className="text-xs text-bdmuted">{label}</p>
      <p className="font-display text-2xl font-bold text-bdgreen mt-1">{value}</p>
    </div>
  );
}

function EnrollStaffForm({ onEnrolled }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const toggle = (arr, setArr, key) => {
    setArr(arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key]);
  };

  const submit = async () => {
    if (!form.fullName || !form.email || !form.phone) {
      setErrorMsg("Fill in name, email, and phone.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await enrollStaffReal({ ...form, modules, permissions });
      setResult(res);
      setForm({ fullName: "", email: "", phone: "" });
      setModules([]);
      setPermissions([]);
      onEnrolled();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Enrollment failed.");
    } finally {
      setSubmitting(false);
    }
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
            {m}
          </button>
        ))}
      </div>

      <p className="text-xs font-medium text-bdmuted pt-2">Special permissions</p>
      <div className="flex flex-wrap gap-2">
        {PERMISSIONS.map((p) => (
          <button key={p} onClick={() => toggle(permissions, setPermissions, p)} className={`px-3 py-1.5 rounded-full text-xs border ${permissions.includes(p) ? "bg-bdgold text-bdgreen border-bdgold" : "bg-white border-bdborder"}`}>
            {p.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

      {result && (
        <div className="bg-bdivory rounded-lg p-3 text-xs text-bdmuted">
          Enrolled! Staff ID: <span className="font-semibold text-bdgreen">{result.staff_id}</span>
          <br />Default password: <span className="font-semibold text-bdgreen">bdwaks2025</span>
        </div>
      )}

      <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
        {submitting ? "Enrolling..." : "Enroll staff member"}
      </button>
    </div>
  );
}

function BankDetailsForm({ bankAccount, staffId, onSaved }) {
  const [form, setForm] = useState({
    bankName: bankAccount?.bank_name || "",
    accountNumber: bankAccount?.account_number || "",
    accountName: bankAccount?.account_name || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      bankName: bankAccount?.bank_name || "",
      accountNumber: bankAccount?.account_number || "",
      accountName: bankAccount?.account_name || "",
    });
  }, [bankAccount]);

  const save = async () => {
    setSaving(true);
    try {
      await setCompanyBankAccount({ ...form, updatedBy: staffId });
      onSaved();
    } catch (err) {
      console.error(err);
      alert("Failed to save — check console.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-bdborder space-y-3">
      <p className="text-xs text-bdmuted">Only Admin and Finance can update this</p>
      <input placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <input placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <input placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}

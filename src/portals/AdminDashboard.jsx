import React, { useState, useEffect, useCallback } from "react";
import {
  getAllStaff, getAllOrders, getPendingPaymentVerifications, verifyPayment,
  getCompanyBankAccount, setCompanyBankAccount, enrollStaffReal, getAllMessages,
  getAllRiders, getAllRiderApplications, decideRiderApplication,
  getAllCategoriesWithSubcategories, getAllProductsForInventory, createCategory, createSubcategory,
  createProduct, createProductVariant, updateVariantStock, updateVariantCost,
  toggleProductAvailability, updateProductLowStockThreshold, getAllVendors, createVendor,
  getPricingConfig, updatePricingConfigSecure, deleteCategory, deleteSubcategory,
} from "../lib/api";

const MODULES = ["admin", "finance", "payroll", "hr", "inventory", "rider_coordination", "general_manager"];
const PERMISSIONS = ["finance_transaction_approval", "payroll_officer", "deputy_ceo_approval"];

const NAV_ITEMS = [
  { key: "overview", label: "Overview", emoji: "🏠" },
  { key: "staff", label: "Staff Directory", emoji: "👥" },
  { key: "enroll", label: "Enroll Staff", emoji: "➕" },
  { key: "payments", label: "Payment Verification", emoji: "💳" },
  { key: "orders", label: "All Orders", emoji: "📦" },
  { key: "inventory", label: "Inventory", emoji: "🧺" },
  { key: "pricing", label: "Pricing", emoji: "💰" },
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

          {!loading && tab === "inventory" && <InventoryPanel staffId={session.staff.id} />}

          {!loading && tab === "pricing" && <PricingPanel staffId={session.staff.id} />}

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
                      <p className="text-xs text-bdmuted">📍 {a.home_address}</p>
                      <p className="text-xs text-bdmuted">🎂 DOB: {a.date_of_birth}</p>
                      <p className="text-xs text-bdmuted">{a.vehicle_type === "Motorcycle" ? "🏍️" : a.vehicle_type === "Tricycle" ? "🛺" : "🚗"} {a.vehicle_type} — {a.vehicle_model} {a.plate_number ? `(${a.plate_number})` : ""}</p>
                      <p className="text-xs text-bdmuted">🪪 License: {a.has_license ? `Yes — ${a.license_number}` : "None provided"}</p>
                      <p className="text-xs text-bdmuted">🚨 Emergency 1: {a.emergency_contact_name} ({a.emergency_contact_relationship}) — {a.emergency_contact_phone}</p>
                      {a.emergency_contact_2_name && (
                        <p className="text-xs text-bdmuted">🚨 Emergency 2: {a.emergency_contact_2_name} ({a.emergency_contact_2_relationship}) — {a.emergency_contact_2_phone}</p>
                      )}
                      <p className="text-xs text-bdmuted">🏦 {a.bank_name} — {a.bank_account_number}</p>
                      <p className="text-xs text-bdmuted">🕓 {a.availability} · Start: {a.earliest_start_date}</p>
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

// ---------------------------------------------------------------------------
// INVENTORY PANEL (self-contained — loads its own data)
// ---------------------------------------------------------------------------
function InventoryPanel({ staffId }) {
  const [subtab, setSubtab] = useState("products"); // products | addProduct | categories | vendors
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [markupMultiplier, setMarkupMultiplier] = useState(1.20);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cats, prods, vends, pricing] = await Promise.all([
        getAllCategoriesWithSubcategories(), getAllProductsForInventory(), getAllVendors(), getPricingConfig(),
      ]);
      setCategories(cats); setProducts(prods); setVendors(vends);
      setMarkupMultiplier(1 + Number(pricing.markup_percent) / 100);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const lowStockCount = products.reduce((count, p) => {
    const threshold = p.low_stock_threshold ?? 5;
    return count + (p.product_variants || []).filter((v) => v.stock_qty < threshold).length;
  }, 0);

  return (
    <div>
      {lowStockCount > 0 && (
        <div className="rounded-xl p-3 mb-4 bg-red-50 border border-red-200 flex items-center gap-2">
          <span>⚠️</span>
          <p className="text-xs text-red-700">{lowStockCount} size(s) are running low on stock</p>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: "products", label: "🧺 Products" },
          { key: "addProduct", label: "➕ Add Product" },
          { key: "categories", label: "🗂️ Categories" },
          { key: "vendors", label: "🏬 Vendors" },
        ].map((t) => (
          <button key={t.key} onClick={() => setSubtab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border ${subtab === t.key ? "bg-bdgreen text-bdgold border-bdgreen" : "bg-white border-bdborder"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-bdmuted">Loading inventory...</p>}

      {!loading && subtab === "products" && (
        <div className="space-y-2">
          {products.length === 0 && <EmptyState emoji="🧺" text="No products yet — add your first one." />}
          {products.map((p) => (
            <ProductInventoryCard key={p.id} product={p} markup={markupMultiplier} onChanged={loadAll} />
          ))}
        </div>
      )}

      {!loading && subtab === "addProduct" && (
        <AddProductForm categories={categories} staffId={staffId} onAdded={() => { loadAll(); setSubtab("products"); }} />
      )}

      {!loading && subtab === "categories" && (
        <CategoryManager categories={categories} onChanged={loadAll} />
      )}

      {!loading && subtab === "vendors" && (
        <VendorManager vendors={vendors} staffId={staffId} onChanged={loadAll} />
      )}
    </div>
  );
}

function ProductInventoryCard({ product, markup, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [threshold, setThreshold] = useState(product.low_stock_threshold ?? 5);

  const toggleAvailable = async () => {
    try { await toggleProductAvailability(product.id, !product.is_available); onChanged(); }
    catch (err) { console.error(err); alert("❌ Failed to update."); }
  };

  const saveThreshold = async () => {
    try { await updateProductLowStockThreshold(product.id, threshold); onChanged(); }
    catch (err) { console.error(err); alert("❌ Failed to update threshold."); }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-bdborder">
      <div className="flex justify-between items-start mb-1">
        <div>
          <p className="text-sm font-semibold">{product.name}</p>
          <p className="text-xs text-bdmuted">{product.subcategory?.category?.name} → {product.subcategory?.name} · {product.brand}</p>
        </div>
        <button onClick={toggleAvailable} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${product.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {product.is_available ? "✅ Visible" : "❌ Hidden"}
        </button>
      </div>

      <button onClick={() => setExpanded((e) => !e)} className="text-xs font-medium text-bdgreen mt-1 mb-2">
        {expanded ? "Hide" : "Show"} sizes ({(product.product_variants || []).length})
      </button>

      {expanded && (
        <div className="space-y-2">
          {(product.product_variants || []).map((v) => (
            <VariantRow key={v.id} variant={v} markup={markup} threshold={threshold} onChanged={onChanged} />
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-bdborder">
            <span className="text-xs text-bdmuted">Low-stock alert below</span>
            <input type="number" min={1} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-14 text-xs border border-bdborder rounded px-1 py-0.5" />
            <button onClick={saveThreshold} className="text-[11px] font-semibold text-bdgreen">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function VariantRow({ variant, markup, threshold, onChanged }) {
  const [cost, setCost] = useState(variant.cost_price);
  const [stock, setStock] = useState(variant.stock_qty);
  const isLow = stock < threshold;

  const save = async () => {
    try {
      await updateVariantCost(variant.id, cost);
      await updateVariantStock(variant.id, stock);
      onChanged();
    } catch (err) { console.error(err); alert("❌ Failed to save."); }
  };

  return (
    <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${isLow ? "bg-red-50" : "bg-bdivory"}`}>
      <span className="font-medium w-16">{variant.size_label}</span>
      <span className="text-bdmuted">Cost</span>
      <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-20 border border-bdborder rounded px-1 py-0.5" />
      <span className="font-semibold text-bdgreen">Sell ₦{Math.round(cost * markup).toLocaleString()}</span>
      <span className="text-bdmuted">Stock</span>
      <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className={`w-16 border rounded px-1 py-0.5 ${isLow ? "border-red-400 text-red-600 font-semibold" : "border-bdborder"}`} />
      <button onClick={save} className="ml-auto text-[11px] font-semibold text-bdgreen">💾 Save</button>
    </div>
  );
}

function AddProductForm({ categories, staffId, onAdded }) {
  const [subcategoryId, setSubcategoryId] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [variants, setVariants] = useState([{ size: "", cost: "", stock: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const allSubcategories = categories.flatMap((c) => (c.subcategories || []).map((s) => ({ ...s, categoryName: c.name })));

  const updateVariant = (i, key, value) => setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, [key]: value } : v)));
  const addVariantRow = () => setVariants((vs) => [...vs, { size: "", cost: "", stock: "" }]);

  const submit = async () => {
    if (!name || !subcategoryId) { setErrorMsg("❌ Pick a category and enter a product name."); return; }
    setSubmitting(true); setErrorMsg("");
    try {
      const product = await createProduct({ subcategoryId, name, brand, createdBy: staffId });
      const cleanVariants = variants.filter((v) => v.size && v.cost);
      for (const v of cleanVariants) {
        await createProductVariant({ productId: product.id, sizeLabel: v.size, costPrice: Number(v.cost), stockQty: Number(v.stock) || 0 });
      }
      onAdded();
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ " + (err.message || "Failed to add product."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-bdborder space-y-3">
      <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2">
        <option value="">Select category / subcategory</option>
        {allSubcategories.map((s) => <option key={s.id} value={s.id}>{s.categoryName} → {s.name}</option>)}
      </select>
      {allSubcategories.length === 0 && <p className="text-xs text-amber-600">⚠️ No categories yet — add one in the Categories tab first.</p>}

      <input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
      <input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />

      <p className="text-xs font-semibold text-bdmuted pt-1">Size variants — selling price auto-calculates at +20%</p>
      {variants.map((v, i) => (
        <div key={i} className="grid grid-cols-3 gap-2">
          <input placeholder="Size (5kg)" value={v.size} onChange={(e) => updateVariant(i, "size", e.target.value)} className="text-sm border border-bdborder rounded-lg px-2 py-2" />
          <input placeholder="Cost price" type="number" value={v.cost} onChange={(e) => updateVariant(i, "cost", e.target.value)} className="text-sm border border-bdborder rounded-lg px-2 py-2" />
          <input placeholder="Stock qty" type="number" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)} className="text-sm border border-bdborder rounded-lg px-2 py-2" />
        </div>
      ))}
      <button onClick={addVariantRow} className="text-xs font-semibold text-bdgreen">➕ Add another size</button>

      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
        {submitting ? "Adding..." : "✅ Add product"}
      </button>
    </div>
  );
}

function CategoryManager({ categories, onChanged }) {
  const [newCategory, setNewCategory] = useState("");
  const [subFor, setSubFor] = useState(null);
  const [newSub, setNewSub] = useState("");

  const addCategory = async () => {
    if (!newCategory) return;
    try { await createCategory(newCategory); setNewCategory(""); onChanged(); }
    catch (err) { console.error(err); alert("❌ Failed — category may already exist."); }
  };

  const addSubcategory = async (categoryId) => {
    if (!newSub) return;
    try { await createSubcategory(categoryId, newSub); setNewSub(""); setSubFor(null); onChanged(); }
    catch (err) { console.error(err); alert("❌ Failed to add subcategory."); }
  };

  const removeCategory = async (categoryId, name) => {
    if (!window.confirm(`Delete category "${name}"? This also removes its subcategories.`)) return;
    try { await deleteCategory(categoryId); onChanged(); }
    catch (err) {
      console.error(err);
      alert("❌ Can't delete — this category (or one of its subcategories) still has products attached. Remove or reassign those products first.");
    }
  };

  const removeSubcategory = async (subcategoryId, name) => {
    if (!window.confirm(`Delete subcategory "${name}"?`)) return;
    try { await deleteSubcategory(subcategoryId); onChanged(); }
    catch (err) {
      console.error(err);
      alert("❌ Can't delete — this subcategory still has products attached. Remove or reassign those products first.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 border border-bdborder flex gap-2">
        <input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 text-sm border border-bdborder rounded-lg px-3 py-2" />
        <button onClick={addCategory} className="px-4 py-2 rounded-lg text-xs font-semibold bg-bdgreen text-bdgold">➕ Add</button>
      </div>

      {categories.map((c) => (
        <div key={c.id} className="bg-white rounded-2xl p-4 border border-bdborder">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">🗂️ {c.name}</p>
            <button onClick={() => removeCategory(c.id, c.name)} className="text-xs text-red-600">🗑️ Delete</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(c.subcategories || []).map((s) => (
              <span key={s.id} className="text-[11px] px-2.5 py-1 rounded-full bg-bdivory flex items-center gap-1.5">
                {s.name}
                <button onClick={() => removeSubcategory(s.id, s.name)} className="text-red-500">✕</button>
              </span>
            ))}
          </div>
          {subFor === c.id ? (
            <div className="flex gap-2">
              <input placeholder="Subcategory name" value={newSub} onChange={(e) => setNewSub(e.target.value)} className="flex-1 text-xs border border-bdborder rounded-lg px-2 py-1.5" />
              <button onClick={() => addSubcategory(c.id)} className="text-xs font-semibold text-bdgreen">Save</button>
            </div>
          ) : (
            <button onClick={() => setSubFor(c.id)} className="text-xs font-semibold text-bdgreen">➕ Add subcategory</button>
          )}
        </div>
      ))}
    </div>
  );
}

function VendorManager({ vendors, staffId, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "", productsSupplied: "", paymentTerms: "outright" });

  const submit = async () => {
    if (!form.name) return;
    try { await createVendor({ ...form, createdBy: staffId }); setForm({ name: "", address: "", phone: "", productsSupplied: "", paymentTerms: "outright" }); setShowForm(false); onChanged(); }
    catch (err) { console.error(err); alert("❌ Failed to add vendor."); }
  };

  return (
    <div className="space-y-3">
      {vendors.map((v) => (
        <div key={v.id} className="bg-white rounded-2xl p-4 border border-bdborder">
          <p className="text-sm font-semibold">🏬 {v.name}</p>
          <p className="text-xs text-bdmuted">{v.address}</p>
          <p className="text-xs text-bdmuted">{v.phone}</p>
          <p className="text-xs mt-1">Supplies: {v.products_supplied}</p>
          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${v.payment_terms === "credit" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
            {v.payment_terms}
          </span>
        </div>
      ))}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl font-semibold border border-bdborder">➕ Add vendor</button>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-bdborder space-y-2">
          <input placeholder="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Products supplied" value={form.productsSupplied} onChange={(e) => setForm({ ...form, productsSupplied: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <div className="flex gap-2">
            {["outright", "credit"].map((t) => (
              <button key={t} onClick={() => setForm({ ...form, paymentTerms: t })} className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize border ${form.paymentTerms === t ? "bg-bdgreen text-bdgold border-bdgreen" : "border-bdborder"}`}>{t}</button>
            ))}
          </div>
          <button onClick={submit} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-bdgreen text-bdgold">Save vendor</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PRICING PANEL — the only place markup % can be changed, Admin-only
// ---------------------------------------------------------------------------
function PricingPanel({ staffId }) {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({ markupPercent: "", serviceFeePercent: "", deliveryFeePer100m: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPricingConfig();
      setConfig(data);
      setForm({
        markupPercent: data.markup_percent,
        serviceFeePercent: data.service_fee_percent,
        deliveryFeePer100m: data.delivery_fee_per_100m,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setErrorMsg(""); setSaved(false);
    try {
      await updatePricingConfigSecure({
        staffId,
        markupPercent: Number(form.markupPercent),
        serviceFeePercent: Number(form.serviceFeePercent),
        deliveryFeePer100m: Number(form.deliveryFeePer100m),
      });
      setSaved(true);
      await load();
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ " + (err.message || "Only Admin can update pricing."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-bdmuted">Loading pricing config...</p>;

  return (
    <div className="bg-white rounded-2xl p-5 border border-bdborder space-y-4 max-w-md">
      <div className="rounded-xl p-3 bg-amber-50 border border-amber-200">
        <p className="text-xs text-amber-700">🔒 Only Admin can change these — protected at the database level, not just hidden from other roles.</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-bdmuted">Product markup %</label>
        <input type="number" step="0.01" value={form.markupPercent} onChange={(e) => setForm({ ...form, markupPercent: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2 mt-1" />
      </div>
      <div>
        <label className="text-xs font-semibold text-bdmuted">Service fee %</label>
        <input type="number" step="0.01" value={form.serviceFeePercent} onChange={(e) => setForm({ ...form, serviceFeePercent: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2 mt-1" />
      </div>
      <div>
        <label className="text-xs font-semibold text-bdmuted">Delivery fee per 100m (₦)</label>
        <input type="number" step="0.01" value={form.deliveryFeePer100m} onChange={(e) => setForm({ ...form, deliveryFeePer100m: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2 mt-1" />
      </div>

      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      {saved && <p className="text-xs text-green-600">✅ Saved — takes effect immediately across the site.</p>}

      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
        {saving ? "Saving..." : "💾 Save pricing"}
      </button>

      {config && (
        <p className="text-[11px] text-bdmuted">Last updated: {config.updated_at ? new Date(config.updated_at).toLocaleString() : "never"}</p>
      )}
    </div>
  );
}

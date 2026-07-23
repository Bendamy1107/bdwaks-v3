import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { loginCustomer } from "../lib/auth";
import {
  getAllCategoriesWithSubcategories, getAllAvailableProducts, getCompanyBankAccount,
  createOrder, uploadPaymentProof, getOrdersForCustomer, submitRiderApplication,
  signupCustomer, getLoyaltyBalance, getReferralStats, submitOrderFeedback, getPricingConfig,
} from "../lib/api";

const MARKUP_PERCENT = 20;
const SERVICE_FEE_PERCENT = 10;
// These are safe defaults shown before the live config loads; every screen
// that computes prices should call sellingPrice()/getConfig() after the
// PricingContext below has loaded the real values from pricing_config.
let liveMarkupPercent = MARKUP_PERCENT;
let liveServiceFeePercent = SERVICE_FEE_PERCENT;
const sellingPrice = (cost) => Math.round(cost * (1 + liveMarkupPercent / 100));
const naira = (n) => `₦${Number(n).toLocaleString("en-NG")}`;

export default function CustomerPortal() {
  const [view, setView] = useState("browse"); // browse | cart | checkout | confirmed | becomeRider | login | signup | account | orderDetail
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [customer, setCustomer] = useState(null); // { id, full_name, email, referral_code } once logged in
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    getAllAvailableProducts().then(setProducts).catch(console.error).finally(() => setLoading(false));
    getPricingConfig().then((cfg) => {
      liveMarkupPercent = Number(cfg.markup_percent);
      liveServiceFeePercent = Number(cfg.service_fee_percent);
    }).catch(console.error);
  }, []);

  const addToCart = (product, variant) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.variantId === variant.id);
      if (existing) return prev.map((c) => (c === existing ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { productId: product.id, variantId: variant.id, name: product.name, size: variant.size_label, costPrice: variant.cost_price, qty: 1 }];
    });
  };

  const updateQty = (variantId, delta) => {
    setCart((prev) => prev.map((c) => (c.variantId === variantId ? { ...c, qty: Math.max(0, c.qty + delta) } : c)).filter((c) => c.qty > 0));
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="min-h-screen bg-bdivory">
      {view === "browse" && (
        <BrowseView products={products} loading={loading} addToCart={addToCart} cartCount={cartCount}
          onOpenCart={() => setView("cart")} onBecomeRider={() => setView("becomeRider")}
          customer={customer} onAccount={() => setView(customer ? "account" : "login")} />
      )}
      {view === "cart" && (
        <CartView cart={cart} updateQty={updateQty} onBack={() => setView("browse")} onCheckout={() => setView("checkout")} />
      )}
      {view === "checkout" && (
        <CheckoutView cart={cart} customer={customer} onBack={() => setView("cart")}
          onConfirmed={(order) => { setLastOrder(order); setCart([]); setView("confirmed"); }} />
      )}
      {view === "confirmed" && <ConfirmedView order={lastOrder} onHome={() => setView("browse")} />}
      {view === "becomeRider" && <BecomeRiderView onBack={() => setView("browse")} />}
      {view === "login" && (
        <LoginView onBack={() => setView("browse")} onSignupInstead={() => setView("signup")}
          onLoggedIn={(c) => { setCustomer(c); setView("account"); }} />
      )}
      {view === "signup" && (
        <SignupView onBack={() => setView("browse")} onLoginInstead={() => setView("login")}
          onSignedUp={(c) => { setCustomer(c); setView("account"); }} />
      )}
      {view === "account" && customer && (
        <AccountView customer={customer} onBack={() => setView("browse")}
          onLogout={() => { setCustomer(null); setView("browse"); }}
          onOpenOrder={(id) => { setSelectedOrderId(id); setView("orderDetail"); }} />
      )}
      {view === "orderDetail" && (
        <OrderDetailView orderId={selectedOrderId} customer={customer} onBack={() => setView("account")} />
      )}
    </div>
  );
}

function BrowseView({ products, loading, addToCart, cartCount, onOpenCart, onBecomeRider, customer, onAccount }) {
  return (
    <div className="pb-24">
      <header className="bg-bdgreen px-4 pt-5 pb-4 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-bdivory">🌿 BD Waks</h1>
          <p className="text-xs text-bdgold">Groceries · Port Harcourt &amp; Lagos</p>
        </div>
        <button onClick={onAccount} className="text-2xl">{customer ? "👤" : "🔑"}</button>
      </header>

      <div className="p-4">
        {loading && <p className="text-sm text-bdmuted">Loading products...</p>}
        {!loading && products.length === 0 && (
          <div className="bg-white rounded-2xl p-8 border border-bdborder text-center">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-bdmuted">No products added yet — check back soon, or add products from the Inventory module.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} />
          ))}
        </div>

        <button onClick={onBecomeRider} className="w-full mt-5 rounded-2xl p-4 flex items-center gap-3 bg-bdgreen text-left">
          <span className="text-2xl">🏍️</span>
          <div>
            <p className="text-sm font-semibold text-bdivory">Deliver with BD Waks</p>
            <p className="text-[11px] text-bdgold">Become a rider — tap to apply</p>
          </div>
        </button>
      </div>

      {cartCount > 0 && (
        <button onClick={onOpenCart} className="fixed bottom-5 left-4 right-4 rounded-2xl py-3.5 px-5 flex items-center justify-between shadow-lg bg-bdgold">
          <span className="font-semibold text-bdgreen">🧺 {cartCount} item(s) in basket</span>
          <span className="font-display font-bold text-bdgreen">View →</span>
        </button>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd }) {
  const variants = product.product_variants || [];
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const variant = variants.find((v) => v.id === variantId) || variants[0];
  if (!variant) return null;

  return (
    <div className="bg-white rounded-2xl p-3 border border-bdborder">
      <p className="text-sm font-semibold leading-tight">{product.name}</p>
      <p className="text-[11px] text-bdmuted mb-2">{product.brand}</p>
      <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="w-full text-xs rounded-lg px-2 py-1.5 mb-2 border border-bdborder">
        {variants.map((v) => <option key={v.id} value={v.id}>{v.size_label}</option>)}
      </select>
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-sm text-bdgreen">{naira(sellingPrice(variant.cost_price))}</span>
        <button onClick={() => onAdd(product, variant)} className="p-1.5 rounded-full bg-bdgreen text-bdgold">➕</button>
      </div>
      {variant.stock_qty === 0 && <p className="text-[10px] text-red-500 mt-1">❌ Out of stock</p>}
    </div>
  );
}

function CartView({ cart, updateQty, onBack, onCheckout }) {
  const subtotal = cart.reduce((s, c) => s + sellingPrice(c.costPrice) * c.qty, 0);
  const serviceFee = Math.round(subtotal * (liveServiceFeePercent / 100));
  const total = subtotal + serviceFee;

  return (
    <div className="pb-32">
      <HeaderBar title="Your Basket" onBack={onBack} />
      <div className="p-4 space-y-3">
        {cart.length === 0 && <p className="text-center text-sm text-bdmuted py-16">🧺 Your basket is empty.</p>}
        {cart.map((c) => (
          <div key={c.variantId} className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-bdborder">
            <div className="flex-1">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-[11px] text-bdmuted">{c.size}</p>
              <p className="text-sm font-display font-bold text-bdgreen mt-0.5">{naira(sellingPrice(c.costPrice) * c.qty)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(c.variantId, -1)} className="p-1 rounded-full border border-bdborder">➖</button>
              <span className="text-sm w-4 text-center">{c.qty}</span>
              <button onClick={() => updateQty(c.variantId, 1)} className="p-1 rounded-full bg-bdgreen text-bdgold">➕</button>
            </div>
          </div>
        ))}
      </div>
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 shadow-2xl border-t border-bdborder">
          <PriceRow label="Subtotal" value={subtotal} />
          <PriceRow label="Service fee (10%)" value={serviceFee} />
          <p className="text-xs text-bdmuted my-2">🚚 Delivery fee calculated at checkout based on your address</p>
          <div className="flex justify-between items-center mb-4">
            <span className="font-display font-bold text-lg">Total (+ delivery)</span>
            <span className="font-display font-bold text-lg text-bdgreen">{naira(total)}+</span>
          </div>
          <button onClick={onCheckout} className="w-full py-3.5 rounded-2xl font-semibold bg-bdgreen text-bdgold">Proceed to checkout</button>
        </div>
      )}
    </div>
  );
}

function PriceRow({ label, value }) {
  return <div className="flex justify-between text-sm py-0.5 text-bdmuted"><span>{label}</span><span>{naira(value)}</span></div>;
}

function CheckoutView({ cart, customer, onBack, onConfirmed }) {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState("");
  const [distance, setDistance] = useState(3000);
  const [bankAccount, setBankAccount] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { getCompanyBankAccount().then(setBankAccount).catch(console.error); }, []);

  const subtotal = cart.reduce((s, c) => s + c.costPrice * c.qty, 0);
  const markup = Math.round(subtotal * (liveMarkupPercent / 100));
  const sellingSubtotal = subtotal + markup;
  const serviceFee = Math.round(sellingSubtotal * (liveServiceFeePercent / 100));
  const deliveryFee = distance; // ₦1 per metre = ₦100 per 100m, exact
  const total = sellingSubtotal + serviceFee + deliveryFee;

  const submit = async () => {
    if (!customer && (!guestName || !guestPhone)) { setErrorMsg("❌ Fill in name and phone."); return; }
    if (!address) { setErrorMsg("❌ Enter a delivery address."); return; }
    setSubmitting(true); setErrorMsg("");
    try {
      const order = await createOrder({
        customer_id: customer?.id || null,
        guest_name: customer ? customer.full_name : guestName,
        guest_phone: customer ? "" : guestPhone,
        delivery_address: address,
        subtotal,
        markup_amount: markup,
        service_fee: serviceFee,
        delivery_distance_meters: distance,
        delivery_fee: deliveryFee,
        total_amount: total,
        signature_required: false,
        items: cart.map((c) => ({
          product_id: c.productId, variant_id: c.variantId, quantity: c.qty,
          unit_cost_price: c.costPrice, unit_selling_price: sellingPrice(c.costPrice),
        })),
      });

      // Award loyalty points: 100 points per ₦10,000 spent (account holders only)
      if (customer) {
        const pointsEarned = Math.floor(total / 10000) * 100;
        if (pointsEarned > 0) {
          await supabase.from("loyalty_points_ledger").insert({
            customer_id: customer.id, order_id: order.id,
            points_change: pointsEarned, balance_after: pointsEarned, // simplified; real balance = sum of ledger
          });
        }
      }

      if (receiptFile) {
        const path = `receipts/${order.order_number}-${receiptFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("payment-proofs").upload(path, receiptFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
          await uploadPaymentProof(order.id, urlData.publicUrl);
        }
      }

      onConfirmed(order);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ " + (err.message || "Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-10">
      <HeaderBar title="Checkout" onBack={onBack} />
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-bdborder space-y-2">
          <p className="text-xs font-semibold text-bdmuted">📋 Your details</p>
          {customer ? (
            <p className="text-sm">👋 {customer.full_name} <span className="text-bdmuted">({customer.email})</span></p>
          ) : (
            <>
              <input placeholder="Full name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
              <input placeholder="Phone number" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
            </>
          )}
          <input placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-bdborder">
          <p className="text-xs font-semibold text-bdmuted mb-2">📍 Distance from hub (demo input — real version uses geocoding)</p>
          <input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-bdborder">
          <PriceRow label="Subtotal + markup" value={sellingSubtotal} />
          <PriceRow label="Service fee (10%)" value={serviceFee} />
          <PriceRow label="Delivery fee" value={deliveryFee} />
          <div className="h-px my-2 bg-bdborder" />
          <div className="flex justify-between font-display font-bold text-bdgreen"><span>Total</span><span>{naira(total)}</span></div>
        </div>

        {bankAccount && (
          <div className="rounded-2xl p-4 bg-bdgreen">
            <p className="text-xs text-bdgold mb-2">🏦 Transfer to</p>
            <p className="text-sm text-bdivory">{bankAccount.bank_name}</p>
            <p className="font-display font-bold text-lg text-bdivory">{bankAccount.account_number}</p>
            <p className="text-sm text-bdivory">{bankAccount.account_name}</p>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold mb-2">📎 Upload payment receipt</p>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files[0])} className="w-full text-sm" />
        </div>

        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

        <button onClick={submit} disabled={submitting} className="w-full py-3.5 rounded-2xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
          {submitting ? "Submitting..." : "✅ Submit order"}
        </button>
      </div>
    </div>
  );
}

function ConfirmedView({ order, onHome }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl mb-4">✅</p>
      <h2 className="font-display text-2xl font-bold mb-2">Order received!</h2>
      <p className="text-sm text-bdmuted mb-1">Order ID: <span className="font-semibold">{order?.order_number}</span></p>
      <p className="text-sm text-bdmuted px-6 mb-8">We're verifying your payment now. You'll get confirmation shortly.</p>
      <button onClick={onHome} className="w-full max-w-xs py-3.5 rounded-2xl font-semibold bg-bdgreen text-bdgold">Continue shopping</button>
    </div>
  );
}

function BecomeRiderView({ onBack }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", home_address: "", date_of_birth: "",
    vehicle_type: "Motorcycle", vehicle_model: "", plate_number: "",
    has_license: false, license_number: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
    emergency_contact_2_name: "", emergency_contact_2_phone: "", emergency_contact_2_relationship: "",
    bank_name: "", bank_account_number: "",
    availability: "", earliest_start_date: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const licenseRequired = form.vehicle_type === "Vehicle";

  const submit = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.home_address || !form.date_of_birth) {
      setErrorMsg("❌ Fill in your name, email, phone, address, and date of birth."); return;
    }
    if (!form.emergency_contact_name || !form.emergency_contact_phone) {
      setErrorMsg("❌ At least one emergency contact is required."); return;
    }
    if (!form.availability || !form.earliest_start_date) {
      setErrorMsg("❌ Fill in your availability and earliest start date."); return;
    }
    if (licenseRequired && !form.license_number) {
      setErrorMsg("❌ A driver's license is required for vehicle (car) applicants."); return;
    }
    setSubmitting(true); setErrorMsg("");
    try {
      await submitRiderApplication({ ...form, has_license: !!form.license_number });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ " + (err.message || "Submission failed."));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="font-display text-2xl font-bold mb-2">Application received!</h2>
        <p className="text-sm text-bdmuted px-6 mb-8">Our Rider Coordination team will review your details.</p>
        <button onClick={onBack} className="w-full max-w-xs py-3.5 rounded-2xl font-semibold bg-bdgreen text-bdgold">Back to shopping</button>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <HeaderBar title="Become a Rider" onBack={onBack} />
      <div className="p-4 space-y-4">

        <FormSection title="👤 Personal details">
          <input placeholder="Full name" value={form.full_name} onChange={set("full_name")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Email" value={form.email} onChange={set("email")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Phone" value={form.phone} onChange={set("phone")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Home address" value={form.home_address} onChange={set("home_address")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <div>
            <label className="text-xs text-bdmuted">Date of birth</label>
            <input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2 mt-1" />
          </div>
        </FormSection>

        <FormSection title="🚗 Vehicle details">
          <div>
            <label className="text-xs text-bdmuted">Vehicle type</label>
            <select value={form.vehicle_type} onChange={set("vehicle_type")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2 mt-1">
              <option value="Motorcycle">🏍️ Motorcycle</option>
              <option value="Tricycle">🛺 Tricycle</option>
              <option value="Vehicle">🚗 Vehicle (car)</option>
            </select>
          </div>
          <input placeholder="Vehicle model" value={form.vehicle_model} onChange={set("vehicle_model")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Plate number (if applicable)" value={form.plate_number} onChange={set("plate_number")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
        </FormSection>

        <FormSection title="🪪 Driver's license">
          <p className="text-xs text-bdmuted">
            {licenseRequired ? "⚠️ Required for vehicle (car) applicants" : "Optional for motorcycle/tricycle applicants"}
          </p>
          <input
            placeholder={licenseRequired ? "License number (required)" : "License number (optional)"}
            value={form.license_number}
            onChange={set("license_number")}
            className="w-full text-sm border border-bdborder rounded-lg px-3 py-2"
          />
        </FormSection>

        <FormSection title="🚨 Emergency contact 1">
          <input placeholder="Full name" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Phone number" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Relationship" value={form.emergency_contact_relationship} onChange={set("emergency_contact_relationship")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
        </FormSection>

        <FormSection title="🚨 Emergency contact 2 (optional)">
          <input placeholder="Full name" value={form.emergency_contact_2_name} onChange={set("emergency_contact_2_name")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Phone number" value={form.emergency_contact_2_phone} onChange={set("emergency_contact_2_phone")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Relationship" value={form.emergency_contact_2_relationship} onChange={set("emergency_contact_2_relationship")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
        </FormSection>

        <FormSection title="🏦 Bank / account details">
          <input placeholder="Bank name" value={form.bank_name} onChange={set("bank_name")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <input placeholder="Account number" value={form.bank_account_number} onChange={set("bank_account_number")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
        </FormSection>

        <FormSection title="🕓 Availability">
          <input placeholder="e.g. Weekdays, 8am–6pm" value={form.availability} onChange={set("availability")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2" />
          <div>
            <label className="text-xs text-bdmuted">Earliest start date</label>
            <input type="date" value={form.earliest_start_date} onChange={set("earliest_start_date")} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2 mt-1" />
          </div>
        </FormSection>

        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
        <button onClick={submit} disabled={submitting} className="w-full py-3.5 rounded-2xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
          {submitting ? "Submitting..." : "✅ Submit application"}
        </button>
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-bdborder space-y-2">
      <p className="text-xs font-semibold text-bdmuted">{title}</p>
      {children}
    </div>
  );
}

function HeaderBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-20 px-4 py-4 flex items-center gap-3 bg-bdgreen">
      <button onClick={onBack} className="text-bdivory">⬅</button>
      <h2 className="font-display font-bold text-lg text-bdivory">{title}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LOGIN / SIGNUP
// ---------------------------------------------------------------------------
function LoginView({ onBack, onSignupInstead, onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    if (!email || !password) { setErrorMsg("❌ Enter email and password."); return; }
    setLoading(true); setErrorMsg("");
    try {
      const result = await loginCustomer(email.trim(), password);
      if (!result.success) { setErrorMsg("❌ " + result.message); setLoading(false); return; }
      onLoggedIn(result.customer);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-10">
      <HeaderBar title="Log In" onBack={onBack} />
      <div className="p-4 space-y-3">
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2.5" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2.5" />
        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
        <button onClick={submit} disabled={loading} className="w-full py-3.5 rounded-2xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
          {loading ? "Checking..." : "Log in"}
        </button>
        <button onClick={onSignupInstead} className="w-full text-sm text-bdgreen underline">Don't have an account? Sign up</button>
      </div>
    </div>
  );
}

function SignupView({ onBack, onLoginInstead, onSignedUp }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.password) { setErrorMsg("❌ Fill in all fields."); return; }
    setLoading(true); setErrorMsg("");
    try {
      const res = await signupCustomer(form);
      onSignedUp({ id: res.id, full_name: form.fullName, email: form.email, referral_code: res.referral_code });
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ " + (err.message || "Signup failed — email may already be in use."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-10">
      <HeaderBar title="Create Account" onBack={onBack} />
      <div className="p-4 space-y-3">
        <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2.5" />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2.5" />
        <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2.5" />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2.5" />
        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
        <button onClick={submit} disabled={loading} className="w-full py-3.5 rounded-2xl font-semibold bg-bdgreen text-bdgold disabled:opacity-50">
          {loading ? "Creating..." : "✅ Create account"}
        </button>
        <button onClick={onLoginInstead} className="w-full text-sm text-bdgreen underline">Already have an account? Log in</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ACCOUNT — loyalty, referral, order history
// ---------------------------------------------------------------------------
function AccountView({ customer, onBack, onLogout, onOpenOrder }) {
  const [points, setPoints] = useState(0);
  const [referral, setReferral] = useState({ total: 0, freeDeliveriesAvailable: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getLoyaltyBalance(customer.id),
      getReferralStats(customer.id),
      getOrdersForCustomer(customer.id),
    ]).then(([pts, ref, ord]) => { setPoints(pts); setReferral(ref); setOrders(ord); })
      .catch(console.error).finally(() => setLoading(false));
  }, [customer.id]);

  return (
    <div className="pb-10">
      <HeaderBar title="My Account" onBack={onBack} />
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 border border-bdborder">
          <p className="font-semibold">👤 {customer.full_name}</p>
          <p className="text-xs text-bdmuted">{customer.email}</p>
        </div>

        <div className="rounded-2xl p-4 flex items-center gap-3 bg-bdgreen">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-xs text-bdgold">Loyalty points</p>
            <p className="font-display font-bold text-lg text-bdivory">{loading ? "..." : points} pts</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-bdborder flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-sm font-semibold">Your referral code</p>
            <p className="font-display font-bold text-bdgreen">{customer.referral_code}</p>
            <p className="text-[11px] text-bdmuted">
              {loading ? "..." : `${referral.freeDeliveriesAvailable} free deliveries available (${referral.total} total referrals)`}
            </p>
          </div>
        </div>

        <p className="text-xs font-semibold text-bdmuted pt-2">📦 Order history</p>
        <div className="space-y-2">
          {!loading && orders.length === 0 && <p className="text-sm text-bdmuted text-center py-6">No orders yet.</p>}
          {orders.map((o) => (
            <button key={o.id} onClick={() => onOpenOrder(o.id)} className="w-full text-left bg-white rounded-xl p-3 border border-bdborder flex justify-between">
              <div>
                <p className="text-sm font-semibold text-bdgreen">{o.order_number}</p>
                <p className="text-xs text-bdmuted capitalize">{o.status.replace(/_/g, " ")}</p>
              </div>
              <p className="text-sm font-display font-bold text-bdgreen">₦{Number(o.total_amount).toLocaleString()}</p>
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="w-full text-sm text-red-600 underline pt-4">🚪 Log out</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ORDER DETAIL — tracking + feedback
// ---------------------------------------------------------------------------
const STAGES = [
  { key: "confirmed", label: "Confirmed", emoji: "✅" },
  { key: "packaged", label: "Packaged", emoji: "📦" },
  { key: "dispatched", label: "Dispatched", emoji: "🚚" },
  { key: "en_route", label: "En Route", emoji: "🏍️" },
  { key: "delivered", label: "Delivered", emoji: "🏠" },
];

function OrderDetailView({ orderId, customer, onBack }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    supabase.from("orders").select("*").eq("id", orderId).single()
      .then(({ data }) => setOrder(data)).catch(console.error).finally(() => setLoading(false));
  }, [orderId]);

  const submitFeedback = async () => {
    if (!rating) return;
    try {
      await submitOrderFeedback({ orderId, customerId: customer.id, rating, comments });
      setFeedbackSent(true);
    } catch (err) { console.error(err); alert("❌ Failed to submit feedback."); }
  };

  if (loading || !order) return <div className="p-8 text-center text-sm text-bdmuted">Loading...</div>;

  const stageIndex = STAGES.findIndex((s) => s.key === order.status);

  return (
    <div className="pb-10">
      <HeaderBar title="Track Order" onBack={onBack} />
      <div className="p-4">
        <p className="text-xs text-bdmuted">Order ID</p>
        <p className="font-display font-bold text-lg text-bdgreen mb-6">{order.order_number}</p>

        {STAGES.map((s, i) => {
          const isDone = i <= stageIndex;
          return (
            <div key={s.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${isDone ? "bg-bdgreen" : "bg-gray-200"}`}>
                  {isDone ? s.emoji : "⚪"}
                </div>
                {i < STAGES.length - 1 && <div className={`w-0.5 flex-1 min-h-[28px] ${isDone && i < stageIndex ? "bg-bdgreen" : "bg-gray-200"}`} />}
              </div>
              <div className="pb-7 pt-1.5">
                <p className={`text-sm font-semibold ${isDone ? "text-bdink" : "text-bdmuted"}`}>{s.label}</p>
              </div>
            </div>
          );
        })}

        {order.status === "delivered" && !feedbackSent && (
          <div className="bg-white rounded-2xl p-4 border border-bdborder mt-4">
            <p className="text-sm font-semibold mb-2">⭐ How was your delivery?</p>
            <div className="flex gap-1 mb-3 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>{n <= rating ? "⭐" : "☆"}</button>
              ))}
            </div>
            <textarea placeholder="Comments (optional)" value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className="w-full text-sm border border-bdborder rounded-lg px-3 py-2 mb-2" />
            <button onClick={submitFeedback} disabled={!rating} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-bdgreen text-bdgold disabled:opacity-50">Submit feedback</button>
          </div>
        )}
        {feedbackSent && <p className="text-sm text-green-600 mt-4">✅ Thanks for your feedback!</p>}
      </div>
    </div>
  );
}

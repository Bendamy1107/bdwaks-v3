import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// PRODUCTS / CATALOG
// ---------------------------------------------------------------------------
export async function getCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getProductsByCategory(categoryId) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, brand, image_url, is_available,
      subcategory:subcategories(id, name, category_id),
      product_variants(id, size_label, cost_price, stock_qty)
    `)
    .eq("is_available", true)
    .eq("subcategory.category_id", categoryId);
  if (error) throw error;
  return data;
}

export async function getPricingConfig() {
  const { data, error } = await supabase.from("pricing_config").select("*").single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------
export async function createOrder(orderPayload) {
  // orderPayload: { customer_id, guest_name, guest_phone, guest_email,
  //   delivery_address, subtotal, markup_amount, service_fee,
  //   delivery_distance_meters, delivery_fee, total_amount, signature_required, items: [...] }
  const orderNumber = `BDW-ORD-${Date.now().toString().slice(-6)}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: orderPayload.customer_id || null,
      guest_name: orderPayload.guest_name || null,
      guest_phone: orderPayload.guest_phone || null,
      guest_email: orderPayload.guest_email || null,
      delivery_address: orderPayload.delivery_address,
      subtotal: orderPayload.subtotal,
      markup_amount: orderPayload.markup_amount,
      service_fee: orderPayload.service_fee,
      delivery_distance_meters: orderPayload.delivery_distance_meters,
      delivery_fee: orderPayload.delivery_fee,
      total_amount: orderPayload.total_amount,
      signature_required: orderPayload.signature_required,
      status: "pending_payment",
    })
    .select()
    .single();
  if (orderError) throw orderError;

  const itemRows = orderPayload.items.map((it) => ({
    order_id: order.id,
    product_id: it.product_id,
    variant_id: it.variant_id,
    quantity: it.quantity,
    unit_cost_price: it.unit_cost_price,
    unit_selling_price: it.unit_selling_price,
  }));
  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) throw itemsError;

  return order;
}

export async function uploadPaymentProof(orderId, fileUrl) {
  const { error } = await supabase
    .from("orders")
    .update({
      payment_proof_url: fileUrl,
      payment_uploaded_at: new Date().toISOString(),
      status: "payment_review",
      payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
}

export async function getOrderByNumber(orderNumber) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, product:products(name))")
    .eq("order_number", orderNumber)
    .single();
  if (error) throw error;
  return data;
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, created_at, customer:customers(full_name), guest_name")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPendingPaymentVerifications() {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, payment_proof_url, payment_uploaded_at, customer:customers(full_name), guest_name")
    .eq("status", "payment_review")
    .order("payment_uploaded_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function verifyPayment(orderId, verifiedByStaffId) {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      payment_verified_by: verifiedByStaffId,
      payment_verified_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// STAFF
// ---------------------------------------------------------------------------
export async function getAllStaff() {
  const { data, error } = await supabase
    .from("staff")
    .select("id, staff_id, full_name, email, phone, employment_status, probation_status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Enrolls a new staff member. Staff ID generation and default password
 * hashing should ideally happen via a Postgres function too (so the
 * tie-breaker logic and hashing stay server-side and consistent) — see
 * generate_staff_id() you can add alongside the auth functions if you want
 * this fully server-enforced. For now this shows the client-side shape.
 */
export async function enrollStaff({ fullName, email, phone, staffIdPreview, modules, permissions }) {
  const { data: staff, error } = await supabase
    .from("staff")
    .insert({
      staff_id: staffIdPreview,
      full_name: fullName,
      email,
      phone,
      password_hash: null, // set via hash_password() RPC call before insert, or a trigger
      probation_ends_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) throw error;

  if (modules?.length) {
    await supabase.from("staff_module_access").insert(
      modules.map((m) => ({ staff_id: staff.id, module_name: m }))
    );
  }
  if (permissions?.length) {
    await supabase.from("staff_special_permissions").insert(
      permissions.map((p) => ({ staff_id: staff.id, permission: p }))
    );
  }
  return staff;
}

export async function signIn(staffId) {
  const { error } = await supabase
    .from("attendance")
    .insert({ staff_id: staffId, date: new Date().toISOString().slice(0, 10), sign_in_time: new Date().toISOString() });
  if (error) throw error;
}

export async function signOut(attendanceRowId) {
  const { error } = await supabase
    .from("attendance")
    .update({ sign_out_time: new Date().toISOString() })
    .eq("id", attendanceRowId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// FUND REQUESTS
// ---------------------------------------------------------------------------
export async function submitFundRequest({ staffId, amount, reason }) {
  const { error } = await supabase.from("fund_requests").insert({
    requested_by: staffId,
    amount,
    reason,
    date_requested: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

export async function decideFundRequest(requestId, { status, approvedAmount, decisionReason, decidedBy }) {
  const { error } = await supabase
    .from("fund_requests")
    .update({
      status,
      approved_amount: approvedAmount,
      decision_reason: decisionReason,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) throw error;
}

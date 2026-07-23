import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// COMPANY BANK ACCOUNT
// ---------------------------------------------------------------------------
export async function getCompanyBankAccount() {
  const { data, error } = await supabase.from("company_bank_account").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function setCompanyBankAccount({ bankName, accountNumber, accountName, updatedBy }) {
  const { error } = await supabase
    .from("company_bank_account")
    .upsert({ id: 1, bank_name: bankName, account_number: accountNumber, account_name: accountName, updated_by: updatedBy, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// STAFF ENROLLMENT (real, atomic — via enroll_staff Postgres function)
// ---------------------------------------------------------------------------
export async function enrollStaffReal({ fullName, email, phone, modules, permissions }) {
  const { data, error } = await supabase.rpc("enroll_staff", {
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_modules: modules,
    p_permissions: permissions,
  });
  if (error) throw error;
  return data[0]; // { id, staff_id }
}

// ---------------------------------------------------------------------------
// RIDERS
// ---------------------------------------------------------------------------
export async function getAllRiders() {
  const { data, error } = await supabase
    .from("riders")
    .select("id, rider_id, full_name, email, phone, employment_status, is_online, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPendingRiderApplications() {
  const { data, error } = await supabase
    .from("rider_applications")
    .select("*")
    .eq("status", "pending")
    .order("applied_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAllRiderApplications() {
  const { data, error } = await supabase
    .from("rider_applications")
    .select("*")
    .order("applied_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function decideRiderApplication(applicationId, { status, reviewedBy, rejectionReason }) {
  const updatePayload = {
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  };
  if (status === "rejected") {
    updatePayload.rejection_reason = rejectionReason || null;
    const reapply = new Date();
    reapply.setDate(reapply.getDate() + 30);
    updatePayload.reapply_after = reapply.toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("rider_applications").update(updatePayload).eq("id", applicationId);
  if (error) throw error;

  // On approval, create the actual rider account and carry over bank details
  if (status === "accepted") {
    const { data: app, error: fetchErr } = await supabase
      .from("rider_applications")
      .select("*")
      .eq("id", applicationId)
      .single();
    if (fetchErr) throw fetchErr;

    const riderIdCode = `BDW/RD-${Date.now().toString().slice(-4)}`;
    const { data: hashData, error: hashErr } = await supabase.rpc("hash_password", { plain_password: "bdwaks2025" });
    if (hashErr) throw hashErr;

    const { error: insertErr } = await supabase.from("riders").insert({
      rider_id: riderIdCode,
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      password_hash: hashData,
      bank_name: app.bank_name,
      bank_account_number: app.bank_account_number,
      employment_status: "active",
      must_change_password: true,
    });
    if (insertErr) throw insertErr;
  }
}

export async function getAllMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}


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

// ---------------------------------------------------------------------------
// CUSTOMER-FACING PRODUCT BROWSING (real)
// ---------------------------------------------------------------------------
export async function getAllCategoriesWithSubcategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, subcategories(id, name)")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getAllAvailableProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, brand, image_url, is_available, subcategory:subcategories(id, name, category:categories(id, name)), product_variants(id, size_label, cost_price, stock_qty)")
    .eq("is_available", true);
  if (error) throw error;
  return data;
}

export async function getOrdersForCustomer(customerId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// RIDER-FACING (real)
// ---------------------------------------------------------------------------
export async function setRiderOnlineStatus(riderId, isOnline) {
  const { error } = await supabase.from("riders").update({ is_online: isOnline }).eq("id", riderId);
  if (error) throw error;
}

export async function getRiderIncomingAssignments(riderId) {
  const { data, error } = await supabase
    .from("order_rider_assignments")
    .select("*, order:orders(*)")
    .eq("rider_id", riderId)
    .eq("response", "pending")
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRiderActiveOrder(riderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("rider_id", riderId)
    .in("status", ["dispatched", "en_route"])
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function respondToAssignment(assignmentId, response, riderId, orderId) {
  const { error: assignErr } = await supabase
    .from("order_rider_assignments")
    .update({ response, responded_at: new Date().toISOString() })
    .eq("id", assignmentId);
  if (assignErr) throw assignErr;

  if (response === "accepted") {
    const { error: orderErr } = await supabase
      .from("orders")
      .update({ rider_id: riderId, assigned_at: new Date().toISOString(), status: "dispatched" })
      .eq("id", orderId);
    if (orderErr) throw orderErr;
  }
}

export async function updateOrderStatus(orderId, status) {
  const payload = { status };
  if (status === "delivered") payload.delivered_at = new Date().toISOString();
  const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
  if (error) throw error;
}

export async function getRiderEarnings(riderId) {
  const { data, error } = await supabase
    .from("rider_earnings_log")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// RIDER APPLICATION (public form submission)
// ---------------------------------------------------------------------------
export async function submitRiderApplication(payload) {
  const { error } = await supabase.from("rider_applications").insert(payload);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// CUSTOMER ACCOUNTS — signup, loyalty, referrals, feedback
// ---------------------------------------------------------------------------
export async function signupCustomer({ fullName, email, phone, password }) {
  const { data, error } = await supabase.rpc("signup_customer", {
    p_full_name: fullName, p_email: email, p_phone: phone, p_password: password,
  });
  if (error) throw error;
  return data[0]; // { id, referral_code }
}

export async function getLoyaltyBalance(customerId) {
  const { data, error } = await supabase
    .from("loyalty_points_ledger")
    .select("points_change")
    .eq("customer_id", customerId);
  if (error) throw error;
  return data.reduce((sum, row) => sum + row.points_change, 0);
}

export async function getReferralStats(customerId) {
  const { data, error } = await supabase
    .from("referral_rewards")
    .select("*")
    .eq("referrer_customer_id", customerId);
  if (error) throw error;
  const unused = data.filter((r) => !r.free_delivery_used);
  return { total: data.length, freeDeliveriesAvailable: unused.length, records: data };
}

export async function submitOrderFeedback({ orderId, customerId, rating, comments }) {
  const { error } = await supabase.from("order_feedback").insert({
    order_id: orderId, customer_id: customerId, rating, comments,
    submitted_at: new Date().toISOString(),
    available_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
}

export async function getOrderById(orderId) {
  const { data, error } = await supabase.from("orders").select("*, order_items(*, product:products(name))").eq("id", orderId).single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// INVENTORY MANAGEMENT
// ---------------------------------------------------------------------------
export async function getAllProductsForInventory() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, brand, is_available, subcategory:subcategories(id, name, category:categories(id, name)), product_variants(id, size_label, cost_price, stock_qty)")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createCategory(name) {
  const { data, error } = await supabase.from("categories").insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function createSubcategory(categoryId, name) {
  const { data, error } = await supabase.from("subcategories").insert({ category_id: categoryId, name }).select().single();
  if (error) throw error;
  return data;
}

export async function createProduct({ subcategoryId, name, brand, createdBy }) {
  const { data, error } = await supabase
    .from("products")
    .insert({ subcategory_id: subcategoryId, name, brand, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createProductVariant({ productId, sizeLabel, costPrice, stockQty }) {
  const { error } = await supabase.from("product_variants").insert({
    product_id: productId, size_label: sizeLabel, cost_price: costPrice, stock_qty: stockQty,
  });
  if (error) throw error;
}

export async function updateVariantStock(variantId, stockQty) {
  const { error } = await supabase.from("product_variants").update({ stock_qty: stockQty }).eq("id", variantId);
  if (error) throw error;
}

export async function updateVariantCost(variantId, costPrice) {
  const { error } = await supabase.from("product_variants").update({ cost_price: costPrice }).eq("id", variantId);
  if (error) throw error;
}

export async function toggleProductAvailability(productId, isAvailable) {
  const { error } = await supabase.from("products").update({ is_available: isAvailable }).eq("id", productId);
  if (error) throw error;
}

export async function updateProductLowStockThreshold(productId, threshold) {
  const { error } = await supabase.from("products").update({ low_stock_threshold: threshold }).eq("id", productId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// VENDORS
// ---------------------------------------------------------------------------
export async function getAllVendors() {
  const { data, error } = await supabase.from("vendors").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function createVendor({ name, address, phone, productsSupplied, paymentTerms, createdBy }) {
  const { error } = await supabase.from("vendors").insert({
    name, address, phone, products_supplied: productsSupplied, payment_terms: paymentTerms, created_by: createdBy,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// PRICING CONFIG
// ---------------------------------------------------------------------------
export async function getPricingConfig() {
  const { data, error } = await supabase.from("pricing_config").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updatePricingConfigSecure({ staffId, markupPercent, serviceFeePercent, deliveryFeePer100m }) {
  const { error } = await supabase.rpc("update_pricing_config", {
    p_staff_id: staffId,
    p_markup_percent: markupPercent,
    p_service_fee_percent: serviceFeePercent,
    p_delivery_fee_per_100m: deliveryFeePer100m,
  });
  if (error) throw error;
}

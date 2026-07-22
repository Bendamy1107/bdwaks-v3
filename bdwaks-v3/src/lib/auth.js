import { supabase } from "./supabaseClient";

/**
 * All password checks happen INSIDE Postgres via the functions defined in
 * BDWaks_v3_AUTH_FUNCTIONS.sql. We never fetch password_hash into the browser.
 */

export async function loginStaff(staffId, password) {
  const { data, error } = await supabase.rpc("authenticate_staff", {
    p_staff_id: staffId,
    p_password: password,
  });
  if (error) throw error;
  if (!data || data.length === 0) {
    return { success: false, message: "Invalid Staff ID or password." };
  }
  return { success: true, staff: data[0] };
}

export async function loginRider(riderId, password) {
  const { data, error } = await supabase.rpc("authenticate_rider", {
    p_rider_id: riderId,
    p_password: password,
  });
  if (error) throw error;
  if (!data || data.length === 0) {
    return { success: false, message: "Invalid Rider ID or password." };
  }
  return { success: true, rider: data[0] };
}

export async function loginCustomer(email, password) {
  const { data, error } = await supabase.rpc("authenticate_customer", {
    p_email: email,
    p_password: password,
  });
  if (error) throw error;
  if (!data || data.length === 0) {
    return { success: false, message: "Invalid email or password." };
  }
  return { success: true, customer: data[0] };
}

export async function setStaffPassword(staffUuid, newPassword) {
  const { error } = await supabase.rpc("set_staff_password", {
    p_staff_uuid: staffUuid,
    p_new_password: newPassword,
  });
  if (error) throw error;
  return { success: true };
}

export async function setRiderPassword(riderUuid, newPassword) {
  const { error } = await supabase.rpc("set_rider_password", {
    p_rider_uuid: riderUuid,
    p_new_password: newPassword,
  });
  if (error) throw error;
  return { success: true };
}

/**
 * Fetch which modules a staff member has been granted access to.
 * Mirrors staff_module_access, only the currently-granted (not revoked) rows.
 */
export async function getStaffModuleAccess(staffUuid) {
  const { data, error } = await supabase
    .from("staff_module_access")
    .select("module_name")
    .eq("staff_id", staffUuid)
    .is("revoked_at", null);
  if (error) throw error;
  return data.map((row) => row.module_name);
}

export async function getStaffSpecialPermissions(staffUuid) {
  const { data, error } = await supabase
    .from("staff_special_permissions")
    .select("permission")
    .eq("staff_id", staffUuid);
  if (error) throw error;
  return data.map((row) => row.permission);
}

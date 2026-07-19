# BD Waks v3 — Staff Portal (real backend)

This is a real, runnable project — not a preview. It connects to your actual
Supabase project.

## 1. Database setup (do this first, in order)

In your Supabase project's SQL Editor, run these two files **in order**:

1. `BDWaks_v3_DATABASE_SCHEMA.sql` — creates every table
2. `BDWaks_v3_AUTH_FUNCTIONS.sql` — creates the secure login functions
   (passwords are checked inside Postgres, never exposed to the browser)

## 2. Create your first Admin login manually (one-time only)

Since there's no staff yet to enroll the first Admin, run this once in the
SQL Editor, replacing the values with the real Admin's details:

```sql
insert into staff (staff_id, full_name, email, phone, password_hash, employment_status, probation_status)
values (
  'BDW/BO-1807',
  'Benedict Okafor',
  'benedict@bdwaks.com',
  '09037725139',
  hash_password('bdwaks2025'),
  'active',
  'confirmed'
)
returning id;
```

Copy the returned `id`, then grant Admin access:

```sql
insert into staff_module_access (staff_id, module_name, granted_by)
values ('<paste-the-id-here>', 'admin', '<paste-the-id-here>');

insert into staff_special_permissions (staff_id, permission, granted_by)
values ('<paste-the-id-here>', 'super_admin', '<paste-the-id-here>');
```

## 3. Run it locally

```bash
npm install
npm run dev
```

Open the local URL it prints (usually `http://localhost:5173`). Log in with
Staff ID `BDW/BO-1807` and password `bdwaks2025`.

## 4. What's real vs. what's next

**Real and working right now:**
- Staff login (checks the actual database, passwords hashed with bcrypt via pgcrypto)
- Module access fetched live from `staff_module_access`
- Onboarding/password-change flags read from the real `staff` row

**Still needs wiring (next passes):**
- The onboarding form screen, password-change screen, and the full portal UI
  (Attendance, Messages, Finance, Payroll, HR, Inventory, Rider Coordination,
  General Manager) — the *visual* versions already exist in
  `BDWaksStaffPortal.jsx` from our earlier prototyping. The next step is
  swapping their mock arrays for real calls from `src/lib/api.js`, the same
  pattern used in `StaffLogin.jsx`.
- Customer Portal and Rider Portal as their own projects (same structure —
  copy this folder, point it at the same Supabase project, build their
  screens the same way).
- File uploads (payment receipts, delivery photos, staff documents) via
  Supabase Storage — not yet wired.
- Row Level Security policies — the auth functions are secure, but you should
  add RLS policies scoped to what each screen needs before going live with
  real customer data.

## 5. Deploying

Once you're happy running it locally:

```bash
npm run build
```

This produces a `dist/` folder — deploy that to Netlify or Vercel the same
way your previous BD Waks site was deployed.

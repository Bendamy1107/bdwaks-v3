import { createClient } from "@supabase/supabase-js";

// Your BD Waks v3 Supabase project.
// Only the anon/public key belongs here — never the service_role key.
const SUPABASE_URL = "https://ibkprtfgzcfugcaradvp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlia3BydGZnemNmdWdjYXJhZHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzkzNTksImV4cCI6MjEwMDA1NTM1OX0.kbuNV048GnkgV6NH9jAnUDBBmLAaFGnvkYkYNCJzQe8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

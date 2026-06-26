import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for backend-only operations that must bypass RLS, such as
// reading/writing the locked-down external_account_tokens table. This client
// uses the SECRET service-role key and must NEVER be imported into client
// components or exposed to the browser. It does not read or persist cookies.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createServiceClient = () => {
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — required for backend token storage");
  }

  return createSupabaseClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

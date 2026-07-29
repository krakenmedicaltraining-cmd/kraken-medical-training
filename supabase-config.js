const SUPABASE_URL = "https://nipfbcnesknegakrzcfo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VAqvmzhk2q3MjfMR31_VvQ_2Gc7ACLk";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://db.thearcschool.in/";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANON_KEY) {
  console.error("Missing ANON_KEY or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

export const supabaseAdmin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (!supabaseAdmin) {
    console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is not set in .env. Admin features (like creating users) will fail.");
}

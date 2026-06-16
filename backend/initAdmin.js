import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://db.thearcschool.in/";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  console.log("Creating admin user...");

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: "admin@thearcschool.com",
    password: "admin123",
    email_confirm: true,
    user_metadata: {
      name: "Super Admin",
      type: "admin",
      status: "active"
    }
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      console.log("✅ Admin user already exists in auth.users.");
    } else {
      console.error("❌ Error creating admin user:", authError.message);
    }
  } else {
    console.log("✅ Admin user created successfully:", authData.user.id);
  }
}

createAdmin();

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: users, error } = await supabase.from('user').select('id, name, email, type');
  console.log("Error:", error);
  console.log("Users:", users.filter(u => u.email && u.email.includes("admin")));
}

test();

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error } = await supabase.from('user').select('*').ilike('name', '%nidhi%');
  console.log("Users:", users);

  if (users && users.length > 0) {
    const student_id = users[0].id;
    const { data: responses, error: e2 } = await supabase
      .from("consent_responses")
      .select("*, consent:consent_id(*)")
      .eq("student_id", student_id);
    console.log("Responses for Nidhi:", JSON.stringify(responses, null, 2));
    console.log("Error:", e2);
  }
}

check();

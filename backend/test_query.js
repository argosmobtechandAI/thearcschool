import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const student_id = '2260e65c-5b57-421f-a223-f936e0ae7e5b'; // Nidhi
  const { data, error } = await supabase
      .from("consent_responses")
      .select("*, consent:consent_id(*)")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false, foreignTable: "consent" });
      
  console.log("Data:", data);
  console.log("Error:", error);
}

check();

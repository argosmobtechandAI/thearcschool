import { supabase } from "./src/config/supabaseClient.js";

async function test() {
  const { data, error } = await supabase
    .from("consent_responses")
    .select("*, student:user!consent_responses_student_id_fkey(name, email, admission_number)")
    .limit(1);
    
  console.log("user!fkey:", error ? error.message : data);

  const { data: d2, error: e2 } = await supabase
    .from("consent_responses")
    .select("*, student:user(name, email, admission_number)")
    .limit(1);
    
  console.log("user:", e2 ? e2.message : d2);
}

test();

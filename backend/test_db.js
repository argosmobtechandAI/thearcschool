import { supabaseAdmin as supabase } from "./src/config/supabaseClient.js";

async function test() {
  const { data, error } = await supabase
    .from("receipts")
    .select("id")
    .limit(1);
    
  if (error) {
     console.error("Error:", error.message);
  } else {
     console.log("Table 'receipts' exists!");
  }
}

test();

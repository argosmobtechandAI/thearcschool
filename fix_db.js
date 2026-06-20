import { supabase } from "./backend/src/config/supabaseClient.js";

async function fixDb() {
  console.log("Fixing transaction_categories...");
  await supabase.from("transaction_categories").update({ type: "INCOME" }).eq("type", "Income");
  await supabase.from("transaction_categories").update({ type: "EXPENSE" }).eq("type", "Expense");

  console.log("Fixing transactions...");
  await supabase.from("transactions").update({ type: "INCOME" }).eq("type", "Income");
  await supabase.from("transactions").update({ type: "EXPENSE" }).eq("type", "Expense");
  console.log("Done.");
}

fixDb();

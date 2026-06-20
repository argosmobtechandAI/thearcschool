import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: students, error: studentError } = await supabaseAdmin
      .from("user")
      .select("id, type, fee_exempted, bus_fee")
      .eq("type", "student")
      .eq("status", "active");
      
    if (studentError) {
        console.error("Student error:", studentError);
        return;
    }
    
    const studentIds = students.map(s => s.id);
    
    const { data: transactions, error: txErr } = await supabaseAdmin
        .from("transactions")
        .select("student_id, amount")
        .eq("status", "COMPLETED")
        .in("student_id", studentIds);

    if (txErr) {
        console.error("TX ERROR:", txErr);
    } else {
        console.log("Success! TX count:", transactions?.length);
    }
}
run();

import { calculateTotalVirtualDueForStudent } from './src/api/finance_panel/virtualFeeCalculator.js';
import { supabaseAdmin } from './src/config/supabaseClient.js';

async function run() {
  const { data: students } = await supabaseAdmin.from("user").select("*").eq("admission_number", "230130");
  const s = students[0];
  const { data: structures } = await supabaseAdmin.from("fee_structures").select("*").eq("academic_year", "2026-2027");
  const { data: paymentsData } = await supabaseAdmin.from("payments_ledger").select("*").eq("student_id", s.id);

  let virt = calculateTotalVirtualDueForStudent(s, "1", structures, paymentsData, 2026, 5, 0, 0, "2026-2027");
  console.log("Virtual:", virt);
}
run();

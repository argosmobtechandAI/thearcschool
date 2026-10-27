import { supabaseAdmin as supabase } from "../src/config/supabaseClient.js";

async function cleanupDuplicates(isDryRun = true) {
  console.log(`--- Starting Transport Fees Cleanup (Dry Run: ${isDryRun}) ---`);

  // 1. Fetch all bus students
  const { data: students, error: sErr } = await supabase
    .from("user")
    .select("id, name, admission_number")
    .eq("type", "student")
    .gt("bus_fee", 0);

  if (sErr || !students) {
    console.error("Error fetching students:", sErr);
    return;
  }

  console.log(`Checking ${students.length} bus students...`);

  let totalDuplicateRowsFound = 0;
  let studentsWithDuplicates = 0;
  const duplicateIdsToDelete = [];

  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    
    // Fetch all student_fees for this student
    // Since some students have ~5,280 rows, we paginate
    let allFees = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("student_fees")
        .select("id, student_id, fee_id, payment_status, total_paid_amount")
        .eq("student_id", s.id)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error(`Error fetching fees for ${s.name} (${s.admission_number}):`, error);
        break;
      }
      if (!data || data.length === 0) break;
      allFees = allFees.concat(data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (allFees.length <= 12) continue; // No duplicates

    // Group by fee_id
    const feeGroups = new Map();
    for (const f of allFees) {
      if (!feeGroups.has(f.fee_id)) {
        feeGroups.set(f.fee_id, []);
      }
      feeGroups.get(f.fee_id).push(f);
    }

    let studentDupesCount = 0;
    for (const [feeId, group] of feeGroups.entries()) {
      if (group.length > 1) {
        // Find best record to keep:
        // Prefer one with total_paid_amount > 0 or payment_status === 'Paid', else the first one (lowest id)
        let keepRecord = group.find(r => (Number(r.total_paid_amount) > 0 || r.payment_status === 'Paid')) || group[0];
        
        for (const r of group) {
          if (r.id !== keepRecord.id) {
            duplicateIdsToDelete.push(r.id);
            studentDupesCount++;
          }
        }
      }
    }

    if (studentDupesCount > 0) {
      studentsWithDuplicates++;
      totalDuplicateRowsFound += studentDupesCount;
      console.log(`Student ${s.name} (Adm: ${s.admission_number}): ${allFees.length} total rows -> ${studentDupesCount} duplicates marked for deletion.`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Students with duplicates: ${studentsWithDuplicates}`);
  console.log(`Total duplicate rows identified: ${totalDuplicateRowsFound}`);

  if (isDryRun) {
    console.log("DRY RUN: No rows were deleted. Run with isDryRun = false to execute deletion.");
    return;
  }

  // Execute deletion in batches of 500
  console.log(`Executing deletion of ${duplicateIdsToDelete.length} rows in batches...`);
  const BATCH_SIZE = 500;
  let deletedCount = 0;

  for (let i = 0; i < duplicateIdsToDelete.length; i += BATCH_SIZE) {
    const batch = duplicateIdsToDelete.slice(i, i + BATCH_SIZE);
    const { error: delErr } = await supabase
      .from("student_fees")
      .delete()
      .in("id", batch);

    if (delErr) {
      console.error(`Error deleting batch ${i} to ${i + batch.length}:`, delErr);
      break;
    }
    deletedCount += batch.length;
    if (deletedCount % 10000 === 0 || deletedCount === duplicateIdsToDelete.length) {
      console.log(`Deleted ${deletedCount} / ${duplicateIdsToDelete.length} rows...`);
    }
  }

  console.log(`Cleanup complete! Successfully deleted ${deletedCount} duplicate rows.`);
}

const isDry = process.argv[2] !== "--execute";
cleanupDuplicates(isDry);

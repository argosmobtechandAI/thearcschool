import { supabaseAdmin as supabase } from "./src/config/supabaseClient.js";

async function cleanDuplicates() {
  console.log("Fetching all student fees...");
  const { data: studentFees, error } = await supabase
    .from("student_fees")
    .select("id, student_id, fee_id, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching student fees:", error);
    return;
  }

  const { data: fees } = await supabase.from("fee").select("id, title");
  const feeMap = new Map(fees.map(f => [f.id, f.title]));

  console.log(`Fetched ${studentFees.length} student fee records.`);

  // Group by student_id and fee title (transport fees)
  const map = new Map();
  const toDelete = [];

  for (const sf of studentFees) {
    const title = feeMap.get(sf.fee_id) || "";
    if (title.startsWith("Transport Fee - ")) {
      const key = `${sf.student_id}-${title}`;
      if (map.has(key)) {
        toDelete.push(sf.id);
      } else {
        map.set(key, sf.id);
      }
    }
  }

  console.log(`Found ${toDelete.length} duplicate transport fees to delete.`);

  // Delete in batches
  const batchSize = 100;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error: deleteError } = await supabase
      .from("student_fees")
      .delete()
      .in("id", batch);
    
    if (deleteError) {
      console.error("Error deleting batch:", deleteError);
    } else {
      console.log(`Deleted batch ${i / batchSize + 1}`);
    }
  }

  console.log("Cleanup complete!");
}

cleanDuplicates();

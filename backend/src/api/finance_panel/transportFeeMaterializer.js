import { supabaseAdmin as supabase } from "../../config/supabaseClient.js";

export const autoMaterializeTransportFees = async () => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0 = Jan, 11 = Dec
    const currentYear = today.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // Determine session start
    let sessionStartYear = currentYear;
    if (currentMonth < 3) sessionStartYear -= 1;

    let monthsPassed = 0;
    if (currentYear === sessionStartYear && currentMonth >= 3) {
      monthsPassed = currentMonth - 3 + 1;
    } else if (currentYear === sessionStartYear + 1 && currentMonth < 3) {
      monthsPassed = 9 + currentMonth + 1;
    }

    // Fetch all active students with bus_fee > 0
    const { data: students, error: studentError } = await supabase
      .from("user")
      .select("id, bus_fee")
      .eq("type", "student")
      .gt("bus_fee", 0);

    if (studentError) throw studentError;
    if (!students || students.length === 0) return;

    // Fetch existing transport fees in student_fees for this session to avoid duplicates
    // We need to fetch the fee relation to get the title
    const { data: existingFees } = await supabase
      .from("student_fees")
      .select("student_id, fee_id, fee!inner(title)")
      .like("fee.title", "Transport Fee - %");

    const existingFeeSet = new Set((existingFees || []).map(f => `${f.student_id}-${f.fee?.title}`));

    const feeRecordsNeeded = new Map(); // key: "Title-Amount", value: { title, amount, dueDate }

    // Identify which fee records we need
    for (let i = 0; i < monthsPassed; i++) {
      const mIndex = (3 + i) % 12;
      const mYear = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
      const feeTitle = `Transport Fee - ${monthNames[mIndex]} ${mYear}`;
      const dueDate = new Date(mYear, mIndex, 10).toISOString().split('T')[0];

      for (const s of students) {
        if (!existingFeeSet.has(`${s.id}-${feeTitle}`)) {
          const key = `${feeTitle}-${s.bus_fee}`;
          if (!feeRecordsNeeded.has(key)) {
            feeRecordsNeeded.set(key, { title: feeTitle, amount: s.bus_fee, due_date: dueDate, fee_type: "Monthly" });
          }
        }
      }
    }

    if (feeRecordsNeeded.size === 0) return;

    // Fetch all existing fee templates that match our needed titles and amounts
    const { data: existingFeeTemplates } = await supabase
      .from("fee")
      .select("id, title, amount")
      .like("title", "Transport Fee - %");

    const feeTemplateMap = new Map(); // key: "Title-Amount", value: fee_id
    (existingFeeTemplates || []).forEach(f => {
      feeTemplateMap.set(`${f.title}-${f.amount}`, f.id);
    });

    // Insert missing fee templates
    const newFeeTemplates = [];
    for (const [key, details] of feeRecordsNeeded.entries()) {
      if (!feeTemplateMap.has(key)) {
        newFeeTemplates.push(details);
      }
    }

    if (newFeeTemplates.length > 0) {
      const { data: insertedTemplates, error: insertError } = await supabase
        .from("fee")
        .insert(newFeeTemplates)
        .select();

      if (insertError) throw insertError;
      (insertedTemplates || []).forEach(f => {
        feeTemplateMap.set(`${f.title}-${f.amount}`, f.id);
      });
    }

    // Now insert student_fees
    const studentFeesToInsert = [];
    for (let i = 0; i < monthsPassed; i++) {
      const mIndex = (3 + i) % 12;
      const mYear = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
      const feeTitle = `Transport Fee - ${monthNames[mIndex]} ${mYear}`;

      for (const s of students) {
        if (!existingFeeSet.has(`${s.id}-${feeTitle}`)) {
          const feeId = feeTemplateMap.get(`${feeTitle}-${s.bus_fee}`);
          if (feeId) {
            studentFeesToInsert.push({
              student_id: s.id,
              fee_id: feeId,
              payment_status: "Unpaid",
              total_paid_amount: 0
            });
            // Mark as added to avoid duplicates in the same run if any logic overlaps
            existingFeeSet.add(`${s.id}-${feeTitle}`);
          }
        }
      }
    }

    if (studentFeesToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("student_fees")
        .insert(studentFeesToInsert);

      if (insertErr) throw insertErr;
      console.log(`Successfully auto-materialized ${studentFeesToInsert.length} missing transport fees.`);
    }
    
  } catch (err) {
    console.error("Error auto-materializing transport fees:", err);
  }
};

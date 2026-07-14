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

    let monthsPassed = 12; // Always materialize for the full year

    // Fetch all active students with bus_fee > 0
    const { data: students, error: studentError } = await supabase
      .from("user")
      .select("id, bus_fee, bus_start_date")
      .eq("type", "student")
      .gt("bus_fee", 0);

    if (studentError) throw studentError;
    if (!students || students.length === 0) return;

    // Fetch existing transport fees in student_fees for this session to avoid duplicates
    // We need to fetch the fee relation to get the title
    const { data: existingFees } = await supabase
      .from("student_fees")
      .select("id, student_id, fee_id, payment_status, total_paid_amount, fee!inner(title, amount)")
      .like("fee.title", "Transport Fee - %");

    const existingFeeMap = new Map();
    (existingFees || []).forEach(f => {
      const baseTitle = (f.fee?.title || "").replace(" (Pro-rated)", "");
      existingFeeMap.set(`${f.student_id}-${baseTitle}`, f);
    });

    const feeRecordsNeeded = new Map(); // key: "Title-Amount", value: { title, amount, dueDate }

    // Identify which fee records we need
    for (let i = 0; i < monthsPassed; i++) {
      const mIndex = (3 + i) % 12;
      const mYear = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
      const feeTitle = `Transport Fee - ${monthNames[mIndex]} ${mYear}`;
      const dueDate = new Date(mYear, mIndex, 10).toISOString().split('T')[0];

      for (const s of students) {
        let amount = s.bus_fee;
        let finalFeeTitle = feeTitle;

        if (s.bus_start_date) {
           const startDate = new Date(s.bus_start_date);
           const startYear = startDate.getFullYear();
           const startMonth = startDate.getMonth();
           
           if (mYear < startYear || (mYear === startYear && mIndex < startMonth)) {
             continue; // Skip months before start date
           }
           
           if (mYear === startYear && mIndex === startMonth) {
             const startDay = startDate.getDate();
             if (startDay > 1) {
                const daysInMonth = new Date(mYear, mIndex + 1, 0).getDate();
                const daysUsed = daysInMonth - startDay + 1;
                amount = Math.round((s.bus_fee * daysUsed) / daysInMonth);
                finalFeeTitle = `${feeTitle} (Pro-rated)`;
             }
           }
        }

        const existingFee = existingFeeMap.get(`${s.id}-${feeTitle}`);
        // If fee doesn't exist, OR it exists but the title or amount is wrong
        if (!existingFee || existingFee.fee.title !== finalFeeTitle || existingFee.fee.amount !== amount) {
          const key = `${finalFeeTitle}-${amount}`;
          if (!feeRecordsNeeded.has(key)) {
            feeRecordsNeeded.set(key, { title: finalFeeTitle, amount: amount, due_date: dueDate, fee_type: "Monthly" });
          }
        }
      }
    }

    if (feeRecordsNeeded.size > 0) {
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

      // Now insert or update student_fees
      const studentFeesToInsert = [];
      const studentFeesToUpdate = [];

      for (let i = 0; i < monthsPassed; i++) {
        const mIndex = (3 + i) % 12;
        const mYear = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
        const feeTitle = `Transport Fee - ${monthNames[mIndex]} ${mYear}`;

        for (const s of students) {
          let amount = s.bus_fee;
          let finalFeeTitle = feeTitle;

          if (s.bus_start_date) {
             const startDate = new Date(s.bus_start_date);
             const startYear = startDate.getFullYear();
             const startMonth = startDate.getMonth();
             
             if (mYear < startYear || (mYear === startYear && mIndex < startMonth)) {
               continue; // Skip months before start date
             }
             
             if (mYear === startYear && mIndex === startMonth) {
               const startDay = startDate.getDate();
               if (startDay > 1) {
                  const daysInMonth = new Date(mYear, mIndex + 1, 0).getDate();
                  const daysUsed = daysInMonth - startDay + 1;
                  amount = Math.round((s.bus_fee * daysUsed) / daysInMonth);
                  finalFeeTitle = `${feeTitle} (Pro-rated)`;
               }
             }
          }

          const existingFee = existingFeeMap.get(`${s.id}-${feeTitle}`);
          const feeId = feeTemplateMap.get(`${finalFeeTitle}-${amount}`);

          if (!existingFee) {
            if (feeId) {
              studentFeesToInsert.push({
                student_id: s.id,
                fee_id: feeId,
                payment_status: "Unpaid",
                total_paid_amount: 0
              });
              existingFeeMap.set(`${s.id}-${feeTitle}`, { fee: { title: finalFeeTitle, amount } });
            }
          } else if (existingFee.payment_status === "Unpaid" && existingFee.total_paid_amount === 0) {
            if (existingFee.fee.title !== finalFeeTitle || existingFee.fee.amount !== amount) {
              if (feeId) {
                studentFeesToUpdate.push({
                  id: existingFee.id,
                  fee_id: feeId
                });
                existingFeeMap.set(`${s.id}-${feeTitle}`, { ...existingFee, fee: { title: finalFeeTitle, amount } });
              }
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

      if (studentFeesToUpdate.length > 0) {
        for (const sf of studentFeesToUpdate) {
          await supabase.from("student_fees").update({ fee_id: sf.fee_id }).eq("id", sf.id);
        }
        console.log(`Successfully updated ${studentFeesToUpdate.length} transport fees.`);
      }
    }
  } catch (err) {
    console.error("Error auto-materializing transport fees:", err);
  }
};

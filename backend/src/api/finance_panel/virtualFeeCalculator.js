import { supabaseAdmin as supabase } from "../../config/supabaseClient.js";

// Helper to determine the current academic year
export const getCurrentAcademicYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed, 0 = Jan, 3 = April
  let year = today.getFullYear();
  if (month < 3) year -= 1; // If Jan-Mar, it belongs to the previous year's session
  return `${year}-${year + 1}`;
};

// Generate virtual dues for a student
export const calculateVirtualDues = async (studentId, academicYear = getCurrentAcademicYear()) => {
  // 1. Fetch student details
  const { data: student, error: studentErr } = await supabase
    .from("user")
    .select("*")
    .eq("id", studentId)
    .single();

  if (studentErr || !student) throw new Error("Failed to fetch student details: " + (studentErr?.message || "Not found"));
  if (student.fee_exempted) return { virtualDues: [], payments: [] }; // No dues if exempted

  // Fetch class mapping separately to avoid FK relationship issues
  const { data: classMap } = await supabase
    .from("class_students")
    .select("class_id")
    .eq("student_id", studentId)
    .single();

  let className = null;
  if (classMap && classMap.class_id) {
    const { data: classObj } = await supabase
      .from("class")
      .select("name")
      .eq("id", classMap.class_id)
      .single();
    if (classObj) className = classObj.name;
  }

  // 2. Fetch fee structures for this academic year
  const { data: structures, error: structErr } = await supabase
    .from("fee_structures")
    .select("*")
    .eq("academic_year", academicYear)
    .or(`class_name.eq.${className},class_name.is.null`);

  if (structErr) throw new Error("Failed to fetch fee structures");

  const virtualDues = [];
  const sessionStartYear = parseInt(academicYear.split("-")[0]);
  
  // Create an array of months from April to current month (or March if next year)
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let monthsPassed = 0;
  if (currentYear === sessionStartYear && currentMonth >= 3) {
    monthsPassed = currentMonth - 3 + 1; // Apr = 0+1=1, May = 1+1=2, etc.
  } else if (currentYear === sessionStartYear + 1 && currentMonth < 3) {
    monthsPassed = 9 + currentMonth + 1; // Apr-Dec (9) + Jan (1) = 10
  } else if (currentYear > sessionStartYear) {
    monthsPassed = 12; // Whole year passed
  }

  // Cap at 12 months
  if (monthsPassed > 12) monthsPassed = 12;
  if (monthsPassed < 0) monthsPassed = 0;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // 3. Generate the dues dynamically for ALL configured fee structures
  structures.forEach(struct => {
    let frequency = 'monthly';
    let baseCategory = struct.fee_category;
    
    if (struct.fee_category.endsWith('_annual')) {
      frequency = 'annual';
      baseCategory = struct.fee_category.replace('_annual', '');
    } else if (struct.fee_category.endsWith('_one_time')) {
      frequency = 'one_time';
      baseCategory = struct.fee_category.replace('_one_time', '');
    } else if (struct.fee_category.endsWith('_monthly')) {
      frequency = 'monthly';
      baseCategory = struct.fee_category.replace('_monthly', '');
    }

    const categoryTitle = baseCategory.split(/[_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    let joinMonthStart = new Date(sessionStartYear, 3, 1); // default April 1st of session
    if (student.created_at) {
        const cDate = new Date(student.created_at);
        joinMonthStart = new Date(cDate.getFullYear(), cDate.getMonth(), 1);
    }

    if (frequency === 'annual') {
      if (monthsPassed > 0) {
        const monthIndex = 3; // April always
        const year = sessionStartYear;
        const dueDate = new Date(year, monthIndex, 10).toISOString().split('T')[0];
        
        virtualDues.push({
          id: `virtual-${struct.id}-${monthIndex}-${year}`,
          fee: {
            title: `${categoryTitle} - ${year}-${year+1}`,
            base_title: `${categoryTitle} - ${year}-${year+1}`,
            amount: struct.amount,
            due_date: dueDate,
            fee_type: "Annual"
          },
          status: "pending",
          total_paid_amount: 0,
          category: struct.fee_category,
          month: monthIndex,
          year: year
        });
      }
    } else if (frequency === 'one_time') {
      if (monthsPassed > 0) {
        let monthIndex = 3; // April default
        let year = sessionStartYear;
        
        if (struct.created_at) {
          const createdDate = new Date(struct.created_at);
          if (createdDate > new Date(sessionStartYear, 3, 1)) {
            // Next month of creation
            monthIndex = createdDate.getMonth() + 1;
            year = createdDate.getFullYear();
            if (monthIndex > 11) {
              monthIndex = 0;
              year += 1;
            }
          }
        }
        
        const dueDate = new Date(year, monthIndex, 10).toISOString().split('T')[0];
        
        virtualDues.push({
          id: `virtual-${struct.id}-${monthIndex}-${year}`,
          fee: {
            title: `${categoryTitle} - ${year}-${year+1}`,
            base_title: `${categoryTitle} - ${year}-${year+1}`,
            amount: struct.amount,
            due_date: dueDate,
            fee_type: "One-time"
          },
          status: "pending",
          total_paid_amount: 0,
          category: struct.fee_category,
          month: monthIndex,
          year: year
        });
      }
    } else {
      // Monthly
      for (let i = 0; i < monthsPassed; i++) {
        const monthIndex = (3 + i) % 12;
        const year = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
        
        const dueMonthStart = new Date(year, monthIndex, 1);
        if (dueMonthStart >= joinMonthStart) {
          const dueDate = new Date(year, monthIndex, 10).toISOString().split('T')[0]; 
          
          virtualDues.push({
            id: `virtual-${struct.id}-${monthIndex}-${year}`,
            fee: {
              title: `${categoryTitle} - ${monthNames[monthIndex]} ${year}`,
              base_title: `${categoryTitle} - ${monthNames[monthIndex]} ${year}`,
              amount: struct.amount,
              due_date: dueDate,
              fee_type: "Monthly"
            },
            status: "pending",
            total_paid_amount: 0,
            category: struct.fee_category,
            month: monthIndex,
            year: year
          });
        }
      }
    }
  });

  // Fetch physical Ad-Hoc/Materialized fees from student_fees
  const { data: physicalFees, error: physicalErr } = await supabase
    .from("student_fees")
    .select("*, fee(*)")
    .eq("student_id", studentId);

  if (!physicalErr && physicalFees) {
    physicalFees.forEach(fee => {
      const actualFee = fee.fee || {};
      const feeTitle = actualFee.title || "Ad-Hoc Fee";
      virtualDues.push({
        id: `physical-${fee.id}`,
        fee: {
          title: feeTitle,
          base_title: feeTitle,
          amount: actualFee.amount || 0,
          due_date: actualFee.due_date || new Date().toISOString().split('T')[0],
          fee_type: actualFee.fee_type || "Ad-Hoc"
        },
        status: "pending",
        total_paid_amount: fee.total_paid_amount || 0,
        category: feeTitle.toLowerCase().includes("transport") ? "transport" : "ad-hoc",
        month: actualFee.due_date ? new Date(actualFee.due_date).getMonth() : new Date().getMonth(),
        year: actualFee.due_date ? new Date(actualFee.due_date).getFullYear() : new Date().getFullYear()
      });
    });
  }

  // 4. Match with payments
  const { data: payments, error: paymentsError } = await supabase
    .from("payments_ledger")
    .select("*")
    .eq("student_id", studentId);

  if (paymentsError) throw paymentsError;

  // 5. Fetch Late Fee Penalty Amount
  const { data: settingsData } = await supabase.from("school_settings").select("late_fee_penalty").limit(1).single();
  const lateFeePenaltyAmount = settingsData?.late_fee_penalty !== undefined && settingsData?.late_fee_penalty !== null ? Number(settingsData.late_fee_penalty) : 10;

  const todayDate = new Date();

  virtualDues.forEach(due => {
    const relatedPayments = payments.filter(p => p.remarks && p.remarks.includes(due.fee.base_title));
    const totalPaid = relatedPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
    
    due.total_paid_amount = totalPaid;
    if (totalPaid >= due.fee.amount) {
      due.status = "paid";
    } else {
      due.status = "pending";
    }

    const dueDateObj = new Date(due.fee.due_date);
    let penaltyEndDate = todayDate;
    if (relatedPayments.length > 0) {
      const sortedPayments = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      penaltyEndDate = new Date(sortedPayments[0].created_at);
    }

    if (penaltyEndDate > dueDateObj && due.status !== "paid") {
       const daysLate = Math.floor((penaltyEndDate - dueDateObj) / (1000 * 60 * 60 * 24));
       if (daysLate > 0) {
         const penalty = daysLate * lateFeePenaltyAmount;
         due.fee.amount += penalty;
         due.fee.penalty = penalty; // Keep track of breakup
         due.fee.title += ` (+₹${penalty} Late Fee)`;
         
         if (totalPaid >= due.fee.amount) {
           due.status = "paid";
         } else {
           due.status = "pending";
         }
       }
    }
  });

  return { virtualDues, payments };
};

export const calculateTotalVirtualDueForStudent = (student, sClassName, structures, sPayments, sessionStartYear, monthsPassed, lateFeePenaltyAmount = 10, startMonthsPassed = 0) => {
  let totalVirtualDue = 0;
  if (student.fee_exempted) return 0;

  const todayDate = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const sStructures = (structures || []).filter(st => st.class_name === sClassName || !st.class_name);

  sStructures.forEach(struct => {
    let frequency = 'monthly';
    let baseCategory = struct.fee_category;
    
    if (struct.fee_category.endsWith('_annual')) {
      frequency = 'annual';
      baseCategory = struct.fee_category.replace('_annual', '');
    } else if (struct.fee_category.endsWith('_one_time')) {
      frequency = 'one_time';
      baseCategory = struct.fee_category.replace('_one_time', '');
    } else if (struct.fee_category.endsWith('_monthly')) {
      frequency = 'monthly';
      baseCategory = struct.fee_category.replace('_monthly', '');
    }

    const categoryTitle = baseCategory.split(/[_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    let joinMonthStart = new Date(sessionStartYear, 3, 1); // default April 1st of session
    if (student.created_at) {
        const cDate = new Date(student.created_at);
        joinMonthStart = new Date(cDate.getFullYear(), cDate.getMonth(), 1);
    }

    if (frequency === 'annual') {
      if (monthsPassed > 0 && startMonthsPassed === 0) {
        const monthIndex = 3;
        const year = sessionStartYear;
        const dueDateObj = new Date(year, monthIndex, 10);
        
        const feeTitle = `${categoryTitle} - ${year}-${year+1}`;
        
        let amount = struct.amount;
        const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
        const totalPaid = relatedPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
        
        let penaltyEndDate = todayDate;
        if (relatedPayments.length > 0) {
          const sortedPayments = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          penaltyEndDate = new Date(sortedPayments[0].created_at);
        }

        if (penaltyEndDate > dueDateObj && totalPaid < amount) {
           const daysLate = Math.floor((penaltyEndDate - dueDateObj) / (1000 * 60 * 60 * 24));
           if (daysLate > 0) {
             amount += daysLate * lateFeePenaltyAmount;
           }
        }
        totalVirtualDue += amount;
      }
    } else if (frequency === 'one_time') {
      if (monthsPassed > 0) {
        let monthIndex = 3;
        let year = sessionStartYear;
        
        if (struct.created_at) {
          const createdDate = new Date(struct.created_at);
          if (createdDate > new Date(sessionStartYear, 3, 1)) {
            // Next month of creation
            monthIndex = createdDate.getMonth() + 1;
            year = createdDate.getFullYear();
            if (monthIndex > 11) {
              monthIndex = 0;
              year += 1;
            }
          }
        }
        
        const dueDateObj = new Date(year, monthIndex, 10);
        
        const feeTitle = `${categoryTitle} - ${year}-${year+1}`;
        
        let amount = struct.amount;
        const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
        const totalPaid = relatedPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
        
        let penaltyEndDate = todayDate;
        if (relatedPayments.length > 0) {
          const sortedPayments = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          penaltyEndDate = new Date(sortedPayments[0].created_at);
        }

        if (penaltyEndDate > dueDateObj && totalPaid < amount) {
           const daysLate = Math.floor((penaltyEndDate - dueDateObj) / (1000 * 60 * 60 * 24));
           if (daysLate > 0) {
             amount += daysLate * lateFeePenaltyAmount;
           }
        }
        totalVirtualDue += amount;
      }
    } else {
      for (let i = startMonthsPassed; i < monthsPassed; i++) {
        const monthIndex = (3 + i) % 12;
        const year = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
        
        const dueMonthStart = new Date(year, monthIndex, 1);
        if (dueMonthStart >= joinMonthStart) {
          const dueDateObj = new Date(year, monthIndex, 10);
          
          const feeTitle = `${categoryTitle} - ${monthNames[monthIndex]} ${year}`;
          
          let amount = struct.amount;
          const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
          const totalPaid = relatedPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
          
          let penaltyEndDate = todayDate;
          if (relatedPayments.length > 0) {
            const sortedPayments = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            penaltyEndDate = new Date(sortedPayments[0].created_at);
          }

          if (penaltyEndDate > dueDateObj && totalPaid < amount) {
             const daysLate = Math.floor((penaltyEndDate - dueDateObj) / (1000 * 60 * 60 * 24));
             if (daysLate > 0) {
               amount += daysLate * lateFeePenaltyAmount;
             }
          }
          totalVirtualDue += amount;
        }
      }
    }
  });



  return totalVirtualDue;
};

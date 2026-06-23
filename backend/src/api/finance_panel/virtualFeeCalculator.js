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

  // 2. Fetch ALL fee structures for this student's class (or generic) to do global waterfall
  const { data: structures, error: structErr } = await supabase
    .from("fee_structures")
    .select("*")
    .or(`class_name.eq.${className},class_name.is.null`);

  if (structErr) throw new Error("Failed to fetch fee structures");

  const virtualDues = [];
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // 3. Generate the dues dynamically for ALL configured fee structures
  structures.forEach(struct => {
    const structAcademicYear = struct.academic_year;
    if (!structAcademicYear) return;
    const sessionStartYear = parseInt(structAcademicYear.split("-")[0]);
    
    let monthsPassed = 0;
    if (currentYear === sessionStartYear && currentMonth >= 3) {
      monthsPassed = currentMonth - 3 + 1; // Apr = 0+1=1, May = 1+1=2, etc.
    } else if (currentYear === sessionStartYear + 1 && currentMonth < 3) {
      monthsPassed = 9 + currentMonth + 1; // Apr-Dec (9) + Jan (1) = 10
    } else if (currentYear > sessionStartYear) {
      monthsPassed = 12; // Whole year passed
    } else {
      monthsPassed = 0; // Future year
    }

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

    if (frequency === 'annual') {
      if (monthsPassed > 0) {
        const monthIndex = 3; // April always
        const year = sessionStartYear;
        const dueDate = `${year}-04-10`;
        
        virtualDues.push({
          id: `virtual-${struct.id}-${monthIndex}-${year}`,
          academic_year: structAcademicYear,
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
            monthIndex = createdDate.getMonth() + 1;
            year = createdDate.getFullYear();
            if (monthIndex > 11) {
              monthIndex = 0;
              year += 1;
            }
          }
        }
        
        const dueDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-10`;
        
        virtualDues.push({
          id: `virtual-${struct.id}-${monthIndex}-${year}`,
          academic_year: structAcademicYear,
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
          const dueDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-10`;
          
          virtualDues.push({
            id: `virtual-${struct.id}-${monthIndex}-${year}`,
            academic_year: structAcademicYear,
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

  // Helper: convert a date to IST day number (days since epoch at IST midnight)
  const toISTDayNumber = (date) => {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    return Math.floor((date.getTime() + IST_OFFSET_MS) / (1000 * 60 * 60 * 24));
  };

  const todayDate = new Date();
  const todayISTDay = toISTDayNumber(todayDate);

  // Step 1: Calculate penalties using strict remark matching (same logic as before)
  virtualDues.forEach(due => {
    const relatedPayments = payments.filter(p => p.remarks && p.remarks.includes(due.fee.base_title));
    // Parse due_date as IST midnight by appending T00:00:00+05:30
    const dueDateObj = new Date(due.fee.due_date + 'T00:00:00+05:30');
    const dueDayNumber = toISTDayNumber(dueDateObj);
    let penaltyEndDayNumber = todayISTDay;
    
    if (relatedPayments.length > 0) {
      const sortedPayments = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      penaltyEndDayNumber = toISTDayNumber(new Date(sortedPayments[0].created_at));
      
      const latestPayment = [...relatedPayments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      due.payment_date = latestPayment.created_at;
    }

    if (penaltyEndDayNumber > dueDayNumber) {
       const daysLate = penaltyEndDayNumber - dueDayNumber;
       if (daysLate > 0) {
         const penalty = daysLate * lateFeePenaltyAmount;
         due.fee.amount += penalty;
         due.fee.penalty = penalty;
         due.fee.title += ` (+₹${penalty} Late Fee)`;
       }
    }
  });

  // Step 2: Explicit Allocation followed by Global Waterfall
  const paymentBalances = payments.map(p => ({
    ...p,
    remaining: Number(p.amount_paid || 0)
  }));

  // Sort dues chronologically by due date so oldest dues are processed first
  virtualDues.sort((a, b) => new Date(a.fee.due_date) - new Date(b.fee.due_date));

  // First pass: Explicit Allocation
  virtualDues.forEach(due => {
    due.total_paid_amount = 0;
    due.status = "pending";
    
    // Find payments specifically mentioning this due
    const matchingPayments = paymentBalances.filter(p => p.remaining > 0 && p.remarks && p.remarks.includes(due.fee.base_title));
    
    matchingPayments.forEach(p => {
      const amountNeeded = due.fee.amount - due.total_paid_amount;
      if (amountNeeded <= 0) return;
      
      const amountToApply = Math.min(p.remaining, amountNeeded);
      due.total_paid_amount += amountToApply;
      p.remaining -= amountToApply;
    });
    
    if (due.total_paid_amount >= due.fee.amount) {
      due.status = "paid";
    }
  });

  // Second pass: Global Waterfall for remaining unallocated money
  let unallocatedPaymentPool = paymentBalances.reduce((sum, p) => sum + p.remaining, 0);

  if (unallocatedPaymentPool > 0) {
    virtualDues.forEach(due => {
      if (unallocatedPaymentPool <= 0) return;
      
      const amountNeeded = due.fee.amount - due.total_paid_amount;
      if (amountNeeded > 0) {
        const amountToApply = Math.min(unallocatedPaymentPool, amountNeeded);
        due.total_paid_amount += amountToApply;
        unallocatedPaymentPool -= amountToApply;
        
        if (due.total_paid_amount >= due.fee.amount) {
          due.status = "paid";
        }
      }
    });
  }

  const filteredVirtualDues = virtualDues.filter(due => due.academic_year === academicYear);
  const filteredStructures = structures.filter(s => s.academic_year === academicYear);

  return { virtualDues: filteredVirtualDues, payments, structures: filteredStructures };
};

export const calculateTotalVirtualDueForStudent = (student, sClassName, structures, sPayments, sessionStartYear, monthsPassed, lateFeePenaltyAmount = 10, startMonthsPassed = 0) => {
  let totalVirtualDue = 0;
  if (student.fee_exempted) return 0;

  const todayDate = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Helper: convert a date to IST day number (same fix as calculateVirtualDues)
  const toISTDayNumber = (date) => {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    return Math.floor((date.getTime() + IST_OFFSET_MS) / (1000 * 60 * 60 * 24));
  };
  const todayISTDay = toISTDayNumber(todayDate);

  const getDaysLate = (dueDateStr, paymentDates) => {
    // Parse due date as IST midnight
    const dueDateObj = new Date(dueDateStr + 'T00:00:00+05:30');
    const dueDayNumber = toISTDayNumber(dueDateObj);
    let penaltyEndDayNumber = todayISTDay;
    if (paymentDates && paymentDates.length > 0) {
      penaltyEndDayNumber = toISTDayNumber(new Date(paymentDates[0]));
    }
    return Math.max(0, penaltyEndDayNumber - dueDayNumber);
  };

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

    if (frequency === 'annual') {
      if (monthsPassed > 0 && startMonthsPassed === 0) {
        const year = sessionStartYear;
        const dueDateStr = `${year}-04-10`;
        const feeTitle = `${categoryTitle} - ${year}-${year+1}`;
        
        let amount = struct.amount;
        const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
        const sortedDates = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(p => p.created_at);
        
        const daysLate = getDaysLate(dueDateStr, sortedDates);
        if (daysLate > 0) amount += daysLate * lateFeePenaltyAmount;
        totalVirtualDue += amount;
      }
    } else if (frequency === 'one_time') {
      if (monthsPassed > 0) {
        let monthIndex = 3;
        let year = sessionStartYear;
        
        if (struct.created_at) {
          const createdDate = new Date(struct.created_at);
          if (createdDate > new Date(sessionStartYear, 3, 1)) {
            monthIndex = createdDate.getMonth() + 1;
            year = createdDate.getFullYear();
            if (monthIndex > 11) { monthIndex = 0; year += 1; }
          }
        }
        
        const dueDateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-10`;
        const feeTitle = `${categoryTitle} - ${year}-${year+1}`;
        
        let amount = struct.amount;
        const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
        const sortedDates = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(p => p.created_at);
        
        const daysLate = getDaysLate(dueDateStr, sortedDates);
        if (daysLate > 0) amount += daysLate * lateFeePenaltyAmount;
        totalVirtualDue += amount;
      }
    } else {
      for (let i = startMonthsPassed; i < monthsPassed; i++) {
        const monthIndex = (3 + i) % 12;
        const year = (3 + i) > 11 ? sessionStartYear + 1 : sessionStartYear;
        
        const dueMonthStart = new Date(year, monthIndex, 1);
        if (dueMonthStart >= joinMonthStart) {
          const dueDateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-10`;
          const feeTitle = `${categoryTitle} - ${monthNames[monthIndex]} ${year}`;
          
          let amount = struct.amount;
          const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
          const sortedDates = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(p => p.created_at);
          
          const daysLate = getDaysLate(dueDateStr, sortedDates);
          if (daysLate > 0) amount += daysLate * lateFeePenaltyAmount;
          totalVirtualDue += amount;
        }
      }
    }
  });



  return totalVirtualDue;
};

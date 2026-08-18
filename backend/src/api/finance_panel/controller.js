import { supabase, supabaseAdmin } from "../../config/supabaseClient.js";

export const getDashboardStats = async (req, res) => {
  try {
    await autoMaterializeTransportFees();
    const { startDate, endDate, academic_year } = req.query;

    const { count: totalStudents, error: countError } = await supabase
      .from("user")
      .select("*", { count: "exact", head: true })
      .eq("type", "student")
      .eq("status", "active");

    if (countError) throw countError;

    const { count: exemptedStudents, error: exemptError } = await supabase
      .from("user")
      .select("*", { count: "exact", head: true })
      .eq("type", "student")
      .eq("fee_exempted", true);

    if (exemptError) throw exemptError;

    const { data: allStudents, error: studentsError } = await supabase
      .from("user")
      .select("id, fee_exempted, bus_fee, created_at, admission_date")
      .eq("type", "student")
      .eq("status", "active");

    // 1. Fetch legacy ad-hoc fees
    const { data: feesData } = await supabase
      .from("student_fees")
      .select("student_id, total_paid_amount, created_at, fee(amount, title, due_date)");

    // 2. Fetch class mappings
    const { data: classMappings } = await supabase
      .from("class_students")
      .select("student_id, class_id");
      
    const classIds = classMappings ? [...new Set(classMappings.map(c => c.class_id))] : [];
    let classMap = {}; 
    if (classIds.length > 0) {
      const { data: classesData } = await supabase.from("class").select("id, name").in("id", classIds);
      if (classesData) classesData.forEach(c => classMap[c.id] = c.name);
    }
    
    const studentClassMap = {}; 
    if (classMappings) {
      classMappings.forEach(c => studentClassMap[c.student_id] = classMap[c.class_id] || null);
    }

    // 3. Fetch fee structures for the current academic year
    const { getCurrentAcademicYear } = await import("./virtualFeeCalculator.js");
    const academicYear = academic_year || getCurrentAcademicYear();
    const { data: structures } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("academic_year", academicYear);

    // 4. Calculate months passed dynamically up to current/end date
    const sessionStartYear = parseInt(academicYear.split("-")[0]);
    const today = new Date();
    let calcDate = today;
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) calcDate = parsedEnd;
    }

    const calcYear = calcDate.getFullYear();
    const calcMonth = calcDate.getMonth(); // 0-indexed, 0 = Jan, 3 = April
    
    let monthsPassed = (calcYear - sessionStartYear) * 12 + (calcMonth - 3) + 1;
    if (monthsPassed < 0) monthsPassed = 0;
    if (monthsPassed > 12) monthsPassed = 12;

    let balance = 0;
    
    if (allStudents) {
      // Fetch all ledger payments
      const { data: paymentsData } = await supabase.from("payments_ledger").select("student_id, amount_paid, created_at, remarks");
      const { data: settingsData } = await supabase.from("school_settings").select("late_fee_penalty").limit(1).single();
      const lateFeePenaltyAmount = settingsData?.late_fee_penalty !== undefined && settingsData?.late_fee_penalty !== null ? Number(settingsData.late_fee_penalty) : 10;

      const { calculateTotalVirtualDueForStudent } = await import("./virtualFeeCalculator.js");

      for (const s of allStudents) {
        let totalVirtualDue = 0;
        const sPayments = (paymentsData || []).filter(p => p.student_id === s.id);
        
        if (!s.fee_exempted) {
          const sClassName = studentClassMap[s.id];
          totalVirtualDue = calculateTotalVirtualDueForStudent(s, sClassName, structures, sPayments, sessionStartYear, monthsPassed, lateFeePenaltyAmount, 0, academicYear);
        }

        const sFees = (feesData || []).filter(f => f.student_id === s.id);
        let totalAdHocDue = 0;
        sFees.forEach(f => {
          let amount = Number(f.fee?.amount || 0);
          const feeTitle = f.fee?.title || "";
          let dueDateObj = f.fee?.due_date ? new Date(f.fee.due_date) : null;
          if (!dueDateObj && f.created_at) dueDateObj = new Date(f.created_at);
          
          if (dueDateObj) {
             const acStart = new Date(sessionStartYear, 3, 1);
             const acEnd = new Date(sessionStartYear + 1, 2, 31, 23, 59, 59);
             if (dueDateObj < acStart || dueDateObj > acEnd) return;
             if (endDate && dueDateObj > new Date(endDate)) return;
          }
          
          const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
          const feeTotalPaid = relatedPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
          
          if (dueDateObj && feeTotalPaid < amount) {
            let penaltyEndDate = today;
            if (relatedPayments.length > 0) {
              const sortedPayments = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
              penaltyEndDate = new Date(sortedPayments[0].created_at);
            }
            if (penaltyEndDate > dueDateObj) {
               const daysLate = Math.floor((penaltyEndDate - dueDateObj) / (1000 * 60 * 60 * 24));
               if (daysLate > 0) amount += daysLate * lateFeePenaltyAmount;
            }
          }
          totalAdHocDue += amount;
        });
        
        const totalPaidLedger = sPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
        const totalPaidLegacy = sFees.reduce((acc, f) => acc + Number(f.total_paid_amount || 0), 0);
        
        const totalDue = totalVirtualDue + totalAdHocDue;
        const totalPaid = totalPaidLedger + totalPaidLegacy;
        
        balance += Math.max(0, totalDue - totalPaid);
      }
    }

    // Fetch Total Collected from transactions within date range
    let paymentsQuery = supabase.from("transactions").select("amount").eq("type", "INCOME");
    if (startDate) {
      paymentsQuery = paymentsQuery.gte("transaction_date", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      paymentsQuery = paymentsQuery.lte("transaction_date", `${endDate}T23:59:59.999Z`);
    }
    
    const { data: paymentsData, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    let totalCollected = paymentsData.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    // Add fee income from payments_ledger
    let ledgerQuery = supabase.from("payments_ledger").select("amount_paid");
    const sYear = parseInt(academicYear.split("-")[0]);
    const aStart = new Date(sYear, 3, 1).toISOString();
    const aEnd = new Date(sYear + 1, 2, 31, 23, 59, 59).toISOString();

    if (startDate) {
      ledgerQuery = ledgerQuery.gte("created_at", startDate > aStart ? startDate : aStart);
    } else {
      ledgerQuery = ledgerQuery.gte("created_at", aStart);
    }
    
    if (endDate) {
      const eDay = new Date(endDate);
      eDay.setHours(23, 59, 59, 999);
      const eIso = eDay.toISOString();
      ledgerQuery = ledgerQuery.lte("created_at", eIso < aEnd ? eIso : aEnd);
    } else {
      ledgerQuery = ledgerQuery.lte("created_at", aEnd);
    }
    
    const { data: ledgerData, error: ledgerError } = await ledgerQuery;
    if (!ledgerError && ledgerData) {
      totalCollected += ledgerData.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0);
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalPaid: totalCollected,
        balance: balance,
        totalStudents: totalStudents || 0,
        exemptedStudents: exemptedStudents || 0,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

import { calculateVirtualDues } from "./virtualFeeCalculator.js";
import { autoMaterializeTransportFees } from "./transportFeeMaterializer.js";

export const getStudentBalances = async (req, res) => {
  try {
    // Auto-materialize transport fees before generating balances
    await autoMaterializeTransportFees();

    const { students, startDate, endDate, includeFuture, academic_year } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ success: false, message: "Students array is required" });
    }
    const studentIds = students.map(s => s.id);

    // 1. Fetch legacy ad-hoc fees
    const { data: feesData } = await supabase
      .from("student_fees")
      .select("student_id, total_paid_amount, created_at, fee(amount, title, due_date)");

    // 2. Fetch class mappings to match with fee_structures
    const { data: classMappings } = await supabase
      .from("class_students")
      .select("student_id, class_id");
      
    const classIds = classMappings ? [...new Set(classMappings.map(c => c.class_id))] : [];
    
    let classMap = {}; // map class_id -> class_name
    if (classIds.length > 0) {
      const { data: classesData } = await supabase.from("class").select("id, name").in("id", classIds);
      if (classesData) {
        classesData.forEach(c => classMap[c.id] = c.name);
      }
    }
    
    const studentClassMap = {}; // map student_id -> class_name
    if (classMappings) {
      classMappings.forEach(c => {
        studentClassMap[c.student_id] = classMap[c.class_id] || null;
      });
    }

    // 3. Fetch fee structures for the current academic year
    const { getCurrentAcademicYear } = await import("./virtualFeeCalculator.js");
    const academicYear = academic_year || getCurrentAcademicYear();
    const { data: structures } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("academic_year", academicYear);

    // 4. Fetch all payments from payments_ledger filtered by dates and academic_year
    let paymentsQuery = supabase
      .from("payments_ledger")
      .select("student_id, amount_paid, created_at, remarks");
      
    // Filter payments strictly by the selected academic year to ensure isolation
    const startYear = parseInt(academicYear.split("-")[0]);
    const academicStart = new Date(startYear, 3, 1).toISOString(); // April 1st
    const academicEnd = new Date(startYear + 1, 2, 31, 23, 59, 59).toISOString(); // March 31st

    if (startDate) {
        paymentsQuery = paymentsQuery.gte("created_at", startDate > academicStart ? startDate : academicStart);
    } else {
        paymentsQuery = paymentsQuery.gte("created_at", academicStart);
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      const endIso = endOfDay.toISOString();
      paymentsQuery = paymentsQuery.lte("created_at", endIso < academicEnd ? endIso : academicEnd);
    } else {
        paymentsQuery = paymentsQuery.lte("created_at", academicEnd);
    }
    
    const { data: paymentsData } = await paymentsQuery;

    const { data: settingsData } = await supabase.from("school_settings").select("late_fee_penalty").limit(1).single();
    const lateFeePenaltyAmount = settingsData?.late_fee_penalty !== undefined && settingsData?.late_fee_penalty !== null ? Number(settingsData.late_fee_penalty) : 10;

    // 5. Calculate months passed in academic session based on endDate if available
    const sessionStartYear = parseInt(academicYear.split("-")[0]);
    const referenceDate = endDate ? new Date(endDate) : new Date();
    const currentMonth = referenceDate.getMonth();
    const currentYear = referenceDate.getFullYear();
    
    let monthsPassed = (currentYear - sessionStartYear) * 12 + (currentMonth - 3) + 1;
    if (monthsPassed < 0) monthsPassed = 0;
    if (monthsPassed > 12) monthsPassed = 12;
    
    // If startDate is set and is later than April, we should theoretically subtract the start months,
    // but typically schools want to see outstanding balances. However, to respect the "Period Dues"
    // we'll calculate dues purely generated between start and end.
    let startMonthsPassed = 0;
    if (startDate) {
        const sDate = new Date(startDate);
        const sMonth = sDate.getMonth();
        const sYear = sDate.getFullYear();
        if (sYear === sessionStartYear && sMonth >= 3) startMonthsPassed = sMonth - 3;
        else if (sYear === sessionStartYear + 1 && sMonth < 3) startMonthsPassed = 9 + sMonth;
        else if (sYear > sessionStartYear) startMonthsPassed = 12;
    }
    if (startMonthsPassed < 0) startMonthsPassed = 0;
    if (monthsPassed > 12) monthsPassed = 12;
    if (monthsPassed < 0) monthsPassed = 0;

    // 6. Aggregate balances
    const balances = await Promise.all(students.map(async (s) => {
      let totalVirtualDue = 0;
      
      const sPayments = (paymentsData || []).filter(p => p.student_id === s.id);
      
      if (!s.fee_exempted) {
        const sClassName = studentClassMap[s.id];
        const { calculateTotalVirtualDueForStudent } = await import("./virtualFeeCalculator.js");
        totalVirtualDue = calculateTotalVirtualDueForStudent(s, sClassName, structures, sPayments, sessionStartYear, monthsPassed, lateFeePenaltyAmount, startMonthsPassed, academicYear);
      }

      // Legacy specific student ad-hoc fees
      const sFees = (feesData || []).filter(f => f.student_id === s.id);
      let totalAdHocDue = 0;
      const academicStartObj = new Date(sessionStartYear, 3, 1);
      const academicEndObj = new Date(sessionStartYear + 1, 2, 31, 23, 59, 59);

      sFees.forEach(f => {
        let amount = Number(f.fee?.amount || 0);
        const feeTitle = f.fee?.title || "";
        let dueDateObj = f.fee?.due_date ? new Date(f.fee.due_date) : null;
        if (!dueDateObj && f.created_at) dueDateObj = new Date(f.created_at);
        
        if (dueDateObj) {
            if (dueDateObj < academicStartObj || dueDateObj > academicEndObj) return; // filter by academic year bounds
            if (startDate) {
              const parsedStart = new Date(startDate);
              if (!isNaN(parsedStart.getTime()) && dueDateObj < parsedStart) return;
            }
            if (endDate && !includeFuture) {
              const parsedEnd = new Date(endDate);
              if (!isNaN(parsedEnd.getTime()) && dueDateObj > parsedEnd) return;
            }
        }
        
        const relatedPayments = sPayments.filter(p => p.remarks && p.remarks.includes(feeTitle));
        const feeTotalPaid = relatedPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
        
        if (dueDateObj && feeTotalPaid < amount) {
          let penaltyEndDate = referenceDate;
          if (relatedPayments.length > 0) {
            const sortedPayments = [...relatedPayments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            penaltyEndDate = new Date(sortedPayments[0].created_at);
          }
          if (penaltyEndDate > dueDateObj) {
             const daysLate = Math.floor((penaltyEndDate - dueDateObj) / (1000 * 60 * 60 * 24));
             if (daysLate > 0) amount += daysLate * lateFeePenaltyAmount;
          }
        }
        totalAdHocDue += amount;
      });
      
      // Calculate total paid
      const totalPaidLedger = sPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
      const totalPaidLegacy = sFees.reduce((acc, f) => acc + Number(f.total_paid_amount || 0), 0);
      
      const totalPaid = totalPaidLedger + totalPaidLegacy;
      const totalDue = totalVirtualDue + totalAdHocDue;
      const balance = totalDue - totalPaid;

      return {
        student_id: s.id,
        totalDue,
        totalPaid,
        balance
      };
    }));

    return res.status(200).json({ success: true, data: balances });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFeeStructureController = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("fee_structures")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    return res.status(200).json({ success: true, message: "Fee structure deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentLedger = async (req, res) => {
  try {
    await autoMaterializeTransportFees();
    const { studentId } = req.params;
    const { includeFuture, academic_year } = req.query;

    const { getCurrentAcademicYear } = await import("./virtualFeeCalculator.js");
    const academicYear = academic_year || getCurrentAcademicYear();

    // 1. Calculate Virtual Dues & fetch Payments
    const { virtualDues, payments } = await calculateVirtualDues(studentId, academicYear, includeFuture === 'true');

    // 2. Map payments to dues using fee title in remarks
    // (This is now handled automatically inside calculateVirtualDues)

    // 3. Fetch student bus details
    const { data: studentDetails } = await supabase
      .from("user")
      .select("bus_fee, bus_start_date")
      .eq("id", studentId)
      .single();

    return res.status(200).json({
      success: true,
      data: {
        fees: virtualDues,
        payments: payments || [],
        studentDetails: studentDetails || {}
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logPayment = async (req, res) => {
  try {
    const { studentId, paymentMode, remarks, payments } = req.body.data;
    const collectedBy = req.user.id;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
        return res.status(400).json({ success: false, message: "No payments provided" });
    }

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const { data: maxReceipt } = await supabaseAdmin
      .from("receipts")
      .select("receipt_number")
      .order("receipt_number", { ascending: false })
      .limit(1);
      
    const nextReceiptNumber = (maxReceipt && maxReceipt.length > 0) ? (maxReceipt[0].receipt_number + 1) : 1;

    const { data: receiptRecord, error: receiptError } = await supabaseAdmin
      .from("receipts")
      .insert([{
        receipt_number: nextReceiptNumber,
        student_id: studentId,
        total_amount: totalAmount,
        payment_mode: paymentMode,
        remarks: remarks || null,
        collected_by: collectedBy
      }])
      .select()
      .single();

    if (receiptError) throw receiptError;

    const inserts = payments.map(p => ({
        student_id: studentId,
        receipt_id: receiptRecord.id,
        fee_id: null,
        amount_paid: p.amount,
        payment_mode: paymentMode,
        remarks: `Fee Payment: ${p.title || p.feeId} ${remarks ? `(${remarks})` : ''}`,
        collected_by: collectedBy
    }));

    const { data: insertedPayments, error: insertError } = await supabaseAdmin
      .from("payments_ledger")
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    return res.status(200).json({
      success: true,
      message: "Payment logged successfully",
      receipt: receiptRecord,
      payments: insertedPayments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount_paid, payment_mode, remarks } = req.body;

    if (!amount_paid || !payment_mode) {
      return res.status(400).json({ success: false, message: "Amount and mode are required" });
    }

    const { data: updatedPayment, error } = await supabaseAdmin
      .from("payments_ledger")
      .update({ amount_paid, payment_mode, remarks })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (updatedPayment && updatedPayment.receipt_id) {
      const { data: allRemaining } = await supabaseAdmin
        .from("payments_ledger")
        .select("amount_paid")
        .eq("receipt_id", updatedPayment.receipt_id);
        
      const newTotal = (allRemaining || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      await supabaseAdmin.from("receipts").update({ total_amount: newTotal }).eq("id", updatedPayment.receipt_id);
    }

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      payment: updatedPayment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch payment to get receipt_id and amount
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from("payments_ledger")
      .select("receipt_id, amount_paid")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete the payment
    const { error: deleteError } = await supabaseAdmin
      .from("payments_ledger")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // 3. Handle receipt update or deletion
    if (payment && payment.receipt_id) {
      const { data: remainingPayments } = await supabaseAdmin
        .from("payments_ledger")
        .select("id")
        .eq("receipt_id", payment.receipt_id)
        .limit(1);

      if (!remainingPayments || remainingPayments.length === 0) {
        // No more payments for this receipt, delete the receipt
        await supabaseAdmin.from("receipts").delete().eq("id", payment.receipt_id);
      } else {
        // Other payments exist, just subtract the amount from the receipt total
        // We'll calculate the actual new total
        const { data: allRemaining } = await supabaseAdmin
          .from("payments_ledger")
          .select("amount_paid")
          .eq("receipt_id", payment.receipt_id);
          
        const newTotal = (allRemaining || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        await supabaseAdmin.from("receipts").update({ total_amount: newTotal }).eq("id", payment.receipt_id);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAccountantStats = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: payments, error } = await supabase
      .from("payments_ledger")
      .select("*, fee(*), student:user!student_id(id, name, admission_number), receipts(*)")
      .eq("collected_by", id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    let totalCollected = 0;
    if (payments) {
      payments.forEach(p => {
        totalCollected += Number(p.amount_paid || 0);
      });
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalTransactions: payments?.length || 0,
        totalCollected,
        payments: payments || [],
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from("payments_ledger")
      .select("*, fee(*), student:user!student_id(id, name, admission_number), collected_by(*), receipts(*)")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      payments: payments || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getFeeStructures = async (req, res) => {
  try {
    const { academic_year } = req.query;
    
    let query = supabase
      .from("fee_structures")
      .select("*")
      .order("created_at", { ascending: true });

    if (academic_year) {
      query = query.eq("academic_year", academic_year);
    } else {
      query = query.eq("academic_year", "2024-2025");
    }

    const { data: structures, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      structures: structures || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!id || amount === undefined) {
      return res.status(400).json({ success: false, message: "ID and Amount are required" });
    }

    const { data: updatedStructure, error } = await supabase
      .from("fee_structures")
      .update({ amount })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Fee structure updated successfully",
      structure: updatedStructure
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createFeeStructureController = async (req, res) => {
  try {
    const { fee_category, class_name, amount, academic_year } = req.body;
    if (!fee_category || !amount || !academic_year) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    
    // Check for existing to prevent duplicate custom fees
    const { data: existing } = await supabase
      .from("fee_structures")
      .select("id")
      .eq("fee_category", fee_category)
      .eq("academic_year", academic_year)
      .eq("class_name", class_name || null)
      .single();

    if (existing) {
      return res.status(400).json({ success: false, message: "This fee category already exists for this class in the selected academic year." });
    }

    const { data, error } = await supabase
      .from("fee_structures")
      .insert([{
        fee_category,
        class_name: class_name || null,
        amount,
        academic_year
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// NEW FULL FINANCE MODULE API (INCOME/EXPENSE)
// ==========================================

export const deleteStudentFee = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any payments are tied to this student_fee
    const { data: payments, error: checkError } = await supabaseAdmin
      .from("payments_ledger")
      .select("id")
      .eq("fee_id", id);
      
    if (checkError) throw checkError;

    if (payments && payments.length > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete this fee because payments have already been made against it." });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("student_fees")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true, message: "Fee deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { type } = req.query; // optional filter by INCOME or EXPENSE
    let query = supabase.from("transaction_categories").select("*").order("name");
    if (type) query = query.eq("type", type);
    
    const { data: categories, error } = await query;
    if (error) throw error;
    
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, type, description } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: "Name and type required" });
    
    const { data: category, error } = await supabase.from("transaction_categories").insert([{ name, type, description }]).select().single();
    if (error) throw error;
    return res.status(201).json({ success: true, category, message: "Category created" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category is in use
    const { data: txs, error: txError } = await supabase.from("transactions").select("id").eq("category_id", id).limit(1);
    if (txError) throw txError;
    
    if (txs && txs.length > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete category because it is being used by existing transactions." });
    }
    
    const { error } = await supabase.from("transaction_categories").delete().eq("id", id);
    if (error) throw error;
    
    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logTransaction = async (req, res) => {
  try {
    const { type, category_id, amount, transaction_date, description, payment_method, reference_number } = req.body;
    const logged_by = req.user.id;
    
    if (!type || !amount || !transaction_date) {
      return res.status(400).json({ success: false, message: "Type, amount, and date are required" });
    }
    
    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert([{ type, category_id, amount, transaction_date, description, payment_method, reference_number, logged_by }])
      .select().single();
      
    if (error) throw error;
    return res.status(200).json({ success: true, transaction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, amount, transaction_date, description, payment_method, reference_number } = req.body;
    
    if (!amount || !transaction_date) {
      return res.status(400).json({ success: false, message: "Amount and date are required" });
    }
    
    const { data: transaction, error } = await supabase
      .from("transactions")
      .update({ category_id, amount, transaction_date, description, payment_method, reference_number })
      .eq("id", id)
      .select().single();
      
    if (error) throw error;
    return res.status(200).json({ success: true, transaction, message: "Transaction updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, category_id } = req.query;
    let query = supabase.from("transactions").select("*, category:transaction_categories(*)").order("transaction_date", { ascending: false });
    
    if (startDate) query = query.gte("transaction_date", startDate);
    if (endDate) query = query.lte("transaction_date", endDate);
    if (type) query = query.eq("type", type);
    if (category_id) query = query.eq("category_id", category_id);
    
    const { data: transactions, error } = await query;
    if (error) throw error;
    
    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFinanceDashboard = async (req, res) => {
  try {
    const { data: users, error: userError } = await supabase.from("user").select("can_view_revenue, type").eq("id", req.user.id).limit(1);
    if (userError) throw userError;
    
    const user = users && users.length > 0 ? users[0] : null;

    // Check permission - Only super_admin or users with specific permission can view the revenue dashboard
    if (!user || (!user.can_view_revenue && user.type !== 'super_admin' && user.type !== 'admin')) {
      return res.status(403).json({ success: false, message: "You do not have permission to view revenue data." });
    }
    
    const { startDate, endDate, academic_year } = req.query;
    
    const { getCurrentAcademicYear } = await import("./virtualFeeCalculator.js");
    const academicYear = academic_year || getCurrentAcademicYear();
    
    let expenseQuery = supabase.from("transactions").select("amount, category:transaction_categories(*)").eq("type", "EXPENSE");
    if (startDate) expenseQuery = expenseQuery.gte("transaction_date", startDate);
    if (endDate) expenseQuery = expenseQuery.lte("transaction_date", endDate);
    
    const { data: expenses, error: expenseError } = await expenseQuery;
    if (expenseError) throw expenseError;
    
    let incomeQuery = supabase.from("transactions").select("amount, category:transaction_categories(*)").eq("type", "INCOME");
    if (startDate) incomeQuery = incomeQuery.gte("transaction_date", startDate);
    if (endDate) incomeQuery = incomeQuery.lte("transaction_date", endDate);
    
    const { data: incomes, error: incomeError } = await incomeQuery;
    if (incomeError) throw incomeError;
    
    // Fetch fee income from payments_ledger
    const sessionStartYearObj = parseInt(academicYear.split("-")[0]);
    const academicStart = new Date(sessionStartYearObj, 3, 1).toISOString();
    const academicEnd = new Date(sessionStartYearObj + 1, 2, 31, 23, 59, 59).toISOString();

    let paymentsQuery = supabase.from("payments_ledger").select("student_id, amount_paid, created_at, remarks");
    
    if (startDate) {
      paymentsQuery = paymentsQuery.gte("created_at", startDate > academicStart ? startDate : academicStart);
    } else {
      paymentsQuery = paymentsQuery.gte("created_at", academicStart);
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      const endIso = endOfDay.toISOString();
      paymentsQuery = paymentsQuery.lte("created_at", endIso < academicEnd ? endIso : academicEnd);
    } else {
      paymentsQuery = paymentsQuery.lte("created_at", academicEnd);
    }

    const { data: fees, error: feeError } = await paymentsQuery;
    if (feeError) throw feeError;
    
    const totalFeeIncome = fees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
    const totalOtherIncome = incomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const totalIncome = totalFeeIncome + totalOtherIncome;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netRevenue = totalIncome - totalExpenses;
    
    return res.status(200).json({
      success: true,
      dashboard: {
        totalFeeIncome,
        totalOtherIncome,
        totalIncome,
        totalExpenses,
        netRevenue,
        expenses,
        incomes
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleRevenueAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { can_view_revenue } = req.body;
    
    const { data: updatedUser, error } = await supabase
      .from("user")
      .update({ can_view_revenue })
      .eq("id", userId)
      .select("id, name, can_view_revenue")
      .single();
      
    if (error) throw error;
    
    return res.status(200).json({ success: true, message: "Access updated", user: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStudentBusFee = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { bus_fee, bus_start_date } = req.body;

    const { data: updatedUser, error } = await supabase
      .from("user")
      .update({ 
        bus_fee: bus_fee || 0,
        bus_start_date: bus_start_date || null
      })
      .eq("id", studentId)
      .eq("type", "student")
      .select("id, name, bus_fee, bus_start_date")
      .single();

    if (error) throw error;

    // Cleanup future unpaid transport fees if bus service is stopped
    if (Number(bus_fee) === 0) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: allTransportFees } = await supabaseAdmin
        .from("student_fees")
        .select("id, total_paid_amount, fee!inner(id, title, due_date)")
        .eq("student_id", studentId)
        .like("fee.title", "Transport Fee - %");

      const idsToDelete = [];
      
      if (allTransportFees) {
        allTransportFees.forEach(f => {
          if ((!f.total_paid_amount || f.total_paid_amount === 0) && f.fee?.due_date) {
            const feeDueMonth = f.fee.due_date.substring(0, 7);
            // Delete fees due in the current month or future months
            if (feeDueMonth >= currentMonthStr) {
               idsToDelete.push(f.id);
            }
          }
        });
      }

      if (idsToDelete.length > 0) {
         await supabaseAdmin.from("student_fees").delete().in("id", idsToDelete);
      }
    }

    return res.status(200).json({ success: true, message: "Bus fee updated successfully", user: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const closeFinancialYear = async (req, res) => {
  try {
    const { currentAcademicYear, newAcademicYear } = req.body;
    if (!currentAcademicYear || !newAcademicYear) {
      return res.status(400).json({ success: false, message: "Missing current or new academic year" });
    }

    // Calculate balances for all active students for the current year
    const { data: students, error: studentError } = await supabase
      .from("user")
      .select("id, fee_exempted, classes:class_students(class_id), bus_fee")
      .eq("type", "student")
      .eq("status", "active");

    if (studentError) throw studentError;

    const { calculateVirtualDues } = await import("./virtualFeeCalculator.js");

    const arrearsFees = [];
    for (const student of students) {
      if (student.fee_exempted) continue;
      const { virtualDues, payments } = await calculateVirtualDues(student.id, currentAcademicYear, true);
      
      const totalDue = virtualDues.reduce((sum, fee) => sum + (Number(fee.fee.amount) || 0), 0);
      const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
      const balance = totalDue - totalPaid;

      if (balance > 0) {
        arrearsFees.push({
          student_id: student.id,
          fee: {
            title: `Arrears from ${currentAcademicYear}`,
            amount: balance,
            due_date: new Date(parseInt(newAcademicYear.split("-")[0]), 3, 10).toISOString().split('T')[0], // April 10th of new year
            fee_type: "Arrears"
          }
        });
      }
    }

    // Insert arrears into fee and student_fees tables
    for (const arrear of arrearsFees) {
      const { data: feeData, error: feeError } = await supabase
        .from("fee")
        .insert(arrear.fee)
        .select()
        .single();
      
      if (feeError) throw feeError;

      const { error: studentFeeError } = await supabase
        .from("student_fees")
        .insert({
          student_id: arrear.student_id,
          fee_id: feeData.id,
          status: "pending",
          total_paid_amount: 0
        });
      
      if (studentFeeError) throw studentFeeError;
    }

    return res.status(200).json({
      success: true,
      message: `Successfully closed ${currentAcademicYear} and carried forward arrears for ${arrearsFees.length} students.`,
      carriedForwardCount: arrearsFees.length
    });
  } catch (error) {
    console.error("Close Financial Year Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

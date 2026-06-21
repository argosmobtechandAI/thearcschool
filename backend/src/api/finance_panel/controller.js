import { supabase } from "../../config/supabaseClient.js";

export const getDashboardStats = async (req, res) => {
  try {
    await autoMaterializeTransportFees();
    const { startDate, endDate } = req.query;

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
      .select("id, fee_exempted, bus_fee, created_at")
      .eq("type", "student")
      .eq("status", "active");

    // 1. Fetch legacy ad-hoc fees
    const { data: feesData } = await supabase
      .from("student_fees")
      .select("student_id, total_paid_amount, fee(amount, title, due_date)");

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
    const academicYear = getCurrentAcademicYear();
    const { data: structures } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("academic_year", academicYear);

    // 4. Calculate months passed
    const sessionStartYear = parseInt(academicYear.split("-")[0]);
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let monthsPassed = 0;
    if (currentYear === sessionStartYear && currentMonth >= 3) {
      monthsPassed = currentMonth - 3 + 1; 
    } else if (currentYear === sessionStartYear + 1 && currentMonth < 3) {
      monthsPassed = 9 + currentMonth + 1; 
    } else if (currentYear > sessionStartYear) {
      monthsPassed = 12; 
    }
    if (monthsPassed > 12) monthsPassed = 12;
    if (monthsPassed < 0) monthsPassed = 0;

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
          totalVirtualDue = calculateTotalVirtualDueForStudent(s, sClassName, structures, sPayments, sessionStartYear, monthsPassed, lateFeePenaltyAmount);
        }

        const sFees = (feesData || []).filter(f => f.student_id === s.id);
        let totalAdHocDue = 0;
        sFees.forEach(f => {
          let amount = Number(f.fee?.amount || 0);
          const feeTitle = f.fee?.title || "";
          const dueDateObj = f.fee?.due_date ? new Date(f.fee.due_date) : null;
          
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
    if (startDate) {
      ledgerQuery = ledgerQuery.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      ledgerQuery = ledgerQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
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

    const { students, startDate, endDate } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ success: false, message: "Students array is required" });
    }
    const studentIds = students.map(s => s.id);

    // 1. Fetch legacy ad-hoc fees
    const { data: feesData } = await supabase
      .from("student_fees")
      .select("student_id, total_paid_amount, fee(amount, title, due_date)");

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
    const academicYear = getCurrentAcademicYear();
    const { data: structures } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("academic_year", academicYear);

    // 4. Fetch all payments from payments_ledger filtered by dates
    let paymentsQuery = supabase
      .from("payments_ledger")
      .select("student_id, amount_paid, created_at, remarks");
      
    if (startDate) paymentsQuery = paymentsQuery.gte("created_at", startDate);
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      paymentsQuery = paymentsQuery.lte("created_at", endOfDay.toISOString());
    }
    
    const { data: paymentsData } = await paymentsQuery;

    const { data: settingsData } = await supabase.from("school_settings").select("late_fee_penalty").limit(1).single();
    const lateFeePenaltyAmount = settingsData?.late_fee_penalty !== undefined && settingsData?.late_fee_penalty !== null ? Number(settingsData.late_fee_penalty) : 10;

    // 5. Calculate months passed in academic session based on endDate if available
    const sessionStartYear = parseInt(academicYear.split("-")[0]);
    const referenceDate = endDate ? new Date(endDate) : new Date();
    const currentMonth = referenceDate.getMonth();
    const currentYear = referenceDate.getFullYear();
    
    let monthsPassed = 0;
    if (currentYear === sessionStartYear && currentMonth >= 3) {
      monthsPassed = currentMonth - 3 + 1; // Apr = 1
    } else if (currentYear === sessionStartYear + 1 && currentMonth < 3) {
      monthsPassed = 9 + currentMonth + 1; // Apr-Dec(9) + Jan-Mar
    } else if (currentYear > sessionStartYear) {
      monthsPassed = 12; // Whole year passed
    }
    
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
        totalVirtualDue = calculateTotalVirtualDueForStudent(s, sClassName, structures, sPayments, sessionStartYear, monthsPassed, lateFeePenaltyAmount, startMonthsPassed);
      }

      // Legacy specific student ad-hoc fees
      const sFees = (feesData || []).filter(f => f.student_id === s.id);
      let totalAdHocDue = 0;
      sFees.forEach(f => {
        let amount = Number(f.fee?.amount || 0);
        const feeTitle = f.fee?.title || "";
        const dueDateObj = f.fee?.due_date ? new Date(f.fee.due_date) : null;
        
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

    // 1. Calculate Virtual Dues & fetch Payments
    const { virtualDues, payments } = await calculateVirtualDues(studentId);

    // 2. Map payments to dues using fee title in remarks
    // (This is now handled automatically inside calculateVirtualDues)

    return res.status(200).json({
      success: true,
      data: {
        fees: virtualDues,
        payments: payments || [],
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

    const inserts = payments.map(p => ({
        student_id: studentId,
        fee_id: null,
        amount_paid: p.amount,
        payment_mode: paymentMode,
        remarks: `Fee Payment: ${p.title || p.feeId} ${remarks ? `(${remarks})` : ''}`,
        collected_by: collectedBy
    }));

    const { data: insertedPayments, error: insertError } = await supabase
      .from("payments_ledger")
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    return res.status(200).json({
      success: true,
      message: "Payment logged successfully",
      payments: insertedPayments,
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
      .select("*, fee(*), student:user!student_id(id, name, admission_number)")
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
      .select("*, fee(*), student:user!student_id(id, name, admission_number), collected_by(*)")
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
    
    const { startDate, endDate } = req.query;
    
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
    
    // Fetch fee income from payments_ledger (using created_at timestamps)
    let feeQuery = supabase.from("payments_ledger").select("amount_paid");
    if (startDate) feeQuery = feeQuery.gte("created_at", `${startDate}T00:00:00.000Z`);
    if (endDate) feeQuery = feeQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
    
    const { data: fees, error: feeError } = await feeQuery;
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

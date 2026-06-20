import { supabase } from "../../config/supabaseClient.js";

export const getDashboardStats = async (req, res) => {
  try {
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

    // Fetch fees for Pending Dues (due <= endDate)
    const { data: feesData, error: feesError } = await supabase
      .from("student_fees")
      .select("total_paid_amount, fee(*), user!student_id(fee_exempted)");
      
    if (feesError) throw feesError;

    let totalDue = 0;
    let totalPaidInFees = 0;

    if (feesData) {
      feesData.forEach(f => {
        if (f.user && !f.user.fee_exempted) {
          let isPending = true;
          if (endDate && f.fee?.dueDate) {
             const dDate = new Date(f.fee.dueDate);
             if (dDate > new Date(endDate)) isPending = false; // Only exclude future fees
          }
          if (isPending) {
            totalDue += Number(f.fee?.amount || 0);
            totalPaidInFees += Number(f.total_paid_amount || 0);
          }
        }
      });
    }

    const balance = Math.max(0, totalDue - totalPaidInFees);

    // Fetch Total Collected from payments_ledger within date range
    let paymentsQuery = supabase.from("payments_ledger").select("amount_paid");
    if (startDate) {
      paymentsQuery = paymentsQuery.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      paymentsQuery = paymentsQuery.lte("created_at", `${endDate}T23:59:59.999Z`);
    }
    
    const { data: paymentsData, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    const totalCollected = paymentsData.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        exemptedStudents,
        totalDue,
        totalPaid: totalCollected, // MTD Collected
        balance
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getStudentLedger = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Fetch the student's fee obligations
    const { data: fees, error: feesError } = await supabase
      .from("student_fees")
      .select("*, fee(*)")
      .eq("student_id", studentId);

    if (feesError) throw feesError;

    // Fetch the payments ledger
    const { data: payments, error: paymentsError } = await supabase
      .from("payments_ledger")
      .select("*, fee(*), collected_by(*)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (paymentsError) throw paymentsError;

    return res.status(200).json({
      success: true,
      data: {
        fees: fees || [],
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
    const { studentId, feeId, amount, paymentMode, remarks } = req.body.data;
    const collectedBy = req.user.id; // From authMiddleware

    // 1. Insert into payments_ledger
    const { data: insertedPayment, error: insertError } = await supabase
      .from("payments_ledger")
      .insert([
        {
          student_id: studentId,
          fee_id: feeId,
          amount_paid: amount,
          payment_mode: paymentMode,
          collected_by: collectedBy,
          remarks: remarks || "",
        },
      ])
      .select();

    if (insertError) throw insertError;

    // 2. Update student_fees total_paid_amount
    // Fetch current student_fee record
    const { data: studentFeeData, error: fetchError } = await supabase
      .from("student_fees")
      .select("*")
      .eq("student_id", studentId)
      .eq("fee_id", feeId)
      .single();

    if (fetchError) throw fetchError;

    const newTotalPaid = Number(studentFeeData.total_paid_amount || 0) + Number(amount);
    
    // Check if fully paid
    const { data: feeDefinition, error: feeDefError } = await supabase
      .from("fee")
      .select("amount")
      .eq("id", feeId)
      .single();

    if (feeDefError) throw feeDefError;

    const totalRequired = Number(feeDefinition.amount);
    let newStatus = "Partial";
    if (newTotalPaid >= totalRequired) {
      newStatus = "Paid";
    }

    const { error: updateError } = await supabase
      .from("student_fees")
      .update({
        total_paid_amount: newTotalPaid,
        payment_status: newStatus,
      })
      .eq("student_id", studentId)
      .eq("fee_id", feeId);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: "Payment logged successfully",
      payment: insertedPayment[0],
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

import { FeeGenerator } from "./feeGenerator.js";

export const generateMonthlyFeesController = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and Year are required" });
    }
    const result = await FeeGenerator.generateMonthlyFees(month, year);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const generateYearlyAMCController = async (req, res) => {
  try {
    const { academicYear } = req.body;
    if (!academicYear) {
      return res.status(400).json({ success: false, message: "Academic Year is required" });
    }
    const result = await FeeGenerator.generateYearlyAMC(academicYear);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
    let query = supabase.from("transactions").select("*, category:transaction_categories(*), logged_by:user(id, name)").order("transaction_date", { ascending: false });
    
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
    const { data: user, error: userError } = await supabase.from("user").select("can_view_revenue, type").eq("id", req.user.id).single();
    if (userError) throw userError;
    
    // Check permission - Only super_admin or users with specific permission can view the revenue dashboard
    if (!user.can_view_revenue && user.type !== 'super_admin' && user.type !== 'admin') {
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

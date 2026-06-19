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

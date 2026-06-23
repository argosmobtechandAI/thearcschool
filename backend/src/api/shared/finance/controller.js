import { supabase } from "../../../config/supabaseClient.js";
import { FinanceService } from "./service.js";


import { calculateVirtualDues, getCurrentAcademicYear } from "../../finance_panel/virtualFeeCalculator.js";

export const getStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;
    const academic_year = req.query.academic_year || getCurrentAcademicYear();

    const { virtualDues, payments, structures } = await calculateVirtualDues(userId, academic_year);

    return res.status(200).json({
      success: true,
      fees: virtualDues,
      payments: payments || [],
      feeStructure: structures || [],
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


export const submitFees = async (req, res) => {
  try {
    const { data } = req.body;
    const { feeId, studentId } = req.params;
    await FinanceService.submitFees(studentId, feeId, data);
    return res.status(200).json({ success: true, message: "Fee submitted successfully" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

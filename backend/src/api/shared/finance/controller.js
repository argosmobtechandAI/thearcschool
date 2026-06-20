import { supabase } from "../../../config/supabaseClient.js";
import { FinanceService } from "./service.js";


export const getStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: records, error } = await supabase
      .from("student_fees")
      .select("*, fee(*)")
      .eq("student_id", userId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      fees: records || [],
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

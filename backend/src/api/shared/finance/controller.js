import { supabase } from "../../../config/supabaseClient.js";
import { FinanceService } from "./service.js";

export const getFees = async (req, res) => {
  try {
    const { data: fees, error } = await supabase.from("fee").select("*");

    if (error) throw error;

    if (fees) {
      return res.status(200).json({
        success: true,
        fees,
        message: "Get successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Could not get",
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occured: ${e.message}`,
    });
  }
};

export const updateFees = async (req, res) => {
  try {
    const { data } = req.body;
    const { feeId } = req.params;

    const { id, createdAt, ...fees } = data;
    
    const { data: updated, error } = await supabase
      .from("fee")
      .update(fees)
      .eq("id", feeId)
      .select();

    if (error || !updated || !updated.length) {
      return res.status(400).json({
        success: false,
        message: error ? error.message : "Could not update fee",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee updated successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const deleteFees = async (req, res) => {
  try {
    const { feeId } = req.params;

    console.log(feeId);

    const { data: deleted, error: deleteError } = await supabase
      .from("fee")
      .delete()
      .eq("id", feeId)
      .select();

    if (deleteError || !deleted || !deleted.length) {
      return res.status(400).json({
        success: false,
        message: deleteError ? deleteError.message : "Could not delete fee",
      });
    }

    // ON DELETE CASCADE automatically removes references in student_fees

    return res.status(200).json({
      success: true,
      message: "Fee deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

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

export const addFee = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.totalAmount || !data?.lastDate || !data?.title || !Array.isArray(data?.studentId) || data.studentId.length === 0) {
      return res.status(400).json({ success: false, message: "Incomplete fee data" });
    }
    await FinanceService.addFee(data);
    return res.status(200).json({ success: true, message: "Fee created and assigned successfully" });
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

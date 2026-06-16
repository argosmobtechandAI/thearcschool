import { supabase } from "../config/supabaseClient.js";

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

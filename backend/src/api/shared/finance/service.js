import { supabase } from "../../../config/supabaseClient.js";

export class FinanceService {

  static async submitFees(studentId, feeId, data) {
      const d = new Date();
      const localDateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      
      const { data: updatedFee, error } = await supabase
      .from("student_fees")
      .update({ status: data.status, amount_paid: data.paidAmount || data.amount_paid, payment_date: localDateStr })
      .match({ student_id: studentId, fee_id: feeId });
    if (error) throw new Error("Could not submit fee: " + error.message);
    return true;
  }

}

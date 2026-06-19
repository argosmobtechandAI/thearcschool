import { supabase } from "../../../config/supabaseClient.js";

export class FinanceService {
  static async addFee(data) {
    const { studentId, ...rawFeeData } = data;
    // Map frontend field names to V2 DB column names
    const feeData = {
      title: rawFeeData.title,
      amount: rawFeeData.totalAmount || rawFeeData.amount,
      dueDate: rawFeeData.lastDate || rawFeeData.dueDate,
      type: rawFeeData.type || null
    };
    const { data: newFeeArr, error: insertError } = await supabase.from("fee").insert([feeData]).select();
    if (insertError || !newFeeArr || !newFeeArr.length) throw new Error("Fee creation failed: " + (insertError?.message || ''));
    const newFee = newFeeArr[0];

    if (studentId && studentId.length > 0) {
      const studentFeeInserts = studentId.map(id => ({
        student_id: id,
        fee_id: newFee.id,
        status: 'pending'
      }));
      await supabase.from("student_fees").insert(studentFeeInserts);
      
      const notificationInserts = studentId.map(id => ({
        user_id: id,
        title: "Fee Pending",
        message: `Your fee "${newFee.title}" of ₹${newFee.amount} is pending.`,
        type: "fee",
        is_read: false
      }));
      await supabase.from("notifications").insert(notificationInserts);
    }

    const { data: principals } = await supabase.from("user").select("*").eq("type", "principal");
    if (principals && principals.length > 0) {
      const activityInserts = principals.map(prince => ({
        user_id: prince.id,
        title: "Fee Created",
        message: `New Fee "${newFee.title}" of ₹${newFee.amount} is created.`,
        type: "fee",
        is_read: false
      }));
      await supabase.from("activities").insert(activityInserts);
    }
    return true;
  }

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

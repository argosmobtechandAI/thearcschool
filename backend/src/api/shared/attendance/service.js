import { supabase } from "../../../config/supabaseClient.js";

export class AttendanceService {
  static async updateAttendance(id, data) {
    if (!data.status || data.status === "delete" || data.status === "unmarked") {
      const { error } = await supabase.from("attendance").delete().match({ student_id: id, date: data.date });
      if (error) throw new Error("Could not delete attendance: " + error.message);
      return true;
    }

    const { error } = await supabase.from("attendance").upsert(
      {
        student_id: id,
        date: data.date,
        status: data.status,
        remarks: data.remarks || null
      },
      { onConflict: 'student_id,date' }
    );
    if (error) throw new Error("Could not update attendance: " + error.message);
    return true;
  }

  static async bulkUpdateAttendance(records) {
    // records: [{ student_id: uuid, date: string, status: string }]
    const { error } = await supabase.from("attendance").upsert(
      records,
      { onConflict: 'student_id,date' }
    );
    if (error) throw new Error("Could not bulk update attendance: " + error.message);
    return true;
  }

  static async getAttendance(startDate, endDate, classId) {
    let query = supabase.from("attendance").select("*");
    
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    
    const { data, error } = await query;
    if (error) throw new Error("Could not fetch attendance: " + error.message);
    
    return data;
  }

}

import { supabase } from "../../../config/supabaseClient.js";

export class AttendanceService {
  static async updateAttendance(id, data, markedBy) {
    if (!data.status || data.status === "delete" || data.status === "unmarked") {
      const { error } = await supabase.from("attendance").delete().match({ user_id: id, date: data.date });
      if (error) throw new Error("Could not delete attendance: " + error.message);
      return true;
    }

    // Find existing record to upsert by primary key
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .match({ user_id: id, date: data.date })
      .maybeSingle();

    const formattedStatus = data.status ? String(data.status).charAt(0).toUpperCase() + String(data.status).slice(1).toLowerCase() : null;

    const record = {
      user_id: id,
      date: data.date,
      status: formattedStatus,
      marked_by: markedBy
    };
    
    if (existing) record.id = existing.id;

    const { error } = await supabase.from("attendance").upsert(record);
    if (error) throw new Error("Could not update attendance: " + error.message);
    return true;
  }

  static async bulkUpdateAttendance(records, markedBy) {
    if (!records || records.length === 0) return true;

    const userIds = records.map(r => r.student_id);
    const dates = [...new Set(records.map(r => r.date))];

    // Fetch existing records for these users and dates
    const { data: existingRecords } = await supabase
      .from("attendance")
      .select("id, user_id, date")
      .in("user_id", userIds)
      .in("date", dates);

    const dbRecords = records.map(r => {
      const existing = existingRecords?.find(e => e.user_id === r.student_id && e.date === r.date);
      const formattedStatus = r.status ? String(r.status).charAt(0).toUpperCase() + String(r.status).slice(1).toLowerCase() : null;
      const record = {
        user_id: r.student_id,
        date: r.date,
        status: formattedStatus,
        marked_by: markedBy
      };
      if (existing) record.id = existing.id;
      return record;
    });

    const { error } = await supabase.from("attendance").upsert(dbRecords);
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

    if (classId) {
      const { data: classStudents, error: csError } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", classId);
        
      if (csError) throw new Error("Could not fetch class students: " + csError.message);
      
      if (classStudents && classStudents.length > 0) {
        const studentIds = classStudents.map(c => c.student_id);
        query = query.in("user_id", studentIds);
      } else {
        // If the class has no students, return empty attendance
        return [];
      }
    }
    
    const { data, error } = await query;
    if (error) throw new Error("Could not fetch attendance: " + error.message);
    
    return data ? data.map(r => ({ ...r, student_id: r.user_id, status: r.status?.toLowerCase() })) : [];
  }

}

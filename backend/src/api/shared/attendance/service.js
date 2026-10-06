import { supabase } from "../../../config/supabaseClient.js";

export class AttendanceService {
  static async updateAttendance(id, data, markedBy) {
    if (!data.status || data.status === "delete" || data.status === "unmarked") {
      const { error } = await supabase.from("attendance").delete().match({ user_id: id, date: data.date });
      if (error) throw new Error("Could not delete attendance: " + error.message);
      return true;
    }

    // Find existing record to upsert by primary key or user_id + date
    const { data: existing } = await supabase
      .from("attendance")
      .select("id, status")
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

    const { error } = await supabase
      .from("attendance")
      .upsert(record, { onConflict: 'user_id, date' });
    if (error) throw new Error("Could not update attendance: " + error.message);

    try {
      const { FCMService } = await import("../../../services/fcmService.js");
      const statusLower = formattedStatus?.toLowerCase();
      const prevStatusLower = existing?.status?.toLowerCase();

      // Only notify if:
      // 1. Status is Absent or Late (do not spam students marked Present)
      // 2. OR status changed from Absent to Present
      const statusChanged = statusLower !== prevStatusLower;
      const shouldNotify = statusChanged && (
        (statusLower === 'absent' || statusLower === 'late') ||
        (prevStatusLower === 'absent' && statusLower === 'present')
      );

      if (shouldNotify) {
        const todayStr = new Date().toISOString().split('T')[0];
        const isBackdated = data.date < todayStr;
        const title = isBackdated ? "Backdated Attendance Update" : "Attendance Update";
        const message = isBackdated 
          ? `Your attendance for past date (${data.date}) has been marked as ${formattedStatus}.`
          : `Your attendance for ${data.date} is marked as ${formattedStatus}.`;

        await FCMService.sendToUsers([id], title, message, { type: "attendance", date: data.date, status: formattedStatus });
        await supabase.from("notifications").insert([{ user_id: id, title, message, type: "attendance", is_read: false }]);
      }
    } catch (notifErr) {
      console.error("Attendance Notification Error:", notifErr);
    }

    return true;
  }

  static async bulkUpdateAttendance(records, markedBy) {
    if (!records || records.length === 0) return true;

    const userIds = records.map(r => r.student_id);
    const dates = [...new Set(records.map(r => r.date))];

    // Fetch existing records for these users and dates
    const { data: existingRecords } = await supabase
      .from("attendance")
      .select("id, user_id, date, status")
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
      if (existing) {
        record.id = existing.id;
        record.prevStatus = existing.status;
      }
      return record;
    });

    const { error } = await supabase
      .from("attendance")
      .upsert(dbRecords.map(({ prevStatus, ...r }) => r), { onConflict: 'user_id, date' });
    if (error) throw new Error("Could not bulk update attendance: " + error.message);

    try {
      const { FCMService } = await import("../../../services/fcmService.js");
      const notifsToInsert = [];
      const todayStr = new Date().toISOString().split('T')[0];
      
      for (const rec of dbRecords) {
         if (!rec.status) continue;

         const statusLower = rec.status.toLowerCase();
         const prevStatusLower = rec.prevStatus ? rec.prevStatus.toLowerCase() : null;

         // Do NOT notify for default "Present" attendance — only notify if Absent, Late, or updated from Absent to Present
         const statusChanged = statusLower !== prevStatusLower;
         const shouldNotify = statusChanged && (
           (statusLower === 'absent' || statusLower === 'late') ||
           (prevStatusLower === 'absent' && statusLower === 'present')
         );

         if (!shouldNotify) continue;

         const isBackdated = rec.date < todayStr;
         const title = isBackdated ? "Backdated Attendance Update" : "Attendance Update";
         const message = isBackdated
           ? `Your attendance for past date (${rec.date}) has been marked as ${rec.status}.`
           : `Your attendance for ${rec.date} is marked as ${rec.status}.`;

         // Sending push per user
         await FCMService.sendToUsers([rec.user_id], title, message, { type: "attendance", date: rec.date, status: rec.status }).catch(e => console.error(e));
         notifsToInsert.push({ user_id: rec.user_id, title, message, type: "attendance", is_read: false });
      }
      
      if (notifsToInsert.length > 0) {
         await supabase.from("notifications").insert(notifsToInsert);
      }
    } catch (notifErr) {
      console.error("Bulk Attendance Notification Error:", notifErr);
    }

    return true;
  }

  static async getAttendance(startDate, endDate, classId, studentId) {
    let query = supabase.from("attendance").select("*");
    
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    
    if (studentId) {
      query = query.eq("user_id", studentId);
    }

    if (classId && !studentId) {
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

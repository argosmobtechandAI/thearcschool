import { supabase } from "../../../config/supabaseClient.js";

export const createTimeTable = async (req, res) => {
  const { data } = req.body;

  if (!data?.classId || !data?.date || !data?.timeTables?.length) {
    return res.status(400).json({
      success: false,
      message: "Class, Date and TimeTable are required",
    });
  }

  try {
    // 1️⃣ Removed the deletion step so adding new periods appends instead of overwriting

    // Calculate day_of_week from date to satisfy legacy DB constraint
    const dayOfWeek = new Date(data.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // 2️⃣ Insert new entries
    const timeTableInserts = data.timeTables.map(timeT => ({
      class_id: data.classId,
      date: data.date,
      day_of_week: dayOfWeek,
      teacher_id: timeT.teacher || null,
      time_slot: timeT.time,
      subject: timeT.subject || null,
      is_break: timeT.isBreak || false,
      room_number: timeT.roomNumber || null
    }));

    const { error: insertError } = await supabase
      .from("timetable")
      .insert(timeTableInserts);

    if (insertError) throw insertError;

    try {
      const { FCMService } = await import("../../../services/fcmService.js");
      
      // Notify Students
      const { data: classStudents } = await supabase.from('class_students').select('student_id').eq('class_id', data.classId);
      if (classStudents && classStudents.length > 0) {
        const studentIds = classStudents.map(cs => cs.student_id);
        const title = "New Timetable Published";
        const message = `A new timetable for ${data.date} has been published.`;
        
        await FCMService.sendToUsers(studentIds, title, message, { type: "timetable" });
        await supabase.from("notifications").insert(studentIds.map(sid => ({ user_id: sid, title, message, type: "timetable", is_read: false })));
      }

      // Notify Teachers
      const teacherIds = [...new Set(data.timeTables.map(t => t.teacher).filter(Boolean))];
      if (teacherIds.length > 0) {
         const title = "New Classes Assigned";
         const message = `You have been assigned new classes on ${data.date}.`;
         await FCMService.sendToUsers(teacherIds, title, message, { type: "timetable" });
         await supabase.from("notifications").insert(teacherIds.map(tid => ({ user_id: tid, title, message, type: "timetable", is_read: false })));
      }
    } catch (notifErr) {
      console.error("Timetable Notification Error:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "TimeTable created successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const duplicateDay = async (req, res) => {
  const { classId, sourceDate, targetStartDate, targetEndDate, copyMode } = req.body;

  if (!classId || !sourceDate || !targetStartDate || !targetEndDate || !copyMode) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const { data: sourcePeriods, error: sourceError } = await supabase
      .from("timetable")
      .select("*")
      .eq("class_id", classId)
      .eq("date", sourceDate);

    if (sourceError) throw sourceError;
    if (!sourcePeriods || sourcePeriods.length === 0) {
      return res.status(404).json({ success: false, message: "No periods found on source date" });
    }

    const start = new Date(targetStartDate);
    const end = new Date(targetEndDate);
    const targetDates = [];
    
    let count = 0;
    while (start <= end && count < 90) {
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      targetDates.push(`${yyyy}-${mm}-${dd}`);
      start.setDate(start.getDate() + 1);
      count++;
    }

    const { error: deleteError } = await supabase
      .from("timetable")
      .delete()
      .eq("class_id", classId)
      .in("date", targetDates);

    if (deleteError) throw deleteError;

    const inserts = [];
    targetDates.forEach(tDate => {
      const dayOfWeek = new Date(tDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      sourcePeriods.forEach(sp => {
        inserts.push({
          class_id: classId,
          date: tDate,
          day_of_week: dayOfWeek,
          teacher_id: copyMode === 'structure' ? null : sp.teacher_id,
          time_slot: sp.time_slot,
          subject: copyMode === 'structure' ? (sp.is_break ? "Break/Lunch" : "Unassigned") : sp.subject,
          is_break: sp.is_break,
          room_number: sp.room_number
        });
      });
    });

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("timetable")
        .insert(inserts);
      if (insertError) throw insertError;
    }

    return res.status(200).json({ success: true, message: "Schedule duplicated successfully" });

  } catch (error) {
    return res.status(500).json({ success: false, message: `Error Occurred: ${error.message}` });
  }
};

export const getTimeTable = async (req, res) => {
  try {
    // Fetch all normalized timetable rows
    const { data: timetables, error } = await supabase
      .from("timetable")
      .select("*, class(name, section)");

    if (error) throw error;

    if (timetables) {
      // Group by classId and then by date
      const groupedData = {};

      timetables.forEach(row => {
        const cId = row.class_id;
        if (!groupedData[cId]) {
          groupedData[cId] = {
            id: row.id,
            classId: cId,
            className: row.class?.name || 'Unknown Class',
            section: row.class?.section || '',
            dates: {} // Maps date string (YYYY-MM-DD) to array of periods
          };
        }
        
        const dateStr = row.date; // e.g. "2026-06-20"
        if (!dateStr) return; // ignore legacy data without dates
        
        if (!groupedData[cId].dates[dateStr]) {
            groupedData[cId].dates[dateStr] = [];
        }

        groupedData[cId].dates[dateStr].push({
            id: row.id,
            teacher: row.teacher_id,
            time: row.time_slot,
            subject: row.subject,
            isBreak: row.is_break,
            roomNumber: row.room_number
        });
      });

      const formattedTimetables = Object.values(groupedData);

      return res.status(200).json({
        success: true,
        message: "TimeTable get successfully",
        timeTables: formattedTimetables,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "No timetables found",
        timeTables: [],
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occured: ${e.message}`,
    });
  }
};

export const updatePeriod = async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ success: false, message: "Data is required" });
  }

  try {
    const payload = {
      time_slot: data.time,
      subject: data.subject || null,
      teacher_id: data.teacher || null,
      is_break: data.isBreak || false,
      room_number: data.roomNumber || null
    };

    if (data.date) {
      payload.date = data.date;
      payload.day_of_week = new Date(data.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    }

    const { data: updated, error } = await supabase
      .from("timetable")
      .update(payload)
      .eq("id", id)
      .select();

    if (error || !updated || updated.length === 0) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : "Period not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Period updated successfully",
      period: updated[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const addPeriod = async (req, res) => {
  const { data } = req.body;

  if (!data?.classId || !data?.date || !data?.time) {
    return res.status(400).json({ success: false, message: "Class, Date and Time are required" });
  }

  try {
    const dayOfWeek = new Date(data.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const payload = {
      class_id: data.classId,
      date: data.date,
      day_of_week: dayOfWeek,
      time_slot: data.time,
      subject: data.subject || null,
      teacher_id: data.teacher || null,
      is_break: data.isBreak || false,
      room_number: data.roomNumber || null
    };

    const { data: inserted, error } = await supabase
      .from("timetable")
      .insert(payload)
      .select();

    if (error) throw error;

    try {
      const { FCMService } = await import("../../../services/fcmService.js");
      
      // Notify Students
      const { data: classStudents } = await supabase.from('class_students').select('student_id').eq('class_id', data.classId);
      if (classStudents && classStudents.length > 0) {
        const studentIds = classStudents.map(cs => cs.student_id);
        const title = "Timetable Updated";
        const message = `A new period (${data.subject || 'Break'}) was added on ${data.date}.`;
        
        await FCMService.sendToUsers(studentIds, title, message, { type: "timetable" });
        await supabase.from("notifications").insert(studentIds.map(sid => ({ user_id: sid, title, message, type: "timetable", is_read: false })));
      }

      // Notify Teacher
      if (data.teacher) {
         const title = "New Class Assigned";
         const message = `You have been assigned a class (${data.subject}) on ${data.date}.`;
         await FCMService.sendToUsers([data.teacher], title, message, { type: "timetable" });
         await supabase.from("notifications").insert([{ user_id: data.teacher, title, message, type: "timetable", is_read: false }]);
      }
    } catch (notifErr) {
      console.error("Period Notification Error:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "Period added successfully",
      period: inserted[0],
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: `Error occurred: ${e.message}` });
  }
};

export const deletePeriod = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("timetable")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Period deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};
export const getStudentTimetable = async (req, res) => {
  try {
    const userId = req.user.id;

    // First get the student's class_id
    const { data: studentClass, error: classError } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", userId)
      .single();

    if (classError || !studentClass) {
      return res.status(200).json({ success: true, count: 0, timeTables: [] });
    }

    // Fetch timetable for that specific class
    const { data: timetables, error } = await supabase
      .from("timetable")
      .select("*, class(name), user(name)")
      .eq("class_id", studentClass.class_id);

    if (error) throw error;

    if (!timetables || timetables.length === 0) {
      return res.status(200).json({ success: true, count: 0, timeTables: [] });
    }

    // Grouping logic based on legacy format
    const groupedData = {};
    timetables.forEach(row => {
      const cId = row.class_id;
      if (!groupedData[cId]) {
        groupedData[cId] = { id: row.id, classId: cId, dates: {} };
      }
      
      const dateStr = row.date;
      if (!dateStr) return;
      
      if (!groupedData[cId].dates[dateStr]) groupedData[cId].dates[dateStr] = [];

      groupedData[cId].dates[dateStr].push({
          id: row.id,
          teacher: row.teacher_id,
          teacherName: row.user?.name || null,
          time: row.time_slot,
          subject: row.subject,
          isBreak: row.is_break,
          roomNumber: row.room_number
      });
    });

    return res.status(200).json({
      success: true,
      message: "TimeTable fetched successfully",
      timeTables: Object.values(groupedData),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Fetches the timetable strictly for the logged-in teacher
export const getTeacherTimetable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { classId } = req.query;

    let query = supabase
      .from("timetable")
      .select("*, class(name, section), user(name)");
      
    if (classId) {
      // If a specific class is selected, show the full timetable for that class
      query = query.eq("class_id", classId);
    } else {
      // Otherwise, show the teacher's personal timetable across all classes
      query = query.eq("teacher_id", userId);
    }

    const { data: timetables, error } = await query;

    if (error) throw error;

    if (!timetables || timetables.length === 0) {
      return res.status(200).json({ success: true, count: 0, timeTables: [] });
    }

    // Grouping logic based on legacy format
    const groupedData = {};
    timetables.forEach(row => {
      const cId = row.class_id;
      if (!groupedData[cId]) {
        groupedData[cId] = { 
          id: row.id, 
          classId: cId, 
          className: row.class?.name || 'Unknown Class',
          section: row.class?.section || '',
          dates: {} 
        };
      }
      
      const dateStr = row.date;
      if (!dateStr) return;
      
      if (!groupedData[cId].dates[dateStr]) groupedData[cId].dates[dateStr] = [];

      groupedData[cId].dates[dateStr].push({
          id: row.id,
          teacher: row.teacher_id,
          teacherName: row.user?.name || null,
          time: row.time_slot,
          subject: row.subject,
          isBreak: row.is_break,
          roomNumber: row.room_number
      });
    });

    return res.status(200).json({
      success: true,
      message: "Teacher TimeTable fetched successfully",
      timeTables: Object.values(groupedData),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

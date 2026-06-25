import { supabaseAdmin } from "../../../config/supabaseClient.js";

// Helper to get Monday and Sunday of a given date
const getWeekRange = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
};

export const getCurrentStudentOfWeek = async (req, res) => {
  try {
    const { classId } = req.query;
    console.log("---- GET SOTW CALLED ---- classId:", classId);
    if (!classId) {
      return res.status(400).json({ success: false, message: "classId is required to fetch student of the week" });
    }

    const { start: currentStart, end: currentEnd } = getWeekRange(new Date());
    
    // Check if record exists for current week for this class
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from("student_of_the_week")
      .select(`
        id,
        reason,
        metrics,
        week_start_date,
        week_end_date,
        student:student_id (id, name)
      `)
      .eq("class_id", classId)
      .gte("week_end_date", currentStart.toISOString())
      .lte("week_start_date", currentEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError) {
      if (checkError.code === 'PGRST205') {
        return res.status(200).json({ success: true, table_missing: true, data: null });
      }
      console.error("Error fetching student of the week:", checkError);
      return res.status(500).json({ success: false, message: "Failed to fetch student of the week" });
    }

    if (existingRecord) {
      return res.status(200).json({ success: true, data: existingRecord });
    }

    // --- AUTOMATED SELECTION LOGIC (PER CLASS) ---
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const { start: prevStart, end: prevEnd } = getWeekRange(lastWeekDate);

    // 1. Get all students in this class
    const { data: classStudents, error: csError } = await supabaseAdmin
      .from("class_students")
      .select("student_id")
      .eq("class_id", classId);

    if (csError || !classStudents || classStudents.length === 0) {
      return res.status(404).json({ success: false, message: "No students found in this class to evaluate." });
    }

    const studentIds = classStudents.map(cs => cs.student_id);

    // 2. Fetch attendance for the previous week
    const { data: attendanceData, error: attError } = await supabaseAdmin
      .from("attendance")
      .select("user_id, status")
      .in("user_id", studentIds)
      .gte("date", prevStart.toISOString())
      .lte("date", prevEnd.toISOString());

    if (attError) {
      console.error("Error fetching attendance for SOTW:", attError);
      return res.status(500).json({ success: false, message: "Failed to evaluate students." });
    }

    // 3. Fetch grades for the previous week
    const { data: gradesData, error: gradesError } = await supabaseAdmin
      .from("grades")
      .select("student_id, marks, max_marks")
      .in("student_id", studentIds)
      .gte("created_at", prevStart.toISOString())
      .lte("created_at", prevEnd.toISOString());

    if (gradesError) {
      console.error("Grades fetch error:", gradesError);
    }

    // 4. Calculate scores
    let topStudentId = null;
    let highestScore = -1;
    let studentMetrics = {};

    studentIds.forEach(sid => { 
      studentMetrics[sid] = { attendance: 0, grades: 0, total: 0 }; 
    });

    if (attendanceData) {
      attendanceData.forEach(att => {
        if (att.status === 'Present' && studentMetrics[att.user_id]) {
          studentMetrics[att.user_id].attendance += 10;
        }
      });
    }

    if (gradesData) {
      gradesData.forEach(g => {
        if (g.max_marks > 0 && studentMetrics[g.student_id]) {
          const percentage = (g.marks / g.max_marks) * 100;
          studentMetrics[g.student_id].grades += (percentage / 10);
        }
      });
    }

    // Tally up total scores and pick the highest
    let eligibleStudents = [...studentIds];
    eligibleStudents.sort(() => Math.random() - 0.5); // Randomize for ties

    eligibleStudents.forEach(sid => {
      const total = studentMetrics[sid].attendance + studentMetrics[sid].grades;
      studentMetrics[sid].total = total;

      if (total > highestScore) {
        highestScore = total;
        topStudentId = sid;
      }
    });

    if (!topStudentId) {
      topStudentId = studentIds[Math.floor(Math.random() * studentIds.length)];
    }

    const reason = `Outstanding overall performance and attendance for the week of ${prevStart.toLocaleDateString()}.`;
    const finalMetrics = studentMetrics[topStudentId] || { attendance: 0, grades: 0, total: 0 };

    // Insert new record
    const { data: newRecord, error: insertError } = await supabaseAdmin
      .from("student_of_the_week")
      .insert({
        student_id: topStudentId,
        class_id: classId,
        week_start_date: currentStart.toISOString().split('T')[0],
        week_end_date: currentEnd.toISOString().split('T')[0],
        reason: reason,
        metrics: finalMetrics
      })
      .select(`
        id,
        reason,
        metrics,
        week_start_date,
        week_end_date,
        student:student_id (id, name)
      `)
      .single();

    if (insertError) {
      console.error("Error creating student of the week:", insertError);
      return res.status(500).json({ success: false, message: "Failed to create student of the week" });
    }

    return res.status(200).json({ success: true, data: newRecord });

  } catch (error) {
    console.error("Error in getCurrentStudentOfWeek:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

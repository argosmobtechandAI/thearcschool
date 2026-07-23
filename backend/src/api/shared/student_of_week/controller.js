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
    
    // Check if records exist for current week for this class
    const { data: existingRecords, error: checkError } = await supabaseAdmin
      .from("student_of_the_week")
      .select(`
        id,
        reason,
        metrics,
        week_start_date,
        week_end_date,
        student:student_id (id, name, avatar_url)
      `)
      .eq("class_id", classId)
      .gte("week_end_date", currentStart.toISOString())
      .lte("week_start_date", currentEnd.toISOString())
      .order("created_at", { ascending: false });

    if (checkError) {
      if (checkError.code === 'PGRST205') {
        return res.status(200).json({ success: true, table_missing: true, data: [] });
      }
      console.error("Error fetching student of the week:", checkError);
      return res.status(500).json({ success: false, message: "Failed to fetch student of the week" });
    }

    if (existingRecords && existingRecords.length > 0) {
      // Ensure records are properly sorted by total score before sending to frontend
      existingRecords.sort((a, b) => (b.metrics?.total || 0) - (a.metrics?.total || 0));
      return res.status(200).json({ success: true, data: existingRecords });
    }

    // --- AUTOMATED SELECTION LOGIC (PER CLASS) ---
    // For testing/immediate feedback, we evaluate the CURRENT week instead of the previous week
    const evalDate = new Date();
    // evalDate.setDate(evalDate.getDate() - 7); // Uncomment to evaluate previous week
    const { start: prevStart, end: prevEnd } = getWeekRange(evalDate);

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
      .gte("date", prevStart.toISOString().split('T')[0])
      .lte("date", prevEnd.toISOString().split('T')[0]);

    if (attError) {
      console.error("Error fetching attendance for SOTW:", attError);
      return res.status(500).json({ success: false, message: "Failed to evaluate students." });
    }

    // 3. Fetch grades for the previous week
    const { data: gradesData, error: gradesError } = await supabaseAdmin
      .from("grades")
      .select("student_id, marks, max_marks, exams(marks)")
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
        if (att.status?.toLowerCase() === 'present' && studentMetrics[att.user_id]) {
          studentMetrics[att.user_id].attendance += 10;
        }
      });
    }

    if (gradesData) {
      gradesData.forEach(g => {
        const maxMarks = g.max_marks || (g.exams && g.exams.marks) || 0;
        if (maxMarks > 0 && studentMetrics[g.student_id]) {
          const percentage = (g.marks / maxMarks) * 100;
          studentMetrics[g.student_id].grades += (percentage / 10);
        }
      });
    }

    // Tally up total scores and pick top 3
    const studentScores = studentIds.map(sid => {
      const total = studentMetrics[sid].attendance + studentMetrics[sid].grades;
      studentMetrics[sid].total = total;
      return {
        student_id: sid,
        total: total,
        metrics: studentMetrics[sid]
      };
    });

    // Sort students by total score descending, randomizing for ties
    studentScores.sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return Math.random() - 0.5;
    });

    // Select top 3 students (or all if class has fewer than 3)
    const topWinners = studentScores.slice(0, 3);

    // Insert new records for the winners
    const insertPromises = topWinners.map(async (winner) => {
      const reason = `Outstanding overall performance and attendance for the week of ${prevStart.toLocaleDateString()}.`;
      return supabaseAdmin
        .from("student_of_the_week")
        .insert({
          student_id: winner.student_id,
          class_id: classId,
          week_start_date: currentStart.toISOString().split('T')[0],
          week_end_date: currentEnd.toISOString().split('T')[0],
          reason: reason,
          metrics: winner.metrics
        });
    });

    await Promise.all(insertPromises);

    // Fetch the newly created records with full student details
    const { data: newRecords, error: fetchError } = await supabaseAdmin
      .from("student_of_the_week")
      .select(`
        id,
        reason,
        metrics,
        week_start_date,
        week_end_date,
        student:student_id (id, name, avatar_url)
      `)
      .eq("class_id", classId)
      .gte("week_end_date", currentStart.toISOString().split('T')[0])
      .lte("week_start_date", currentEnd.toISOString().split('T')[0])
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching newly inserted student of the week:", fetchError);
      return res.status(500).json({ success: false, message: "Failed to fetch updated student of the week" });
    }

    // Ensure records are properly sorted by total score
    if (newRecords && newRecords.length > 0) {
      newRecords.sort((a, b) => (b.metrics?.total || 0) - (a.metrics?.total || 0));
    }

    return res.status(200).json({ success: true, data: newRecords });

  } catch (error) {
    console.error("Error in getCurrentStudentOfWeek:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

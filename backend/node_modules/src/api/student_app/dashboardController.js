import { supabase } from "../../config/supabaseClient.js";

export const getDashboardData = async (req, res) => {
  try {
    const studentId = req.user.id; // User is authenticated as student

    // 1. Fetch student details (name, class info)
    const { data: studentData, error: studentError } = await supabase
      .from('user')
      .select('id, name, admission_number, dob')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;

    // Get class info
    const { data: classData, error: classError } = await supabase
      .from('class_students')
      .select('class_id, class(name, section)')
      .eq('student_id', studentId)
      .maybeSingle();

    if (classError) throw classError;

    // 2. Fetch today's schedule (Timetable)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    let timetable = [];
    if (classData && classData.class_id) {
      const { data: ttData, error: ttError } = await supabase
        .from('timetable')
        .select('*')
        .eq('class_id', classData.class_id)
        .eq('day_of_week', today);
      
      if (!ttError && ttData) timetable = ttData;
    }

    // 3. Fetch latest grade
    let latestGrade = null;
    const { data: gradeData, error: gradeError } = await supabase
      .from('grades')
      .select(`
        marks,
        exams!inner(name, marks)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!gradeError && gradeData) {
      latestGrade = {
        examName: gradeData.exams?.name || 'Exam',
        obtained: gradeData.marks,
        total: gradeData.exams?.marks,
        percentage: gradeData.exams?.marks > 0 ? (gradeData.marks / gradeData.exams.marks) * 100 : 0
      };
    }

    // 4. Fetch overall attendance
    let attendanceStats = { present: 0, total: 0, percentage: 0 };
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('status')
      .eq('user_id', studentId);
    
    if (!attError && attData && attData.length > 0) {
      const presentDays = attData.filter(a => a.status?.toLowerCase() === 'present').length;
      attendanceStats = {
        present: presentDays,
        total: attData.length,
        percentage: (presentDays / attData.length) * 100
      };
    }

    // Combine response
    return res.status(200).json({
      success: true,
      data: {
        profile: studentData,
        classInfo: classData?.class ? { id: classData.class_id, ...classData.class } : null,
        todaySchedule: timetable,
        latestGrade,
        attendance: attendanceStats
      }
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

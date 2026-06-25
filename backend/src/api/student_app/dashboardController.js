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
        .ilike('day_of_week', today);
      
      if (!ttError && ttData) timetable = ttData;
    }

    // 3. Fetch all grades for avg calculation
    let latestGrade = null;
    let avgGradePercentage = 0;
    const { data: allGrades, error: gradeError } = await supabase
      .from('grades')
      .select('marks, exams:exam_id(title, marks)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (!gradeError && allGrades && allGrades.length > 0) {
      const latest = allGrades[0];
      latestGrade = {
        examName: latest.exams?.title || 'Exam',
        obtained: latest.marks,
        total: latest.exams?.marks,
        percentage: latest.exams?.marks > 0 ? (latest.marks / latest.exams.marks) * 100 : 0
      };

      const total = allGrades.reduce((sum, g) => {
        const examMarks = g.exams?.marks || 0;
        return sum + (examMarks > 0 ? (g.marks / examMarks) * 100 : 0);
      }, 0);
      avgGradePercentage = Math.round((total / allGrades.length) * 10) / 10;
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

    // 5. Upcoming events (from annual_planner)
    let upcomingEvents = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: eventsData, error: evError } = await supabase
      .from('annual_planner')
      .select('id, title, description, date:start_date, end_date, type:category')
      .gte('start_date', todayStr)
      .order('start_date', { ascending: true })
      .limit(5);

    if (eventsData) upcomingEvents = eventsData;

    // 6. Pending assignments count (from courses table)
    let pendingCount = 0;
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id');
    if (coursesData) pendingCount = coursesData.length;

    // Combine response
    return res.status(200).json({
      success: true,
      data: {
        profile: studentData,
        classInfo: classData?.class ? { id: classData.class_id, ...classData.class } : null,
        todaySchedule: timetable,
        latestGrade,
        avgGradePercentage,
        attendance: attendanceStats,
        upcomingEvents,
        pendingCount,
      }
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

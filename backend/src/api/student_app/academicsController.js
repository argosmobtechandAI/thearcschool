import { supabase } from "../../config/supabaseClient.js";

export const getStudentAcademics = async (req, res) => {
  try {
    const studentId = req.user.id; // User is authenticated as student

    // Fetch all grades for this student, including exam title (term), subject, date, and max marks
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select(`
        id,
        marks,
        exams:exam_id (id, title, subject, date, marks)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (gradesError) throw gradesError;

    // Fetch grading scales dynamically from the database
    const { data: gradingScalesData } = await supabase
      .from("grading_scales")
      .select("*")
      .order("min_percentage", { ascending: false });

    const gradingScales = gradingScalesData?.length > 0 ? gradingScalesData : [
      { grade: 'A+', min_percentage: 90, max_percentage: 100, color_hex: '#16a34a' },
      { grade: 'A', min_percentage: 80, max_percentage: 89.99, color_hex: '#16a34a' },
      { grade: 'B', min_percentage: 70, max_percentage: 79.99, color_hex: '#3b82f6' },
      { grade: 'C', min_percentage: 60, max_percentage: 69.99, color_hex: '#eab308' },
      { grade: 'D', min_percentage: 50, max_percentage: 59.99, color_hex: '#f97316' },
      { grade: 'F', min_percentage: 0, max_percentage: 49.99, color_hex: '#ef4444' },
    ];

    const formattedGrades = (gradesData || []).map(g => {
      let percentage = 0;
      let grade = "N/A";
      let gradeColor = "#ef4444";

      const maxMarks = g.exams?.marks || 100;
      if (maxMarks > 0 && g.marks !== null) {
        percentage = Math.round((g.marks / maxMarks) * 100);
        const matchedScale = gradingScales.find(
          s => percentage >= s.min_percentage && percentage <= s.max_percentage
        ) || gradingScales[gradingScales.length - 1];

        grade = matchedScale.grade;
        gradeColor = matchedScale.color_hex;
      }

      return {
        id: g.id,
        marks: g.marks,
        maxMarks: maxMarks,
        percentage: percentage,
        subject: g.exams?.subject || "Unknown",
        title: g.exams?.title || "Exam", // e.g. "Term 1"
        date: g.exams?.date || null,
        grade,
        gradeColor
      };
    });

    // Fetch date sheets (upcoming exams)
    // First find the class of the student
    const { data: classData } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentId)
      .maybeSingle();

    let dateSheets = [];
    if (classData && classData.class_id) {
      let query = supabase
        .from('exams')
        .select(`
          id,
          title,
          subject,
          date,
          time,
          duration,
          marks,
          room_number,
          user(name),
          class:class_id(name, section)
        `)
        .eq('class_id', classData.class_id);

      // Filter by academic year
      const academic_year = req.query.academic_year;
      if (academic_year) {
        const [startYear, endYear] = academic_year.split('-');
        const startDate = `${startYear}-04-01`;
        const endDate = `${endYear}-03-31`;
        query = query.gte("date", startDate).lte("date", endDate);
      }

      const { data: dsData, error: dsError } = await query.order('date', { ascending: true });
        
      if (!dsError && dsData) {
        dateSheets = dsData.map(ex => ({
          ...ex,
          className: ex.class?.name || null,
          section: ex.class?.section || null,
          invigilator: ex.user?.name || null
        }));
      }
    }

    return res.status(200).json({
      success: true,
      grades: formattedGrades,
      upcomingExams: dateSheets
    });

  } catch (error) {
    console.error("Academics error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

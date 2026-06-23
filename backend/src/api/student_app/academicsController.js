import { supabase } from "../../config/supabaseClient.js";

export const getStudentAcademics = async (req, res) => {
  try {
    const studentId = req.user.id; // User is authenticated as student

    // Fetch all grades for this student
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select(`
        id,
        marks,
        feedback,
        exams:exam_id (id, title, date, marks)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (gradesError) throw gradesError;

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
          marks
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
        // Only return upcoming
        const today = new Date().toISOString().split('T')[0];
        dateSheets = dsData.filter(ds => ds.date >= today);
      }
    }

    return res.status(200).json({
      success: true,
      grades: gradesData || [],
      upcomingExams: dateSheets
    });

  } catch (error) {
    console.error("Academics error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

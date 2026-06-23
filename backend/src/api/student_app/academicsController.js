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
        exams:exam_id (id, name, date, marks)
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
      const { data: dsData, error: dsError } = await supabase
        .from('date_sheets')
        .select(`
          id,
          date,
          start_time,
          end_time,
          subject:subject_id (name)
        `)
        .eq('class_id', classData.class_id)
        .order('date', { ascending: true });
        
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

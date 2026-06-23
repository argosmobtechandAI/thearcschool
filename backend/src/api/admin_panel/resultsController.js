import { supabase } from "../../config/supabaseClient.js";

export const getAggregatedResults = async (req, res) => {
  try {
    // We will fetch grades, joined with exams and class_students
    // This provides a full view of all scores across the school
    const { data: gradesData, error: gradesError } = await supabase
      .from("grades")
      .select(`
        id,
        marks,
        student_id,
        exams (
          id,
          title,
          subject,
          marks,
          date,
          class_id
        )
      `);

    if (gradesError) throw gradesError;

    // Fetch users (students) to get their names and admission info
    const { data: usersData, error: usersError } = await supabase
      .from("user")
      .select("id, name, admission_number")
      .eq("type", "student");

    if (usersError) throw usersError;

    // Fetch classes for class and section info
    const { data: classesData, error: classError } = await supabase
      .from("class")
      .select("id, name, section");
      
    if (classError) throw classError;

    // Fetch grading scales
    const { data: gradingScalesData, error: scaleError } = await supabase
      .from("grading_scales")
      .select("*")
      .order("min_percentage", { ascending: false });

    // Fallback in case table is empty or errored
    const gradingScales = gradingScalesData?.length > 0 ? gradingScalesData : [
      { grade: 'A+', min_percentage: 90, max_percentage: 100, color_hex: '#16a34a' },
      { grade: 'A', min_percentage: 80, max_percentage: 89.99, color_hex: '#16a34a' },
      { grade: 'B', min_percentage: 70, max_percentage: 79.99, color_hex: '#3b82f6' },
      { grade: 'C', min_percentage: 60, max_percentage: 69.99, color_hex: '#eab308' },
      { grade: 'D', min_percentage: 50, max_percentage: 59.99, color_hex: '#f97316' },
      { grade: 'F', min_percentage: 0, max_percentage: 49.99, color_hex: '#ef4444' },
    ];

    // Map data for easier lookup
    const userMap = {};
    usersData.forEach(u => {
      userMap[u.id] = { name: u.name, admission_number: u.admission_number };
    });

    const classMap = {};
    classesData.forEach(c => {
      classMap[c.id] = { className: c.name, section: c.section };
    });

    // Aggregate results:
    // We will group by student_id, then by term (exam.title)
    const results = [];
    const studentTermMap = {};

    gradesData.forEach(grade => {
      if (!grade.exams) return;
      
      const studentId = grade.student_id;
      const term = grade.exams.title;
      const classId = grade.exams.class_id;
      
      const key = `${studentId}_${term}`;
      
      if (!studentTermMap[key]) {
        studentTermMap[key] = {
          student_id: studentId,
          studentName: userMap[studentId]?.name || "Unknown",
          admissionNumber: userMap[studentId]?.admission_number || "Unknown",
          term: term,
          class: classMap[classId]?.className || "Unknown",
          section: classMap[classId]?.section || "",
          subjects: [],
          totalMarksObtained: 0,
          totalMaxMarks: 0
        };
        results.push(studentTermMap[key]);
      }
      
      const entry = studentTermMap[key];
      
      // Add subject marks
      entry.subjects.push({
        subject: grade.exams.subject,
        marksObtained: grade.marks,
        maxMarks: grade.exams.marks,
        date: grade.exams.date
      });
      
      entry.totalMarksObtained += (grade.marks || 0);
      entry.totalMaxMarks += (grade.exams.marks || 0);
    });

    // Calculate percentage and grade for each term record
    results.forEach(res => {
      if (res.totalMaxMarks > 0) {
        res.percentage = (res.totalMarksObtained / res.totalMaxMarks) * 100;
        
        // Find matching scale
        const matchedScale = gradingScales.find(
          s => res.percentage >= s.min_percentage && res.percentage <= s.max_percentage
        ) || gradingScales[gradingScales.length - 1]; // fallback to lowest grade

        res.grade = matchedScale.grade;
        res.gradeColor = matchedScale.color_hex;
      } else {
        res.percentage = 0;
        res.grade = 'N/A';
        res.gradeColor = '#ef4444';
      }
    });

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error("Error in getAggregatedResults:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

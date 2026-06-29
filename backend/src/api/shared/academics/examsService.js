import { supabase } from "../../../config/supabaseClient.js";

export class ExamService {
  static async updateMarks(data) {
    try {
      // Upsert the grade for student + exam
      const upsertData = {
        student_id: data.id,
        exam_id: data.typeId,
        marks: data.marks
      };
      if (data.courseId) upsertData.course_id = data.courseId;
      
      const { error } = await supabase.from("grades").upsert(
        upsertData,
        { onConflict: 'student_id,exam_id,course_id' }
      );
      if (error) throw new Error("Could not update marks: " + error.message);
      return true;
    } catch (e) {
      console.error("Error updating marks:", e);
      throw e;
    }
  }

  
  
  
  
  
  static async getTopper() {
    try {
      const [{ data: students, error }, { data: gradesData }] = await Promise.all([
        supabase.from("user").select("*").eq("type", "student"),
        supabase.from("grades").select("*")
      ]);
      if (error) throw error;
      if (!students || !students.length) return { topper: null, score: 0 };

      let bestStudent = null;
      let highestScore = -Infinity;
      for (let student of students) {
        let totalMarks = 0;
        let totalExams = 0;
        const studentGrades = (gradesData || []).filter(g => g.student_id === student.id);
        if (studentGrades.length > 0) {
          studentGrades.forEach(g => {
            if (g.marks != null) {
              totalMarks += Number(g.marks);
              totalExams++;
            }
          });
        }
        const score = totalExams > 0 ? totalMarks / totalExams : 0;
        
        if (score > highestScore) {
          highestScore = score;
          bestStudent = student;
        }
      }
      return { topper: bestStudent, score: highestScore };
    } catch (e) {
      console.error("Error getting topper:", e);
      return { topper: null, score: 0 };
    }
  }

}

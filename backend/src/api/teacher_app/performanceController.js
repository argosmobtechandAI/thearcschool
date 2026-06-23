import { supabase } from "../../config/supabaseClient.js";

export const getClassPerformance = async (req, res) => {
  try {
    const { id: classId } = req.params;

    if (!classId) {
      return res.status(400).json({ success: false, message: "Class ID is required" });
    }

    // 1. Fetch Student IDs in the class
    const { data: classStudents, error: csError } = await supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId);

    if (csError) throw csError;
    if (!classStudents || classStudents.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const studentIds = classStudents.map(cs => cs.student_id);

    // Fetch full student details from user table
    const { data: studentsData, error: usersError } = await supabase
      .from("user")
      .select("id, name, admission_number, email, father_name, mother_name, phone, address, dob, house, admission_date") 
      .in("id", studentIds);

    if (usersError) throw usersError;

    // 2. Fetch Grades for this class
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select(`
        student_id,
        marks,
        exams!inner(class_id, marks)
      `)
      .eq('exams.class_id', classId);

    if (gradesError) throw gradesError;

    // 3. Fetch Attendance for these students
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('user_id, status')
      .in('user_id', studentIds);

    if (attendanceError) throw attendanceError;

    // 4. Aggregate data
    const studentStats = {};
    if (studentsData) {
      studentsData.forEach(u => {
        studentStats[u.id] = {
          id: u.id,
          name: u.name,
          admission_number: u.admission_number,
          email: u.email,
          father_name: u.father_name,
          mother_name: u.mother_name,
          phone: u.phone,
          address: u.address,
          dob: u.dob,
          house: u.house,
          admission_date: u.admission_date,
          totalObtained: 0,
          totalMax: 0,
          daysPresent: 0,
          daysTotal: 0
        };
      });
    }

    if (gradesData) {
      gradesData.forEach(g => {
        if (studentStats[g.student_id]) {
          studentStats[g.student_id].totalObtained += (g.marks || 0);
          studentStats[g.student_id].totalMax += (g.exams?.marks || 0);
        }
      });
    }

    if (attendanceData) {
      attendanceData.forEach(a => {
        if (studentStats[a.user_id]) {
          studentStats[a.user_id].daysTotal += 1;
          if (a.status?.toLowerCase() === 'present') {
            studentStats[a.user_id].daysPresent += 1;
          }
        }
      });
    }

    // 5. Calculate percentages
    const performanceList = Object.values(studentStats).map(st => {
      const gradePerc = st.totalMax > 0 ? (st.totalObtained / st.totalMax) * 100 : null;
      const attPerc = st.daysTotal > 0 ? (st.daysPresent / st.daysTotal) * 100 : null;
      
      // Calculate an overall score.
      // Weighted: 70% Grades, 30% Attendance
      let overallScore = 0;
      if (gradePerc !== null && attPerc !== null) {
        overallScore = (gradePerc * 0.7) + (attPerc * 0.3);
      } else if (gradePerc !== null) {
        overallScore = gradePerc;
      } else if (attPerc !== null) {
        overallScore = attPerc;
      }

      return {
        ...st,
        gradePercentage: gradePerc,
        attendancePercentage: attPerc,
        overallScore
      };
    });

    // 6. Sort by overallScore descending
    performanceList.sort((a, b) => b.overallScore - a.overallScore);

    return res.status(200).json({
      success: true,
      data: performanceList
    });

  } catch (error) {
    console.error("Error in getClassPerformance:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

import { supabase } from "../../../config/supabaseClient.js";
import { ExamService } from "./examsService.js";

export const createExams = async (req, res) => {
  const { data } = req.body;

  if (
    !data?.date ||
    !data?.time ||
    !data?.title ||
    !data?.class ||
    !data?.section
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  try {
    // 0️⃣ Find Class to get class_id
    const { data: classData, error: classError } = await supabase
      .from("class")
      .select("id")
      .match({
        name: data.class,
        section: data.section,
      });

    if (classError) throw classError;
    if (!classData || classData.length === 0) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }
    const classId = classData[0].id;

    // 1️⃣ Check if Exam Already Exists
    const { data: existingExam, error: existingError } = await supabase
      .from("exams")
      .select("*")
      .match({
        date: data.date,
        time: data.time,
        title: data.title,
        class_id: classId
      });

    if (existingError) throw existingError;

    if (existingExam && existingExam.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Exam Already Present",
      });
    }

    // 2️⃣ Insert Exam
    const { data: exam, error: insertError } = await supabase
      .from("exams")
      .insert([{
          title: data.title,
          class_id: classId,
          date: data.date,
          time: data.time,
          subject: data.subject,
          duration: data.duration ? parseInt(data.duration) : null,
          marks: data.marks ? parseInt(data.marks) : null,
          invigilator_id: data.invigilator_id || null
      }])
      .select();

    if (insertError || !exam || exam.length === 0) {
      return res.status(400).json({
        success: false,
        message: insertError ? insertError.message : "Exam could not be created",
      });
    }

    // 3️⃣ Notify Students
    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", classId);

    if (classStudents && classStudents.length > 0) {
      const studentIds = classStudents.map(cs => cs.student_id);
      
      const notificationInserts = studentIds.map(sid => ({
        user_id: sid,
        title: "New Exam Scheduled",
        message: `Exam "${data.title}" scheduled on ${data.date} at ${data.time}`,
        type: "exam",
        is_read: false
      }));

      await supabase.from("notifications").insert(notificationInserts);
      
      try {
        const { FCMService } = await import("../../../services/fcmService.js");
        await FCMService.sendToUsers(
           studentIds, 
           "New Exam Scheduled", 
           `Exam "${data.title}" scheduled on ${data.date} at ${data.time}`, 
           { type: "exam" }
        );
      } catch (fcmErr) { console.error("FCM Error:", fcmErr); }
    }

    // 4️⃣ Add Activity for Principals
    const { data: principals } = await supabase
      .from("user")
      .select("id")
      .eq("type", "principal");

    if (principals && principals.length > 0) {
        const activityInserts = principals.map(prince => ({
            user_id: prince.id,
            title: "Exam Created",
            message: `Exam "${data.title}" scheduled for Class ${data.class}-${data.section} on ${data.date} at ${data.time}`,
            type: "exam",
            is_read: false
        }));
        await supabase.from("activities").insert(activityInserts);
    }

    return res.status(201).json({
      success: true,
      message: "Exam Created Successfully",
      data: exam[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const getExam = async (req, res) => {
  try {
    const { classId } = req.query;
    let query = supabase.from("exams").select("*, user(name)");
    
    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data: exams, error } = await query;

    if (error) throw error;

    if (!exams || exams.length === 0) {
      return res.status(200).json({ success: true, count: 0, exams: [] });
    }

    let filteredExams = exams;

    if (req.user.type === "teacher") {
      const { data: ctData } = await supabase.from("class_teachers").select("class_id").eq("teacher_id", req.user.id);
      const classTeacherClassIds = ctData ? ctData.map(c => c.class_id) : [];

      const { data: stData } = await supabase.from("subject_teachers").select("class_id, subject(name)").eq("teacher_id", req.user.id);
      
      filteredExams = exams.filter(ex => {
        // If they are the class teacher for this class, they can see all exams for it
        if (classTeacherClassIds.includes(ex.class_id)) return true;
        
        // If they are a subject teacher for this class, they can only see exams for their specific subjects
        const teachesSubject = stData?.some(st => st.class_id === ex.class_id && st.subject?.name === ex.subject);
        return teachesSubject;
      });
    }

    const classIds = [...new Set(filteredExams.map(e => e.class_id).filter(Boolean))];
    const { data: classes } = await supabase.from("class").select("id, name, section").in("id", classIds);

    // Map back to what frontend expects
    const mappedExams = filteredExams.map(ex => {
        const cls = classes?.find(c => c.id === ex.class_id);
        return {
          ...ex,
          class: cls?.name,
          section: cls?.section,
          invigilator: ex.user?.name || null
        };
    });

    return res.status(200).json({
      success: true,
      message: "Exam get Successfully",
      exams: mappedExams,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const updateExam = async (req, res) => {
  const { data } = req.body;
  const { id } = req.params;

  try {
    const updateData = { ...data };
    if (updateData.duration !== undefined) updateData.duration = updateData.duration ? parseInt(updateData.duration) : null;
    if (updateData.marks !== undefined) updateData.marks = updateData.marks ? parseInt(updateData.marks) : null;
    if (updateData.class && updateData.section) {
        const { data: classData } = await supabase.from("class").select("id").match({ name: updateData.class, section: updateData.section });
        if (classData && classData.length > 0) {
            updateData.class_id = classData[0].id;
        }
        delete updateData.class;
        delete updateData.section;
    }

    const { data: updatedExam, error } = await supabase
      .from("exams")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error || !updatedExam || updatedExam.length === 0) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : "Exam not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Exam Updated Successfully",
      exam: updatedExam[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const deleteExam = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("exams")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Exam Deleted Successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const getStudentExams = async (req, res) => {
  try {
    const userId = req.user.id;

    // First get the student's class_id from class_students
    const { data: studentClass, error: classError } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", userId)
      .single();

    if (classError || !studentClass) {
      return res.status(200).json({ success: true, count: 0, exams: [] });
    }

    const { data: exams, error } = await supabase
      .from("exams")
      .select("*, user(name)")
      .eq("class_id", studentClass.class_id);

    if (error) throw error;

    if (!exams || exams.length === 0) {
      return res.status(200).json({ success: true, count: 0, exams: [] });
    }

    const { data: classData } = await supabase
      .from("class")
      .select("name, section")
      .eq("id", studentClass.class_id)
      .single();

    const mappedExams = exams.map((ex) => ({
      ...ex,
      class: classData?.name,
      section: classData?.section,
      invigilator: ex.user?.name || null,
    }));

    return res.status(200).json({
      success: true,
      message: "Exams fetched successfully",
      exams: mappedExams,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getStudentGrades = async (req, res) => {
  try {
    const { studentId, examId } = req.query;
    if (!studentId && !examId) {
      return res.status(400).json({ success: false, message: "studentId or examId is required" });
    }

    let query = supabase.from("grades").select("marks, exam_id, student_id, exams(*)");
    if (studentId) query = query.eq("student_id", studentId);
    if (examId) query = query.eq("exam_id", examId);

    const { data: grades, error: gradesError } = await query;

    if (gradesError) throw gradesError;

    // Fetch grading scales
    const { data: gradingScalesData, error: scaleError } = await supabase
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

    const formattedGrades = grades.map(g => {
      let percentage = 0;
      let grade = "N/A";
      let gradeColor = "#ef4444";

      const maxMarks = g.exams?.marks;
      if (maxMarks > 0 && g.marks !== null) {
        percentage = (g.marks / maxMarks) * 100;
        const matchedScale = gradingScales.find(
          s => percentage >= s.min_percentage && percentage <= s.max_percentage
        ) || gradingScales[gradingScales.length - 1];

        grade = matchedScale.grade;
        gradeColor = matchedScale.color_hex;
      }

      return {
        marks: g.marks,
        exam_id: g.exam_id,
        student_id: g.student_id,
        title: g.exams?.title,
        subject: g.exams?.subject,
        maxMarks: maxMarks,
        date: g.exams?.date,
        grade,
        gradeColor
      };
    });

    return res.status(200).json({
      success: true,
      grades: formattedGrades
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateMarks = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.id || !data?.type || !data?.typeId || data?.marks == null) {
      return res.status(400).json({ success: false, message: "Student ID, Type, TypeId and Marks are required" });
    }
    await ExamService.updateMarks(data);
    return res.status(200).json({ success: true, message: "Marks updated successfully" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};






export const getTopper = async (req, res) => {
  try {
    const { topper, score } = await ExamService.getTopper();
    return res.status(200).json({ success: true, topper, score });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const createDateSheet = async (req, res) => {
  const { data } = req.body;
  if (!data?.title || !data?.class || !data?.subjects || !data?.subjects.length) {
    return res.status(400).json({ success: false, message: "Title, Class, and at least one subject are required" });
  }

  try {
    const { data: classData, error: classError } = await supabase
      .from("class")
      .select("id")
      .eq("name", data.class);

    if (classError || !classData || classData.length === 0) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }
    
    const classIds = classData.map(c => c.id);

    const inserts = [];
    classIds.forEach(classId => {
      data.subjects.forEach(sub => {
        const sectionConfig = data.sectionsData ? data.sectionsData[classId] : null;
        inserts.push({
          title: data.title,
          class_id: classId,
          subject: sub.subject,
          date: sub.date,
          time: sub.time,
          duration: sub.duration ? parseInt(sub.duration) : null,
          marks: sub.marks ? parseInt(sub.marks) : null,
          invigilator_id: sectionConfig?.invigilator_id || sub.invigilator_id || null,
          room_number: sectionConfig?.room_number || sub.room_number || null
        });
      });
    });

    const { data: createdExams, error: insertError } = await supabase
      .from("exams")
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    const { data: classStudents } = await supabase.from("class_students").select("student_id").in("class_id", classIds);
    if (classStudents && classStudents.length > 0) {
      const studentIds = classStudents.map(cs => cs.student_id);
      const notificationInserts = studentIds.map(sid => ({
        user_id: sid,
        title: "New Date Sheet Published",
        message: `Date sheet for "${data.title}" has been published.`,
        type: "exam",
        is_read: false
      }));
      await supabase.from("notifications").insert(notificationInserts);
      
      try {
        const { FCMService } = await import("../../../services/fcmService.js");
        await FCMService.sendToUsers(
           studentIds, 
           "New Date Sheet Published", 
           `Date sheet for "${data.title}" has been published.`, 
           { type: "exam" }
        );
      } catch (fcmErr) { console.error("FCM Error:", fcmErr); }
    }

    return res.status(201).json({ success: true, message: "Date Sheet Created Successfully", data: createdExams });
  } catch (e) {
    return res.status(500).json({ success: false, message: `Error Occurred: ${e.message}` });
  }
};

export const getDateSheetGrades = async (req, res) => {
  const { title, class_id } = req.params;
  
  try {
    let classIds = [];
    if (class_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
       classIds = [class_id];
    } else {
       const { data: classes } = await supabase.from("class").select("id").eq("name", class_id);
       if (classes) classIds = classes.map(c => c.id);
    }

    if (classIds.length === 0) {
      return res.status(404).json({ success: false, message: "Class not found." });
    }

    const { data: exams, error: examsError } = await supabase
      .from("exams")
      .select("id, subject, marks, class_id")
      .match({ title: decodeURIComponent(title) })
      .in("class_id", classIds);

    if (examsError) throw examsError;
    if (!exams || exams.length === 0) {
      return res.status(404).json({ success: false, message: "No exams found for this date sheet." });
    }

    let filteredExams = exams;

    if (req.user.type === "teacher") {
      const { data: ctData } = await supabase.from("class_teachers").select("class_id").eq("teacher_id", req.user.id);
      const classTeacherClassIds = ctData ? ctData.map(c => c.class_id) : [];

      const { data: stData } = await supabase.from("subject_teachers").select("class_id, subject(name)").eq("teacher_id", req.user.id);
      
      filteredExams = exams.filter(ex => {
        if (classTeacherClassIds.includes(ex.class_id)) return true;
        const teachesSubject = stData?.some(st => st.class_id === ex.class_id && st.subject?.name === ex.subject);
        return teachesSubject;
      });
    }

    if (filteredExams.length === 0) {
      return res.status(404).json({ success: false, message: "No exams found for your assigned subjects." });
    }

    const examIds = filteredExams.map(e => e.id);

    const { data: classStudents, error: studentsError } = await supabase
      .from("class_students")
      .select("student_id, class_id")
      .in("class_id", classIds);
      
    if (studentsError) throw studentsError;

    // Fetch user details separately
    const studentIds = classStudents.map(cs => cs.student_id);
    const { data: usersData } = await supabase
      .from("user")
      .select("id, name, admission_number")
      .in("id", studentIds);

    const userMap = {};
    usersData?.forEach(u => {
      userMap[u.id] = u;
    });

    const { data: grades, error: gradesError } = await supabase
      .from("grades")
      .select("student_id, exam_id, marks")
      .in("exam_id", examIds);

    if (gradesError) throw gradesError;

    // Filter to unique subjects across these exams for the table headers
    const uniqueSubjects = [];
    const seenSubjects = new Set();
    filteredExams.forEach(ex => {
       if (!seenSubjects.has(ex.subject)) {
           seenSubjects.add(ex.subject);
           uniqueSubjects.push({ subject: ex.subject, maxMarks: ex.marks });
       }
    });

    const { data: classData } = await supabase.from("class").select("id, section").in("id", classIds);

    const results = classStudents.map(cs => {
      const studentGrades = {};
      const studentExams = filteredExams.filter(e => e.class_id === cs.class_id);

      studentExams.forEach(ex => {
        const gradeRecord = grades?.find(g => g.student_id === cs.student_id && g.exam_id === ex.id);
        studentGrades[ex.subject] = {
          exam_id: ex.id,
          marksObtained: gradeRecord ? gradeRecord.marks : null,
          maxMarks: ex.marks
        };
      });

      const classInfo = classData?.find(c => c.id === cs.class_id);
      const user = userMap[cs.student_id] || {};

      return {
        student_id: cs.student_id,
        name: user.name || "Unknown",
        admission_number: user.admission_number || "Unknown",
        section: classInfo ? classInfo.section : "",
        grades: studentGrades
      };
    });

    // Sort by section then by name
    results.sort((a, b) => {
      if (a.section !== b.section) return String(a.section).localeCompare(String(b.section));
      return String(a.name).localeCompare(String(b.name));
    });

    return res.status(200).json({
      success: true,
      subjects: uniqueSubjects,
      results
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: `Error Occurred: ${e.message}` });
  }
};

export const bulkUpdateGrades = async (req, res) => {
  const { grades } = req.body;
  if (!grades || !Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ success: false, message: "Valid grades array is required" });
  }

  try {
    // Collect exam IDs and student IDs
    const examIds = [...new Set(grades.map(g => g.exam_id))];
    const studentIds = [...new Set(grades.map(g => g.student_id))];

    // Fetch existing grades to see if we should update or insert
    const { data: existingGrades, error: fetchError } = await supabase
      .from("grades")
      .select("id, exam_id, student_id")
      .in("exam_id", examIds)
      .in("student_id", studentIds);

    if (fetchError) throw fetchError;

    // Fetch subjects from exams to satisfy the not-null constraint on grades
    const { data: examsData } = await supabase
      .from("exams")
      .select("id, subject")
      .in("id", examIds);
      
    const examSubjectMap = {};
    if (examsData) {
      examsData.forEach(ex => {
        examSubjectMap[ex.id] = ex.subject;
      });
    }

    const inserts = [];
    const updates = [];

    grades.forEach(g => {
      const existing = existingGrades?.find(eg => eg.exam_id === g.exam_id && eg.student_id === g.student_id);
      const data = {
        student_id: g.student_id,
        exam_id: g.exam_id,
        subject: examSubjectMap[g.exam_id] || "Unknown",
        marks: g.marks !== "" && g.marks !== null ? Number(g.marks) : 0
      };

      if (existing) {
        updates.push({ id: existing.id, ...data });
      } else {
        inserts.push(data);
      }
    });

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("grades").insert(inserts);
      if (insertError) throw insertError;
    }

    if (updates.length > 0) {
      const { error: upsertError } = await supabase.from("grades").upsert(updates);
      if (upsertError) throw upsertError;
    }

    try {
      const { FCMService } = await import("../../../services/fcmService.js");
      const notifsToInsert = [];
      for (const g of grades) {
         const subject = examSubjectMap[g.exam_id] || "a subject";
         const title = "Grade Published";
         const message = `Your grade for ${subject} has been published.`;
         await FCMService.sendToUsers([g.student_id], title, message, { type: "grade" }).catch(e => console.error(e));
         notifsToInsert.push({ user_id: g.student_id, title, message, type: "grade", is_read: false });
      }
      if (notifsToInsert.length > 0) {
         await supabase.from("notifications").insert(notifsToInsert);
      }
    } catch (fcmErr) { console.error("FCM Error:", fcmErr); }

    return res.status(200).json({ success: true, message: "Grades saved successfully" });
  } catch (e) {
    console.error("bulkUpdateGrades error:", e);
    return res.status(500).json({ success: false, message: `Failed to save grades: ${e.message}` });
  }
};

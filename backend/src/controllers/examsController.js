import { supabase } from "../config/supabaseClient.js";

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
          time: data.time
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
    const { data: exams, error } = await supabase.from("exams").select("*, class(name, section)");

    if (error) throw error;

    if (!exams || exams.length === 0) {
      return res.status(200).json({ success: true, count: 0, exams: [] });
    }

    // Map back to what frontend expects
    const mappedExams = exams.map(ex => ({
        ...ex,
        class: ex.class?.name,
        section: ex.class?.section
    }));

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

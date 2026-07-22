import { supabaseAdmin } from "../../config/supabaseClient.js";

export const getSubjectTeachers = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("subject_teachers")
      .select("*");

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignSubjectTeacher = async (req, res) => {
  try {
    const { subjectId, classId, teacherId } = req.body.data;

    if (!subjectId || !classId) {
      return res.status(400).json({ success: false, message: "Subject and Class are required" });
    }

    if (!teacherId) {
      // Remove assignment if teacher is unassigned
      const { error: delError } = await supabaseAdmin
        .from("subject_teachers")
        .delete()
        .match({ subject_id: subjectId, class_id: classId });
      if (delError) throw delError;
      return res.status(200).json({ success: true, message: "Assignment removed" });
    }

    // Manual upsert logic since there is no unique constraint on (subject_id, class_id)
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("subject_teachers")
      .select("id")
      .match({ subject_id: subjectId, class_id: classId });

    if (fetchErr) throw fetchErr;

    let resultData, resultError;

    if (existing && existing.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("subject_teachers")
        .update({ teacher_id: teacherId })
        .match({ subject_id: subjectId, class_id: classId })
        .select();
      resultData = data;
      resultError = error;
    } else {
      const { data, error } = await supabaseAdmin
        .from("subject_teachers")
        .insert({ subject_id: subjectId, class_id: classId, teacher_id: teacherId })
        .select();
      resultData = data;
      resultError = error;
    }

    if (resultError) throw resultError;

    return res.status(200).json({ success: true, message: "Teacher assigned successfully", data: resultData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

import { supabase } from "../../config/supabaseClient.js";

export const getTeacherProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch the classes where this teacher is assigned from class_teachers table
    const { data: teacherClasses, error: tcError } = await supabase
      .from("class_teachers")
      .select("class_id, class(name, section)")
      .eq("teacher_id", userId);
      
    if (tcError) throw tcError;

    // Fetch the subjects this teacher teaches
    const { data: subjectTeachersData, error: stError } = await supabase
      .from("subject_teachers")
      .select("id, subject_id, subject(name), class_id, class(name, section)")
      .eq("teacher_id", userId);

    if (stError) throw stError;
    
    // Format and combine classes
    const combinedClassesMap = new Map();

    const classTeacherOf = (teacherClasses || []).map(c => {
      if (c.class) {
        combinedClassesMap.set(c.class_id, {
          classId: c.class_id,
          className: c.class.name,
          section: c.class.section
        });
        return {
          classId: c.class_id,
          className: c.class.name,
          section: c.class.section
        };
      }
      return null;
    }).filter(Boolean);

    (subjectTeachersData || []).forEach(st => {
      if (st.class) {
        combinedClassesMap.set(st.class_id, {
          classId: st.class_id,
          className: st.class.name,
          section: st.class.section
        });
      }
    });

    const assignedClasses = Array.from(combinedClassesMap.values());

    const subjects = (subjectTeachersData || []).map(st => ({
      id: st.id,
      subjectId: st.subject_id,
      subjectName: st.subject?.name,
      classId: st.class_id,
      className: st.class?.name,
      section: st.class?.section
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        assignedClasses,
        classTeacherOf,
        subjects
      }
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`
    });
  }
};

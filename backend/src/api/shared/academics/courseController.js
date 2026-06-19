import { supabase } from "../../../config/supabaseClient.js";

export const createCourse = async (req, res) => {
  const { data } = req.body;

  if (!data.title || !data.subject || !data.class || !data.section) {
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

    // 1️⃣ Check Existing Course (Assignment)
    const { data: existingcourse, error: checkError } = await supabase
      .from("course")
      .select("*")
      .match({
        dueDate: data.dueDate,
        chapter: data.chapter,
        title: data.title,
        class_id: classId,
      });

    if (checkError) throw checkError;

    if (existingcourse && existingcourse.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Course Already Present",
      });
    }

    // 2️⃣ Create Course
    const { data: course, error: insertError } = await supabase
      .from("course")
      .insert([{
        title: data.title,
        subject: data.subject,
        class_id: classId,
        chapter: data.chapter,
        dueDate: data.dueDate
      }])
      .select();

    if (insertError || !course || !course.length) {
      return res.status(400).json({
        success: false,
        message: insertError ? insertError.message : "Course could not be created",
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
        title: data.title,
        message: `New assignment/material "${data.title}" uploaded`,
        type: "course",
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
            title: "Course Created",
            message: `New course/assignment "${data.title}" added for Class ${data.class}-${data.section}`,
            type: "course",
            is_read: false
        }));
        await supabase.from("activities").insert(activityInserts);
    }

    return res.status(201).json({
      success: true,
      message: "Course Created Successfully",
      data: course[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const getcourse = async (req, res) => {
  try {
    const { data: courses, error } = await supabase.from("course").select("*, class(name, section), solution:course_submissions(*)");

    if (error) throw error;

    if (!courses || courses.length === 0) {
      return res.status(200).json({ success: true, count: 0, courses: [] });
    }

    const mappedCourses = courses.map(c => ({
        ...c,
        class: c.class?.name,
        section: c.class?.section
    }));

    return res.status(200).json({
      success: true,
      message: "course get Successfully",
      courses: mappedCourses,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const updatecourse = async (req, res) => {
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

    const { data: updatedcourse, error } = await supabase
      .from("course")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error || !updatedcourse || updatedcourse.length === 0) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : "course not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "course Updated Successfully",
      course: updatedcourse[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const deletecourse = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("course")
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
      message: "course Deleted Successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { data } = req.body;
    const { content, studentId, id } = data; // id is course_id

    if (!content || !studentId || !id) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information.",
      });
    }

    // Insert into course_submissions, it handles unique constraint natively if defined
    const { error: insertError } = await supabase
      .from("course_submissions")
      .insert([{
          course_id: id,
          student_id: studentId,
          content: content
      }]);

    if (insertError) {
        if (insertError.code === '23505') { // unique violation
            return res.status(400).json({
                success: false,
                message: "You have already submitted.",
            });
        }
        throw insertError;
    }

    return res.status(200).json({
      success: true,
      message: "Successfully submitted.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${error.message}`,
    });
  }
};

export const getStudentCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: studentClass, error: classError } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", userId)
      .single();

    if (classError || !studentClass) {
      return res.status(200).json({ success: true, count: 0, courses: [] });
    }

    const { data: courses, error } = await supabase
      .from("course")
      .select("*")
      .eq("class_id", studentClass.class_id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      courses: courses || [],
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

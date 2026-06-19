import { supabase } from "../../../config/supabaseClient.js";

export const createClasses = async (req, res) => {
    try {
        const { data } = req.body;

        if (!data?.className || !data?.section) {
            return res.status(400).json({
                success: false,
                message: "Class name and section are required"
            });
        }

        // 🔍 Check duplicate
        const { data: existingClass, error: existingError } = await supabase
            .from("class")
            .select("*")
            .match({
                name: data.className,
                section: data.section
            });
            
        if (existingError) throw existingError;

        if (existingClass && existingClass.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Class already exists"
            });
        }

        // Validate teachers if needed (skipped for brevity as they come from select)

        // ✅ Insert class
        const { data: insertedClass, error: insertError } = await supabase
            .from("class")
            .insert([{
                name: data.className,
                section: data.section
            }])
            .select();
            
        if (insertError) throw insertError;

        const newClass = insertedClass[0];

        // ✅ Update teacher classes mapping
        if (data.teachers && data.teachers.length > 0) {
            const teacherInserts = data.teachers.map(tid => ({ class_id: newClass.id, teacher_id: tid }));
            await supabase.from("class_teachers").insert(teacherInserts);
        }

        // ✅ Update student classes mapping
        if (data.students && data.students.length > 0) {
            // A student can only be in one class, so remove them from their old class first
            await supabase.from("class_students").delete().in("student_id", data.students);
            const studentInserts = data.students.map(sid => ({ class_id: newClass.id, student_id: sid }));
            await supabase.from("class_students").insert(studentInserts);
        }

        return res.status(201).json({
            success: true,
            message: "Class created successfully"
        });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: `Error occurred: ${e.message}`
        });
    }
};

export const getClasses = async (req, res)=>{
    try {
        const { data: classes, error } = await supabase
            .from("class")
            .select(`
                *,
                class_students(student_id),
                class_teachers(teacher_id)
            `);
            
        if (error) throw error;

        if (!classes || classes.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                classes: []
            });
        }

        // Map to old frontend structure
        const mappedClasses = classes.map(c => ({
            ...c,
            className: c.name,
            student: c.class_students.map(cs => cs.student_id),
            teacher: c.class_teachers.map(ct => ct.teacher_id)
        }));

        return res.status(200).json({
            success: true,
            count: mappedClasses.length,
            classes: mappedClasses
        });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: `Error Occurred: ${e.message}`
        });
    }
}

export const getClassesById = async(req, res) =>{
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Class ID is required"
            });
        }

        const { data: classes, error } = await supabase
            .from("class")
            .select(`
                *,
                class_students(student_id),
                class_teachers(teacher_id)
            `)
            .eq("id", Number(id));
            
        if (error) throw error;

        if (!classes || classes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "class not found"
            });
        }

        const c = classes[0];
        const mappedClass = {
            ...c,
            className: c.name,
            student: c.class_students.map(cs => cs.student_id),
            teacher: c.class_teachers.map(ct => ct.teacher_id)
        };

        return res.status(200).json({
            success: true,
            classes: mappedClass
        });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: `Error Occurred: ${e.message}`
        });
    }
}

export const updateClasses = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data?.id) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required"
      });
    }

    // 🔍 Check class exists
    const { data: existingClass, error: existingError } = await supabase
      .from("class")
      .select("*")
      .eq("id", data.id);
      
    if (existingError) throw existingError;

    if (!existingClass || existingClass.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Update teacher mapping if provided
    if (data.teachers !== undefined) {
        await supabase.from("class_teachers").delete().eq("class_id", data.id);
        if (data.teachers.length > 0) {
            const teacherInserts = data.teachers.map(tid => ({ class_id: data.id, teacher_id: tid }));
            await supabase.from("class_teachers").insert(teacherInserts);
        }
    }

    // Update student mapping if provided
    if (data.students !== undefined) {
        await supabase.from("class_students").delete().eq("class_id", data.id);
        if (data.students.length > 0) {
            // Remove them from any other class first
            await supabase.from("class_students").delete().in("student_id", data.students);
            const studentInserts = data.students.map(sid => ({ class_id: data.id, student_id: sid }));
            await supabase.from("class_students").insert(studentInserts);
        }
    }

    // ✅ Update class table
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.teacher; // Handled above (old property)
    delete updateData.teachers; 
    delete updateData.students;
    if (updateData.className) {
        updateData.name = updateData.className;
        delete updateData.className;
    }
    // Delete old schema fields that don't exist
    delete updateData.student;
    delete updateData.subject;
    delete updateData.teachersSubject;

    if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("class")
          .update(updateData)
          .eq("id", data.id);
          
        if (updateError) throw updateError;
    }

    return res.status(200).json({
      success: true,
      message: "Class updated successfully"
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`
    });
  }
};

export const addStudent = async (req, res) => {
    const { data } = req.body;

    if (!data?.studentId || !data?.classId) {
        return res.status(400).json({
            success: false,
            message: "Student ID and Class ID are required"
        });
    }

    try {
        // 🔥 STEP 1: Remove student from old class (if exists)
        await supabase.from("class_students").delete().eq("student_id", data.studentId);

        // 🔥 STEP 2: Add student to new class
        const { error: insertError } = await supabase.from("class_students").insert([{
            class_id: data.classId,
            student_id: data.studentId
        }]);

        if (insertError) throw insertError;

        return res.status(200).json({
            success: true,
            message: "Student class updated successfully"
        });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: `Error occurred: ${e.message}`
        });
    }
};

export const addTeacher = async (req, res) => {
  const { data } = req.body;

  // Assuming frontend wants to add multiple subject teachers
  // The new schema doesn't have a direct teachersSubject array column on class.
  // We can insert them into `timeTable` or `class_teachers`. We will just insert them into `class_teachers` for now.
  if (!data?.id || !Array.isArray(data?.subjectTeacher)) {
    return res.status(400).json({
      success: false,
      message: "Class ID and subjectTeacher array are required",
    });
  }

  try {
    const teacherIds = data.subjectTeacher.map(t => typeof t === 'object' ? t.id || t.teacherId : t);
    
    // Clear and reinsert
    await supabase.from("class_teachers").delete().eq("class_id", data.id);
    
    if (teacherIds.length > 0) {
        const inserts = teacherIds.map(tid => ({ class_id: data.id, teacher_id: tid }));
        await supabase.from("class_teachers").insert(inserts);
    }

    return res.status(200).json({
      success: true,
      message: "Updated Successfully",
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const deleteClasses = async (req, res) => {
  const { id } = req.params;

  try {
    // ON DELETE CASCADE takes care of class_students and class_teachers
    const { error: deleteError } = await supabase
      .from("class")
      .delete()
      .eq("id", id);
      
    if (deleteError) throw deleteError;

    return res.status(200).json({
      success: true,
      message: "Class deleted successfully"
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`
    });
  }
};

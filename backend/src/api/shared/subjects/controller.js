import { supabase } from "../../../config/supabaseClient.js";

export const createSubject = async (req, res) => {
  const { data } = req.body;

  if (!data?.name) {
    return res.status(400).json({
      success: false,
      message: "Subject name is required",
    });
  }

  try {
    const { data: subject, error } = await supabase
      .from("subject")
      .insert([{ name: data.name }])
      .select();

    if (error) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({
          success: false,
          message: "Subject already exists",
        });
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject: subject[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const { data: subjects, error } = await supabase
      .from("subject")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects: subjects || [],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  if (!data?.name) {
    return res.status(400).json({
      success: false,
      message: "Subject name is required",
    });
  }

  try {
    const { data: updatedSubject, error } = await supabase
      .from("subject")
      .update({ name: data.name })
      .eq("id", id)
      .select();

    if (error || !updatedSubject || updatedSubject.length === 0) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      subject: updatedSubject[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const deleteSubject = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("subject")
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
      message: "Subject deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

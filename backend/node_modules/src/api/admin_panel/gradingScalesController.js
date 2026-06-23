import { supabase } from "../../config/supabaseClient.js";

// GET all grading scales
export const getGradingScales = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("grading_scales")
      .select("*")
      .order("min_percentage", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE a new grading scale
export const createGradingScale = async (req, res) => {
  try {
    const { grade, min_percentage, max_percentage, color_hex } = req.body;

    const { data, error } = await supabase
      .from("grading_scales")
      .insert([{ grade, min_percentage, max_percentage, color_hex }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE a grading scale
export const updateGradingScale = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, min_percentage, max_percentage, color_hex } = req.body;

    const { data, error } = await supabase
      .from("grading_scales")
      .update({ grade, min_percentage, max_percentage, color_hex })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE a grading scale
export const deleteGradingScale = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("grading_scales")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ message: "Grading scale deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

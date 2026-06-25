import { supabaseAdmin } from "../../../config/supabaseClient.js";

export const getThoughtOfToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseAdmin
      .from('thought_of_the_day')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error("Error fetching thought of today:", error);
      throw error;
    }

    return res.status(200).json({ success: true, data: data || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllThoughts = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('thought_of_the_day')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addThought = async (req, res) => {
  try {
    const { date, thought, author } = req.body;
    
    if (!date || !thought) {
      return res.status(400).json({ success: false, message: "Date and thought are required" });
    }

    const { data, error } = await supabaseAdmin
      .from('thought_of_the_day')
      .insert([{ date, thought, author }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ success: false, message: "A thought already exists for this date." });
      }
      throw error;
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateThought = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, thought, author } = req.body;

    const { data, error } = await supabaseAdmin
      .from('thought_of_the_day')
      .update({ date, thought, author })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteThought = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('thought_of_the_day')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Thought deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import { supabaseAdmin } from "../../../config/supabaseClient.js";

export const getSpotlightOfToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseAdmin
      .from('spotlight_of_the_day')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error("Error fetching spotlight of today:", error);
      throw error;
    }

    return res.status(200).json({ success: true, data: data || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllSpotlights = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('spotlight_of_the_day')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addSpotlight = async (req, res) => {
  try {
    const { date, title, description, image_url } = req.body;
    
    if (!date || !title || !description) {
      return res.status(400).json({ success: false, message: "Date, title, and description are required" });
    }

    const { data, error } = await supabaseAdmin
      .from('spotlight_of_the_day')
      .insert([{ date, title, description, image_url }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ success: false, message: "A spotlight already exists for this date." });
      }
      throw error;
    }

    return res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSpotlight = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, title, description, image_url } = req.body;

    const { data, error } = await supabaseAdmin
      .from('spotlight_of_the_day')
      .update({ date, title, description, image_url })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSpotlight = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('spotlight_of_the_day')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Spotlight deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

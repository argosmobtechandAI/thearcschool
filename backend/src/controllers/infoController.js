import { supabase } from "../config/supabaseClient.js";

// ---------------- FETCH ALL DATA ----------------
export const getAllInfo = async (req, res) => {
  try {
    const [settings, champions, gallery, newsletters] = await Promise.all([
      supabase.from("school_settings").select("*").limit(1).single(),
      supabase.from("school_champions").select("*").order("created_at", { ascending: false }),
      supabase.from("school_gallery").select("*").order("created_at", { ascending: false }),
      supabase.from("school_newsletters").select("*").order("created_at", { ascending: false })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        settings: settings.data || null,
        champions: champions.data || [],
        gallery: gallery.data || [],
        newsletters: newsletters.data || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- SETTINGS (Social Links) ----------------
export const updateSettings = async (req, res) => {
  const { instagram_url, whatsapp_url, linkedin_url, twitter_url } = req.body;
  try {
    // Check if settings exist
    const { data: existing } = await supabase.from("school_settings").select("id").limit(1).single();
    
    let result;
    if (existing?.id) {
      result = await supabase.from("school_settings").update({ instagram_url, whatsapp_url, linkedin_url, twitter_url, updated_at: new Date() }).eq("id", existing.id).select();
    } else {
      result = await supabase.from("school_settings").insert([{ instagram_url, whatsapp_url, linkedin_url, twitter_url }]).select();
    }

    if (result.error) throw result.error;
    
    return res.status(200).json({ success: true, data: result.data[0], message: "Settings updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- CHAMPIONS ----------------
export const addChampion = async (req, res) => {
  const { student_id, game_name, achievement_level, marks_score } = req.body;
  try {
    const { data, error } = await supabase.from("school_champions").insert([{ student_id, game_name, achievement_level, marks_score }]).select();
    if (error) throw error;
    return res.status(201).json({ success: true, data: data[0], message: "Champion added successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateChampion = async (req, res) => {
  const { id } = req.params;
  const { student_id, game_name, achievement_level, marks_score } = req.body;
  try {
    const { data, error } = await supabase.from("school_champions").update({ student_id, game_name, achievement_level, marks_score }).eq("id", id).select();
    if (error) throw error;
    return res.status(200).json({ success: true, data: data[0], message: "Champion updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteChampion = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from("school_champions").delete().eq("id", id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Champion deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GALLERY ----------------
export const addGalleryImage = async (req, res) => {
  const { image_url } = req.body;
  try {
    const { data, error } = await supabase.from("school_gallery").insert([{ image_url }]).select();
    if (error) throw error;
    return res.status(201).json({ success: true, data: data[0], message: "Image added to gallery" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGalleryImage = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from("school_gallery").delete().eq("id", id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- NEWSLETTERS ----------------
export const addNewsletter = async (req, res) => {
  const { document_url } = req.body;
  try {
    const { data, error } = await supabase.from("school_newsletters").insert([{ document_url }]).select();
    if (error) throw error;
    return res.status(201).json({ success: true, data: data[0], message: "Newsletter uploaded successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNewsletter = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from("school_newsletters").delete().eq("id", id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Newsletter deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

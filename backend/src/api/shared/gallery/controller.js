import { supabaseAdmin } from "../../../config/supabaseClient.js";

export const getGalleryItems = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("school_gallery")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGalleryItem = async (req, res) => {
  try {
    const { title, description, media_type, media_url } = req.body;

    if (!title || !media_type || !media_url) {
      return res.status(400).json({
        success: false,
        message: "Title, media_type, and media_url are required",
      });
    }

    if (media_type !== "image" && media_type !== "video") {
      return res.status(400).json({
        success: false,
        message: "media_type must be either 'image' or 'video'",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("school_gallery")
      .insert([{ title, description, media_type, media_url }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("school_gallery")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Gallery item deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

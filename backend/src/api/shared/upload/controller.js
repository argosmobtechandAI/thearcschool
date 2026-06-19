import { supabase } from "../../../config/supabaseClient.js";

/**
 * Upload a file locally.
 * The frontend sends a multipart/form-data request with a 'file' field.
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    // Construct the public URL for the uploaded file
    // Assumes the backend is serving the 'uploads' directory statically
    const host = req.get("host");
    const protocol = req.protocol;
    const publicUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      fileName: req.file.filename,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Upload failed: ${e.message}`,
    });
  }
};

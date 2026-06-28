import { supabase } from "../../../config/supabaseClient.js";
import fs from "fs";
import path from "path";

/**
 * Upload a file.
 * If running locally, forwards the request to the VPS backend to be saved directly to the CDN.
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    const rawCategory = req.query.category || "general";
    let category = "general";
    if (rawCategory === "school" || rawCategory === "school_info") {
      category = "school_info";
    } else if (rawCategory === "exam" || rawCategory === "exams") {
      category = "exams";
    } else if (rawCategory === "document" || rawCategory === "admissions" || rawCategory === "student" || rawCategory === "aadhar" || rawCategory === "pan" || rawCategory === "birthCertificate") {
      category = "admissions";
    } else if (rawCategory === "circular") {
      category = "circular";
    } else if (rawCategory === "avatar" || rawCategory === "avatars" || rawCategory === "profile") {
      category = "avatar";
    } else if (rawCategory === "gallery") {
      category = "gallery";
    }

    const isVPS = fs.existsSync("/var/www") && process.platform === "linux";

    // 1. If running locally, forward the request to the VPS production server
    if (!isVPS) {
      try {
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
        formData.append("file", fileBlob, req.file.originalname);

        const vpsResponse = await fetch(`https://api.thearcschool.in/api/upload/file?category=${category}`, {
          method: "POST",
          headers: {
            "Authorization": req.headers.authorization
          },
          body: formData
        });

        // Clean up the local temp file saved by multer
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) { }

        const vpsResult = await vpsResponse.json();

        if (vpsResponse.ok && vpsResult.success) {
          return res.status(200).json(vpsResult);
        } else {
          return res.status(vpsResponse.status).json({
            success: false,
            message: `VPS upload failed: ${vpsResult.message || vpsResponse.statusText}`
          });
        }
      } catch (forwardErr) {
        // Local fallback if VPS is offline or not deployed yet
        const host = req.get("host");
        const protocol = req.protocol;
        const localUrl = `${protocol}://${host}/uploads/${category}/${req.file.filename}`;

        return res.status(200).json({
          success: true,
          url: localUrl,
          fileName: req.file.filename,
          warning: "Failed to forward to VPS, using local dev server fallback"
        });
      }
    }

    // 2. We are running on the VPS, return the new CDN path
    const fileUrl = `https://cdn.thearcschool.in/${category}/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      fileName: req.file.filename,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Upload failed: ${e.message}`,
    });
  }
};

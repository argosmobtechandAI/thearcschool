import fs from "fs";
import path from "path";

/**
 * Resolve category string to a canonical folder name.
 */
function resolveCategory(rawCategory = "general") {
  if (rawCategory.startsWith("class_")) return rawCategory;
  if (rawCategory === "school" || rawCategory === "school_info") return "school_info";
  if (rawCategory === "exam" || rawCategory === "exams") return "exams";
  if (
    rawCategory === "document" ||
    rawCategory === "admissions" ||
    rawCategory === "student" ||
    rawCategory === "aadhar" ||
    rawCategory === "pan" ||
    rawCategory === "birthCertificate"
  )
    return "admissions";
  if (rawCategory === "circular") return "circular";
  if (rawCategory === "avatar" || rawCategory === "avatars" || rawCategory === "profile")
    return "avatar";
  if (rawCategory === "gallery") return "gallery";
  if (rawCategory === "material") return "academics/material";
  if (rawCategory === "assignment") return "academics/assignment";
  return "general";
}

/**
 * Upload a file.
 *
 * Local dev  → saves to  <project>/backend/uploads/<category>/
 *              returns   http://localhost:3003/uploads/<category>/<filename>
 *
 * VPS (Linux) → saves to  /var/www/arcschool/uploads/<category>/
 *               returns   https://cdn.arcschool.cloud/<category>/<filename>
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const category = resolveCategory(req.query.category);
    const isVPS = fs.existsSync("/var/www") && process.platform === "linux";

    let fileUrl;

    if (isVPS) {
      // On VPS the file is already saved to /var/www/arcschool/uploads/<category>/
      fileUrl = `https://cdn.arcschool.cloud/${category}/${req.file.filename}`;
    } else {
      // On local dev, return a localhost-accessible URL.
      // The backend serves /uploads as a static directory (make sure this is in app.js).
      const protocol = req.protocol;
      const host = req.get("host"); // e.g. localhost:3003
      fileUrl = `${protocol}://${host}/uploads/${category}/${req.file.filename}`;
    }

    return res.status(200).json({
      success: true,
      url: fileUrl,
      fileName: req.file.filename,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: `Upload failed: ${e.message}` });
  }
};

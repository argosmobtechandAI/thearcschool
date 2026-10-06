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
 *               returns   ${process.env.CDN_BASE_URL}/<category>/<filename>
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const category = resolveCategory(req.query.category);
    const host = req.get("host") || "";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("10.0.2.2");
    const protocol = (req.headers["x-forwarded-proto"] || req.protocol || "").includes("https") || !isLocalhost
      ? "https"
      : "http";

    let fileUrl;

    if (process.env.CDN_BASE_URL) {
      const cdnBase = process.env.CDN_BASE_URL.replace(/\/+$/, "");
      fileUrl = `${cdnBase}/${category}/${req.file.filename}`;
    } else {
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

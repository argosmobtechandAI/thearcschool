import { Router } from "express";
import multer from "multer";
import { uploadFile } from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const rawCategory = req.query.category || "general";
    let category = "general";
    if (rawCategory.startsWith("class_")) {
      category = rawCategory;
    } else if (rawCategory === "school" || rawCategory === "school_info") {
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

    // Check if running on Linux VPS
    const isVPS = fs.existsSync("/var/www") && process.platform === "linux";
    const baseDir = isVPS
      ? "/var/www/thearcschool/public"
      : path.join(process.cwd(), "uploads");

    const targetDir = path.join(baseDir, category);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

const uploadRouter = Router();

uploadRouter.post("/file", auth, (req, res, next) => {
  upload.single("file")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading (e.g., file too large)
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred
      return res.status(500).json({ success: false, message: `Unknown error: ${err.message}` });
    }
    // Everything went fine, proceed to controller
    next();
  });
}, uploadFile);

export default uploadRouter;

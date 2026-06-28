import { Router } from "express";
import { auth } from "../../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../../middlewares/roleMiddleware.js";
import { createCircular, getCirculars, deleteCircular, uploadCircularFile } from "./controller.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Multer Storage Configuration for VPS CDN directory with local dev fallback
const VPS_DIR = "/var/www/thearcschool/public/circular";
const LOCAL_DIR = path.join(process.cwd(), "uploads", "circular");
const isVPS = fs.existsSync("/var/www") && process.platform === "linux";
const targetDir = isVPS ? VPS_DIR : LOCAL_DIR;

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, targetDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

const router = Router();

// Secure all routes
router.use(auth);

// CRUD routes
router.get("/", getCirculars);
router.post("/", authorizeRoles("admin", "principal"), createCircular);
router.post("/upload", authorizeRoles("admin", "principal"), upload.single("file"), uploadCircularFile);
router.delete("/:id", authorizeRoles("admin", "principal"), deleteCircular);

export default router;

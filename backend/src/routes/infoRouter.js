import { Router } from "express";
import { 
  getAllInfo, 
  updateSettings, 
  addChampion, updateChampion, deleteChampion, 
  addGalleryImage, deleteGalleryImage, 
  addNewsletter, deleteNewsletter 
} from "../controllers/infoController.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = Router();

// Retrieve all info for the admin dashboard (public or protected based on your needs)
router.get("/getAll", auth, getAllInfo);

// Settings (Social)
router.put("/settings", auth, updateSettings);

// Champions
router.post("/champion", auth, addChampion);
router.put("/champion/:id", auth, updateChampion);
router.delete("/champion/:id", auth, deleteChampion);

// Gallery
router.post("/gallery", auth, addGalleryImage);
router.delete("/gallery/:id", auth, deleteGalleryImage);

// Newsletters
router.post("/newsletter", auth, addNewsletter);
router.delete("/newsletter/:id", auth, deleteNewsletter);

export default router;

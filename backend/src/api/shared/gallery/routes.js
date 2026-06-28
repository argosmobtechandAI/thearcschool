import { Router } from "express";
import * as galleryController from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../../middlewares/roleMiddleware.js";

const router = Router();

// Allow all authenticated users to fetch gallery items
router.get("/", auth, galleryController.getGalleryItems);

// Restrict CRUD operations to Admin and Principal
router.post("/", auth, authorizeRoles("admin", "principal"), galleryController.createGalleryItem);
router.delete("/:id", auth, authorizeRoles("admin", "principal"), galleryController.deleteGalleryItem);

export default router;

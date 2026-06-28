import { Router } from "express";
import * as spotlightController from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../../middlewares/roleMiddleware.js";

const router = Router();

// Allow all authenticated users (students, teachers, admins, principals) to fetch today's spotlight
router.get("/today", auth, spotlightController.getSpotlightOfToday);

// Restrict CRUD operations to Admin and Principal
router.use(auth, authorizeRoles("admin", "principal"));

router.get("/", spotlightController.getAllSpotlights);
router.post("/", spotlightController.addSpotlight);
router.put("/:id", spotlightController.updateSpotlight);
router.delete("/:id", spotlightController.deleteSpotlight);

export default router;

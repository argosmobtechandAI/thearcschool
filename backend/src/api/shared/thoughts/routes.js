import { Router } from "express";
import * as thoughtController from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../../middlewares/roleMiddleware.js";

const router = Router();

// Allow all authenticated users (students, teachers, admins, principals) to fetch today's thought
router.get("/today", auth, thoughtController.getThoughtOfToday);

// Restrict CRUD operations to Admin and Principal
router.use(auth, authorizeRoles("admin", "principal"));

router.get("/", thoughtController.getAllThoughts);
router.post("/", thoughtController.addThought);
router.put("/:id", thoughtController.updateThought);
router.delete("/:id", thoughtController.deleteThought);

export default router;

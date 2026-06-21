import { Router } from "express";
import * as plannerController from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../../middlewares/roleMiddleware.js";

const router = Router();

// Define allowed roles (Admin, Teacher, Student, etc. can view, but only Admin can modify)
// For now, let's keep GET open to authenticated users and POST/PUT/DELETE for admin.
// Wait, the shared/events had auth for POST but maybe GET was open. Let's make GET authenticated.
router.use(auth);

// GET all events
router.get("/", plannerController.getPlannerEvents);

// Admin only routes
router.post("/", authorizeRoles("admin"), plannerController.createPlannerEvent);
router.put("/:id", authorizeRoles("admin"), plannerController.updatePlannerEvent);
router.delete("/:id", authorizeRoles("admin"), plannerController.deletePlannerEvent);

router.get("/consent-report/:eventId", authorizeRoles("admin"), plannerController.getConsentReport);
router.post("/consent-reminders/:eventId", authorizeRoles("admin"), plannerController.sendConsentReminders);
router.post("/mock-consent/:consentId", authorizeRoles("admin"), plannerController.mockParentConsent);

export default router;

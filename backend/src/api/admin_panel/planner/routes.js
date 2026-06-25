import { Router } from "express";
import * as plannerController from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";

const router = Router();

// Define allowed roles (Admin, Teacher, Student, etc. can view, but only Admin can modify)
// For now, let's keep GET open to authenticated users and POST/PUT/DELETE for admin.
// Wait, the shared/events had auth for POST but maybe GET was open. Let's make GET authenticated.
router.use(auth);

// GET all events
router.get("/", plannerController.getPlannerEvents);

// Admin only routes (already protected by admin_panel parent router)
router.post("/", plannerController.createPlannerEvent);
router.put("/:id", plannerController.updatePlannerEvent);
router.delete("/:id", plannerController.deletePlannerEvent);

router.get("/consent-report/:eventId", plannerController.getConsentReport);
router.post("/consent-reminders/:eventId", plannerController.sendConsentReminders);
router.post("/mock-consent/:consentId", plannerController.mockParentConsent);

export default router;

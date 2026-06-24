import { Router } from "express";
import {
  createConsent,
  getConsentsByFilters,
  getConsentReport,
  getStudentConsents,
  updateConsentStatus,
  updateConsent,
  deleteConsent
} from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../../middlewares/roleMiddleware.js";

const router = Router();

router.use(auth);

// Admin Routes
router.post("/", authorizeRoles("admin", "principal"), createConsent);
router.get("/admin", authorizeRoles("admin", "principal"), getConsentsByFilters);
router.get("/admin/:id/report", authorizeRoles("admin", "principal"), getConsentReport);
router.put("/admin/:id", authorizeRoles("admin", "principal"), updateConsent);
router.delete("/admin/:id", authorizeRoles("admin", "principal"), deleteConsent);

// Student/Parent Routes
router.get("/student", authorizeRoles("student", "parent"), getStudentConsents);
router.put("/student/:id/status", authorizeRoles("student", "parent"), updateConsentStatus);

export default router;

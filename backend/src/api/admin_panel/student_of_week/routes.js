import express from "express";
import { getAllStudentOfWeek, createStudentOfWeekOverride, deleteStudentOfWeek } from "./controller.js";
import { auth as authenticate } from "../../../middlewares/authMiddleware.js";
import { authorizeRoles as authorize } from "../../../middlewares/roleMiddleware.js";

const router = express.Router();

// Only admin/principal should manage these
router.use(authenticate);

router.get("/", getAllStudentOfWeek);
router.post("/", createStudentOfWeekOverride);
router.delete("/:id", deleteStudentOfWeek);

export default router;

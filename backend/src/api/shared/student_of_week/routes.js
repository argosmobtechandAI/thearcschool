import express from "express";
import { getCurrentStudentOfWeek } from "./controller.js";
import { auth as authenticate } from "../../../middlewares/authMiddleware.js"; // Standard auth middleware

const router = express.Router();

router.get("/current", authenticate, getCurrentStudentOfWeek);

export default router;

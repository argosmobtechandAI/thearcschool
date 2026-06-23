import { Router } from "express";
import { auth } from "../../../middlewares/authMiddleware.js";
import { updateAttendance, bulkUpdateAttendance, getAttendance } from "./controller.js";

const router = Router();

// Protect all attendance routes
router.use(auth);

router.get("/", getAttendance);
router.put("/:id", updateAttendance);
router.post("/bulk", bulkUpdateAttendance);

export default router;

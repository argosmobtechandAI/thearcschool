import { Router } from "express";
import { getcourse, deletecourse, createCourse, updatecourse } from "../shared/academics/courseController.js";

const router = Router();

router.get("/", getcourse);
router.post("/", createCourse);
router.put("/:id", updatecourse);
router.delete("/:id", deletecourse);

export default router;

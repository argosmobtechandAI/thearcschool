import express from "express";
import {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
} from "./controller.js";

const router = express.Router();

router.post("/createSubject", createSubject);
router.get("/getSubjects", getSubjects);
router.put("/updateSubject/:id", updateSubject);
router.delete("/deleteSubject/:id", deleteSubject);

export default router;

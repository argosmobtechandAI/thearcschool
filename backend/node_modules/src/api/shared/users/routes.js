import { Router } from "express";
import { auth } from "../../../middlewares/authMiddleware.js";
import {
  loginUser,
  getUserById,
  getMySelf,
  forgetPassword,
  updateNotification,
  getTeacherWeek
} from "./controller.js";
import { submitFees } from "../finance/controller.js";
import { updateMarks, getTopper } from "../academics/examsController.js";

const router = Router();

router.post("/loginUser", loginUser);
router.put("/forgotPassword", forgetPassword);
router.get("/getUserById/:id", auth, getUserById);
router.get("/getMyself", auth, getMySelf);
router.put("/updateMarks", auth, updateMarks);
router.put("/submitFees/:studentId/:feeId", auth, submitFees);
router.get("/getTopper", auth, getTopper);
router.put("/updateNotification/:id", auth, updateNotification);
router.get("/getTeacherWeek", auth, getTeacherWeek);

export default router;

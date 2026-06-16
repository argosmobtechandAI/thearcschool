import { Router } from "express";
import { auth } from "../middlewares/authMiddleware.js";
import {
  createUser,
  loginUser,
  updateUser,
  getUsers,
  getUserById,
  getMySelf,
  deleteUser,
  forgetPassword,
  uploadBulkUser,
  updateMarks,
  updateAttendance,
  addFee,
  submitFees,
  getTopper,
  updateNotification,
  getTeacherWeek
} from "../controllers/userController.js";

const router = Router();

router.post("/createUser", createUser);
router.post("/loginUser", loginUser);
router.put("/forgotPassword", forgetPassword);
router.put("/updateUser", auth, updateUser);
router.post("/bulkUser", auth, uploadBulkUser);
router.get("/getUser", auth, getUsers);
router.get("/getUserById/:id", auth, getUserById);
router.get("/getMyself", auth, getMySelf);
router.put("/updateMarks", auth, updateMarks);
router.put("/updateAttendace/:id", auth, updateAttendance);
router.post("/createFees", auth, addFee);
router.put("/submitFees/:studentId/:feeId", auth, submitFees);
router.delete("/deleteUser/:id", auth, deleteUser);
router.get("/getTopper", auth, getTopper);
router.put("/updateNotification/:id", auth, updateNotification);
router.get("/getTeacherWeek", auth, getTeacherWeek);

export default router;

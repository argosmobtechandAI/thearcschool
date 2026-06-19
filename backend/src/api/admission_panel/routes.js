import { Router } from "express";
import { approveNewUser, createNewUser, deleteNewUser, getAllNewUsers, getSingleNewUser, updateNewUser } from "../shared/admissions/controller.js";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

const newUserRouter = Router();

// createNewUser is public (when a student/parent applies)
newUserRouter.post("/createNewUser", createNewUser);

// Protect the rest of the routes for admin and principal
newUserRouter.use(auth);
newUserRouter.use(authorizeRoles('admin', 'principal', 'admission'));

newUserRouter.get("/getAllNewUser", getAllNewUsers);
newUserRouter.get("/getNewUser/:id", getSingleNewUser);
newUserRouter.put("/updateNewUser/:id", updateNewUser);
newUserRouter.delete("/deleteNewUser/:id", deleteNewUser);
newUserRouter.post("/approveNewUser", approveNewUser);

export default newUserRouter;
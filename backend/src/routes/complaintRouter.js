import { Router } from "express";
import { createComplaint, getComplaint, getComplaintById } from "../controllers/complaintController.js";
import { auth } from "../middlewares/authMiddleware.js";


const complaintRouter = Router()

complaintRouter.get("/getComplaint", auth, getComplaint)

complaintRouter.post("/createComplaint", auth, createComplaint)

complaintRouter.get("/getComplaintById/:id", auth, getComplaintById)

export default complaintRouter
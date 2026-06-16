import { Router } from "express";
import { createCommunication, getCommunication } from "../controllers/communicationController.js";
import { auth } from "../middlewares/authMiddleware.js";

const communicationRouter = Router();

communicationRouter.post("/createChat", auth, createCommunication )

communicationRouter.get("/getChat/:type", auth, getCommunication)

export default communicationRouter
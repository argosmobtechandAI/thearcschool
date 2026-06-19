import { Router } from "express";
import { createCommunication, getCommunication } from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";

const communicationRouter = Router();

communicationRouter.post("/createChat", auth, createCommunication )

communicationRouter.get("/getChat/:type", auth, getCommunication)

export default communicationRouter
import { Router } from "express";
import { changePassword } from "./passwordController.js";

const passwordRoutes = Router();

passwordRoutes.post("/change-password", changePassword);

export default passwordRoutes;

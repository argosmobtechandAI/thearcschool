import Router from "express"
import { approveNewUser, createNewUser, deleteNewUser, getAllNewUsers, getSingleNewUser, updateNewUser } from "../controllers/newUserController.js"

const newUserRouter = Router()

newUserRouter.post("/createNewUser", createNewUser)

newUserRouter.get("/getAllNewUser", getAllNewUsers)

newUserRouter.get("/getNewUser/:id", getSingleNewUser)

newUserRouter.put("/updateNewUser/:id", updateNewUser)

newUserRouter.delete("/deleteNewUser/:id", deleteNewUser)

newUserRouter.post("/approveNewUser", approveNewUser)


export default newUserRouter
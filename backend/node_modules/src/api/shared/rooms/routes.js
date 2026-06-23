import express from "express";
import {
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
} from "./controller.js";

const router = express.Router();

router.post("/createRoom", createRoom);
router.get("/getRooms", getRooms);
router.put("/updateRoom/:id", updateRoom);
router.delete("/deleteRoom/:id", deleteRoom);

export default router;

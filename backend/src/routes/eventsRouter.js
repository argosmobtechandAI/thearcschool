import express from "express";
import { createEvent, deleteEvent, getAllEvents, getEventById, updateEvent } from "../controllers/eventsController.js";
import { auth } from "../middlewares/authMiddleware.js";


const eventsRouter = express.Router();

eventsRouter.post("/createEvents", auth, createEvent);
eventsRouter.get("/getAllEvents", auth, getAllEvents);
eventsRouter.get("/getEvents/:id", auth, getEventById);
eventsRouter.put("/updateEvents/:id", auth, updateEvent);
eventsRouter.delete("/deleteEvents/:id", auth, deleteEvent);

export default eventsRouter;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import central router
import routes from "./routes/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads directory statically
import path from "path";
const uploadDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

// Main API Router
app.use("/api", routes);

// Health Check
app.get("/", (req, res) => {
  return res.status(200).send("Connected Successfully");
});

export default app;

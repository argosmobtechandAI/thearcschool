import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";

// Import central router
import apiRoutes from "./api/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev")); // Log all API requests to the terminal

// Custom middleware to log error messages sent in JSON responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 400) {
      console.error(`\x1b[31m[ERROR] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}\x1b[0m\nDetails:`, body);
    }
    return originalJson.call(this, body);
  };
  next();
});

// Serve uploads directory statically
import path from "path";
const uploadDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

// Main API Router
app.use("/api", apiRoutes);

// Health Check
app.get("/", (req, res) => {
  return res.status(200).send("Connected Successfully");
});

export default app;
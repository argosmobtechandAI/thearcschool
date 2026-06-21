import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";

// Import central router
import apiRoutes from "./api/index.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Define custom morgan token for user info
morgan.token("user", (req) => req.user ? (req.user.email || req.user.username || req.user.id) : "Guest");
app.use(morgan("\x1b[36m:method\x1b[0m \x1b[33m:url\x1b[0m :status :response-time ms - length: :res[content-length] - \x1b[32mUser: :user\x1b[0m")); // Log all API requests to the terminal

// Custom middleware to log error messages sent in JSON responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 400) {
      const userInfo = req.user ? ` - User: ${req.user.email || req.user.username || req.user.id}` : '';
      console.error(`\x1b[31m[ERROR] ${req.method} ${req.originalUrl}${userInfo} - Status: ${res.statusCode}\x1b[0m\nDetails:`, body);
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
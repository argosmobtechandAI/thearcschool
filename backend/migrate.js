import fs from "fs";
import path from "path";

const srcDir = "/Users/chandanmallik/projects/thearcschool-backend";
const destDir = "/Users/chandanmallik/projects/thearcschool/backend/src";

const controllers = [
  "classController.js",
  "communicationController.js",
  "complaintController.js",
  "courseController.js",
  "eventsController.js",
  "examsController.js",
  "feeController.js",
  "infoController.js",
  "newUserController.js",
  "timeTableController.js",
];

const routers = [
  "classRouter.js",
  "communicationRouter.js",
  "complaintRouter.js",
  "courseRouter.js",
  "eventsRouter.js",
  "examsRouter.js",
  "feeRouter.js",
  "infoRouter.js",
  "newUserRouter.js",
  "timeTableRouter.js",
];

// Move Controllers
controllers.forEach((file) => {
  let content = fs.readFileSync(path.join(srcDir, "controller", file), "utf-8");
  content = content.replace(
    'import { supabase } from "../databaseClient.js";',
    'import { supabase } from "../config/supabaseClient.js";'
  );
  fs.writeFileSync(path.join(destDir, "controllers", file), content);
});

// Move Routers
routers.forEach((file) => {
  let content = fs.readFileSync(path.join(srcDir, "routes", file), "utf-8");
  content = content.replace(
    'import { auth } from "../middleware/auth.js";',
    'import { auth } from "../middlewares/authMiddleware.js";'
  );
  fs.writeFileSync(path.join(destDir, "routes", file), content);
});

console.log("Migration complete.");

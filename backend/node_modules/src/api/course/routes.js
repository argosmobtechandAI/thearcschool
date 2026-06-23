import { Router } from "express";

const router = Router();

router.get("/getCourse", (req, res) => {
    return res.status(200).json({ success: true, courses: [] });
});

export default router;

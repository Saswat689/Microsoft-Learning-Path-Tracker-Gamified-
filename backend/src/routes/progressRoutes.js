import express from "express";
import { updateProgress } from "../controllers/progressController.js";

const router = express.Router();

// POST /api/progress/update
router.post("/update", updateProgress);

export default router;

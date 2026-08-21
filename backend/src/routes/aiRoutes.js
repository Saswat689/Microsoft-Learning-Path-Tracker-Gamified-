import express from "express";
import { generateAIExplanation } from "../controllers/aiController.js";

const router = express.Router();

// POST /api/ai-explain
router.post("/", generateAIExplanation);

export default router;

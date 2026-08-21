import express from "express";
import { getDomainPath } from "../controllers/pathController.js";

const router = express.Router();

// GET /api/path?domain=cloud&userId=student_freshman_1
router.get("/", getDomainPath);

export default router;

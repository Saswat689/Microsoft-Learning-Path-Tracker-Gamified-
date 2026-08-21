import express from "express";
import cors from "cors";

import pathRoutes from "./routes/pathRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

app.use(cors());

app.use(express.json());

// Register API Routes
app.use("/api/path", pathRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai-explain", aiRoutes);

export default app;

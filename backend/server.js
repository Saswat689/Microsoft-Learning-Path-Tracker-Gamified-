import dotenv from "dotenv";
dotenv.config();

//some railway bs
import crypto from "crypto";
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}

import app from "./src/app.js";
import connectDB from "./src/config/db.js";

const PORT = process.env.PORT || 5000;

// Connect Database & Start Server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.log("Failed to connect to db, app crashed.");
  });

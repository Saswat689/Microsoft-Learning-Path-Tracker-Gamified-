import mongoose from "mongoose";

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    domain: { type: String, required: true },
    completedCerts: [{ type: String }], // e.g., ['az-900', 'az-104']
  },
  { timestamps: true },
);

// Ensures a single record per user per domain
userProgressSchema.index({ userId: 1, domain: 1 }, { unique: true });

export default mongoose.model("UserProgress", userProgressSchema);

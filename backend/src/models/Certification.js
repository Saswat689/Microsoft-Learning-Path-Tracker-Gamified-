import mongoose from "mongoose";

const certificationSchema = new mongoose.Schema(
  {
    certId: { type: String, required: true, unique: true }, // e.g., 'az-900'
    code: { type: String, required: true }, // e.g., 'AZ-900'
    title: { type: String, required: true }, // e.g., 'Azure Fundamentals'
    domain: { type: String, required: true, index: true }, // e.g., 'cloud', 'ai'
    prereqs: [{ type: String }], // e.g., ['az-900']
    x: { type: Number, required: true }, // Position X percentage
    y: { type: Number, required: true }, // Position Y percentage
    url: { type: String, required: true }, // Microsoft Learn link
  },
  { timestamps: true },
);

export default mongoose.model("Certification", certificationSchema);

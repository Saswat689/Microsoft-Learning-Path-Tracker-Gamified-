import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Certification from "../models/Certification.js";

const certData = [
  // Cloud Computing Track
  {
    certId: "az-900",
    code: "AZ-900",
    title: "Azure Fundamentals",
    domain: "cloud",
    prereqs: [],
    x: 15,
    y: 50,
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
  },
  {
    certId: "az-104",
    code: "AZ-104",
    title: "Azure Administrator",
    domain: "cloud",
    prereqs: ["az-900"],
    x: 40,
    y: 30,
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/",
  },
  {
    certId: "az-204",
    code: "AZ-204",
    title: "Azure Developer Associate",
    domain: "cloud",
    prereqs: ["az-900"],
    x: 40,
    y: 70,
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-developer/",
  },
  {
    certId: "az-305",
    code: "AZ-305",
    title: "Azure Solutions Architect",
    domain: "cloud",
    prereqs: ["az-104"],
    x: 75,
    y: 50,
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/",
  },

  // AI & Data Track
  {
    certId: "ai-900",
    code: "AI-900",
    title: "Azure AI Fundamentals",
    domain: "ai",
    prereqs: [],
    x: 20,
    y: 50,
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/",
  },
  {
    certId: "ai-102",
    code: "AI-102",
    title: "Azure AI Engineer Associate",
    domain: "ai",
    prereqs: ["ai-900"],
    x: 55,
    y: 50,
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/",
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data and re-insert
    await Certification.deleteMany({});
    await Certification.insertMany(certData);

    console.log("✅ Seed Data Inserted Successfully!");
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();

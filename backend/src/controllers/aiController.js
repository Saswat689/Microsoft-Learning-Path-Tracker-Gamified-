import { GoogleGenAI } from "@google/genai";
import Certification from "../models/Certification.js";

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateAIExplanation = async (req, res) => {
  const { userId, targetCertId, domain, completedCerts } = req.body;

  if (!targetCertId || !domain) {
    return res
      .status(400)
      .json({ error: "targetCertId and domain are required." });
  }

  // 1. Retrieve certification data for context
  const targetCert = await Certification.findOne({ certId: targetCertId });

  const fallbackExplanation = targetCert
    ? `${targetCert.title} builds directly upon foundational concepts to establish your core proficiency in ${domain}.`
    : `This certification step advances your knowledge in the ${domain} learning track.`;

  // 2. Graceful Fallback if Gemini SDK is unconfigured
  if (!ai) {
    console.warn("GEMINI_API_KEY is not set. Returning fallback explanation.");
    return res.status(200).json({
      cert_id: targetCertId,
      explanation: fallbackExplanation,
      source: "fallback",
    });
  }

  try {
    // 3. Construct prompt for AI
    const prompt = `You are a career advisor for Microsoft Learn paths.
The student is following the "${domain}" track.
Completed certifications: ${completedCerts && completedCerts.length > 0 ? completedCerts.join(", ") : "None"}.
Current target step: "${targetCert ? targetCert.title : targetCertId}".

In 1-2 concise, encouraging sentences, explain why this target step is the logical next step for their learning path based on prerequisites and skills gained. Do not choose or suggest other certs.`;

    // 4. Execute AI call with timeouts
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const aiText = response.text ? response.text.trim() : fallbackExplanation;

    return res.status(200).json({
      cert_id: targetCertId,
      explanation: aiText,
      source: "gemini",
    });
  } catch (error) {
    console.error("Gemini API call failed or timed out:", error.message);

    // Always return clean JSON with fallback on failure
    return res.status(200).json({
      cert_id: targetCertId,
      explanation: fallbackExplanation,
      source: "fallback",
    });
  }
};

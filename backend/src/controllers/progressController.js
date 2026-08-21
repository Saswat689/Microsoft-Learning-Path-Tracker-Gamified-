import UserProgress from "../models/UserProgress.js";

export const updateProgress = async (req, res) => {
  try {
    const { userId, certId, domain } = req.body;

    if (!userId || !certId || !domain) {
      return res
        .status(400)
        .json({ error: "userId, certId, and domain are required." });
    }

    // Upsert progress: find document or create if it doesn't exist, then add certId to array if unique
    const updatedProgress = await UserProgress.findOneAndUpdate(
      { userId, domain },
      { $addToSet: { completedCerts: certId } },
      { new: true, upsert: true },
    );

    return res.status(200).json({
      success: true,
      message: `Certification ${certId} marked as completed.`,
      completedCerts: updatedProgress.completedCerts,
    });
  } catch (error) {
    console.error("Error in updateProgress:", error);
    return res.status(500).json({ error: "Failed to update user progress." });
  }
};

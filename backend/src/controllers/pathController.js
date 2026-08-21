import Certification from "../models/Certification.js";
import UserProgress from "../models/UserProgress.js";

export const getDomainPath = async (req, res) => {
  try {
    const { domain, userId } = req.query;

    if (!domain || !userId) {
      return res
        .status(400)
        .json({ error: "Missing domain or userId query parameters." });
    }

    // 1. Fetch all certification nodes for the specified domain
    const certs = await Certification.find({ domain }).sort({ certId: 1 });

    // 2. Fetch user progress for this domain
    let progress = await UserProgress.findOne({ userId, domain });

    // If user has no record yet, return empty list
    const completedCerts = progress ? progress.completedCerts : [];

    return res.status(200).json({
      domain,
      userId,
      certs,
      completedCerts,
    });
  } catch (error) {
    console.error("Error in getDomainPath:", error);
    return res.status(500).json({ error: "Server error fetching path data." });
  }
};

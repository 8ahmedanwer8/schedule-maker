import express, { Request, Response } from "express";
import { database } from "../database";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Helper function to get user identifier (same as in middleware)
function getUserIdentifier(req: Request): string {
  let sessionId = req.headers["x-session-id"] as string;

  if (!sessionId) {
    const clientIP =
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      "unknown";

    const cleanIP = clientIP
      .toString()
      .split(",")[0]
      .trim()
      .replace(/^::ffff:/, "");
    return `ip_${cleanIP}`;
  }

  return `session_${sessionId}`;
}

// Generate a new session ID for better user tracking
router.post("/session", async (req: Request, res: Response) => {
  try {
    const sessionId = uuidv4();

    res.json({
      sessionId,
      message: "Session created successfully",
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({
      error: "Failed to create session",
    });
  }
});

// Get current usage status for a user
router.get("/status", async (req: Request, res: Response) => {
  try {
    const identifier = getUserIdentifier(req);
    const user = await database.getUserUsage(identifier);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const dailyFreeLimit =
      parseInt(await database.getSetting("daily_free_limit")) || 2;
    const maxDailyUsage =
      parseInt(await database.getSetting("max_daily_usage")) || 10;
    const creditsPerAd =
      parseInt(await database.getSetting("credits_per_ad")) || 1;

    const remainingFree = Math.max(0, dailyFreeLimit - user.daily_count);
    const canUseService =
      user.daily_count < maxDailyUsage &&
      (remainingFree > 0 || user.ad_credits > 0);

    res.json({
      identifier: identifier.replace(/^(ip_|session_)/, ""),
      identifierType: identifier.startsWith("ip_") ? "ip" : "session",
      dailyCount: user.daily_count,
      totalCount: user.total_count,
      remainingFree,
      adCredits: user.ad_credits,
      canUseService,
      limits: {
        dailyFreeLimit,
        maxDailyUsage,
        creditsPerAd,
      },
      needsAd:
        remainingFree === 0 &&
        user.ad_credits === 0 &&
        user.daily_count < maxDailyUsage,
    });
  } catch (error) {
    console.error("Error getting usage status:", error);
    res.status(500).json({
      error: "Failed to get usage status",
    });
  }
});

// Record ad completion and grant credits
router.post("/ad-completed", async (req: Request, res: Response) => {
  try {
    const identifier = getUserIdentifier(req);
    const { adNetwork, adId } = req.body;

    // Verify the ad completion (in a real app, you'd verify with the ad network)
    // For now, we'll trust the frontend

    const success = await database.recordAdView(
      identifier,
      adNetwork || "default"
    );

    if (!success) {
      return res.status(400).json({
        error: "Failed to record ad view",
      });
    }

    // Get updated user info
    const user = await database.getUserUsage(identifier);
    const creditsPerAd =
      parseInt(await database.getSetting("credits_per_ad")) || 1;

    res.json({
      message: "Ad completion recorded successfully",
      creditsEarned: creditsPerAd,
      totalCredits: user?.ad_credits || 0,
    });
  } catch (error) {
    console.error("Error recording ad completion:", error);
    res.status(500).json({
      error: "Failed to record ad completion",
    });
  }
});

// Get usage statistics (for admin/debugging)
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await database.getUsageStats();

    if (!stats) {
      return res.status(500).json({
        error: "Failed to get usage statistics",
      });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error getting usage stats:", error);
    res.status(500).json({
      error: "Failed to get usage statistics",
    });
  }
});

// Update app settings (for dynamic configuration)
router.post("/settings", async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        error: "Key and value are required",
      });
    }

    const validKeys = [
      "daily_free_limit",
      "credits_per_ad",
      "max_daily_usage",
      "auto_adjust_limits",
    ];

    if (!validKeys.includes(key)) {
      return res.status(400).json({
        error: "Invalid setting key",
        validKeys,
      });
    }

    const success = await database.updateSetting(key, value.toString());

    if (!success) {
      return res.status(500).json({
        error: "Failed to update setting",
      });
    }

    res.json({
      message: "Setting updated successfully",
      key,
      value: value.toString(),
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({
      error: "Failed to update setting",
    });
  }
});

// Reset user's daily count (for testing/admin purposes)
router.post("/reset/:identifier?", async (req: Request, res: Response) => {
  try {
    let identifier = req.params.identifier;

    if (!identifier) {
      identifier = getUserIdentifier(req);
    }

    const user = await database.getUserUsage(identifier);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const success = await database.resetUserUsage(identifier);
    if (!success) {
      return res.status(500).json({ error: "Failed to reset user usage" });
    }

    res.json({
      message: "User usage reset successfully",
      identifier,
    });
  } catch (error) {
    console.error("Error resetting user usage:", error);
    res.status(500).json({
      error: "Failed to reset user usage",
    });
  }
});

export default router;

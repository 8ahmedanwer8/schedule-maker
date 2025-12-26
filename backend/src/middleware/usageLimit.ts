import { Request, Response, NextFunction } from "express";
import { database, ConsumeUsageResult } from "../database";

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      userIdentifier?: string;
      userUsage?: ConsumeUsageResult;
      usageConsumed?: boolean;
    }
  }
}

function getUserIdentifier(req: Request): string {
  const sessionId = req.headers["x-session-id"] as string;

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

// Main usage limiting middleware
export const usageLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = getUserIdentifier(req);
    req.userIdentifier = identifier;

    // Atomic consume happens HERE
    const result = await database.consumeUsage(identifier);

    if (!result.canProceed) {
      return res.status(429).json({
        error: "Usage limit exceeded",
        reason: result.reason,
        message: result.message,
        remainingFree: result.remainingFree,
        adCredits: result.adCredits,
        requiresAd: result.reason === "need_to_watch_ad",
      });
    }

    req.userUsage = result;
    req.usageConsumed = true;

    next();
  } catch (e) {
    console.error("usageLimitMiddleware error:", e);
    return res.status(500).json({
      error: "Internal server error",
      message: "Unable to check usage limits",
    });
  }
};

export default usageLimitMiddleware;

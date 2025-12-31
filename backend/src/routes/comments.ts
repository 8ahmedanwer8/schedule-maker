import express, { Request, Response } from "express";
import { database } from "../database";

const router = express.Router();

// Helper to get user identifier (reuse from your existing code)
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

// Get comments
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const comments = await database.getComments(limit, offset);

    // Format timestamps for frontend
    const formattedComments = comments.map((comment) => ({
      ...comment,
      timeAgo: getTimeAgo(new Date(comment.created_at)),
    }));

    res.json({
      success: true,
      comments: formattedComments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch comments",
    });
  }
});

// Post a new comment
router.post("/", async (req: Request, res: Response) => {
  try {
    const { comment } = req.body;
    const identifier = getUserIdentifier(req);

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Comment cannot be empty",
      });
    }

    if (comment.length > 300) {
      return res.status(400).json({
        success: false,
        error: "Comment must be under 300 characters",
      });
    }

    const success = await database.addComment(identifier, comment);

    if (!success) {
      return res.status(429).json({
        success: false,
        error: "You've reached the daily comment limit (3 per day)",
      });
    }

    res.json({
      success: true,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add comment",
    });
  }
});

// Helper function to format time
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export default router;

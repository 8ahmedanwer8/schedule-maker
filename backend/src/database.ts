import sqlite3 from "sqlite3";
import { promisify } from "util";
import path from "path";

// Enable verbose mode for debugging
const sqlite = sqlite3.verbose();

class Database {
  private db: sqlite3.Database;
  private runAsync: (sql: string, params?: any[]) => Promise<any>;
  private getAsync: (sql: string, params?: any[]) => Promise<any>;
  private allAsync: (sql: string, params?: any[]) => Promise<any[]>;

  constructor() {
    const dbPath = path.join(__dirname, "../data/usage.db");
    this.db = new sqlite.Database(dbPath);

    // Promisify database methods
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.getAsync = promisify(this.db.get.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));

    this.initialize();
  }
  // database.ts (inside class Database)

  // Small helper to run an atomic transaction
  private async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.runAsync("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      await this.runAsync("COMMIT");
      return result;
    } catch (e) {
      await this.runAsync("ROLLBACK");
      throw e;
    }
  }

  // Atomically: reset daily if needed, then consume 1 usage (free OR ad credit)
  async consumeUsage(identifier: string): Promise<ConsumeUsageResult> {
    const dailyFreeLimit =
      parseInt(await this.getSetting("daily_free_limit")) || 2;
    const maxDailyUsage =
      parseInt(await this.getSetting("max_daily_usage")) || 10;

    const today = new Date().toISOString().slice(0, 10);

    return this.withTransaction(async () => {
      // Get or create user row (inside tx)
      let user = await this.getAsync(
        "SELECT * FROM users_usage WHERE identifier = ?",
        [identifier]
      );

      if (!user) {
        await this.runAsync(
          `
        INSERT INTO users_usage (identifier, daily_count, total_count, last_reset_date, ad_credits)
        VALUES (?, 0, 0, ?, 0)
        `,
          [identifier, today]
        );

        user = await this.getAsync(
          "SELECT * FROM users_usage WHERE identifier = ?",
          [identifier]
        );
      }

      // Daily reset if date changed
      if (user.last_reset_date !== today) {
        await this.runAsync(
          `
        UPDATE users_usage
        SET daily_count = 0,
            last_reset_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE identifier = ?
        `,
          [today, identifier]
        );
        user.daily_count = 0;
        user.last_reset_date = today;
      }

      // Hard cap
      if (user.daily_count >= maxDailyUsage) {
        return {
          canProceed: false,
          reason: "max_daily_exceeded",
          remainingFree: 0,
          adCredits: user.ad_credits,
          usedCredit: false,
          message: `Maximum daily usage (${maxDailyUsage}) exceeded. Please try again tomorrow.`,
        };
      }

      // Free use
      if (user.daily_count < dailyFreeLimit) {
        await this.runAsync(
          `
        UPDATE users_usage
        SET daily_count = daily_count + 1,
            total_count = total_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE identifier = ?
        `,
          [identifier]
        );

        const dailyAfter = user.daily_count + 1;
        return {
          canProceed: true,
          reason: "within_free_limit",
          remainingFree: Math.max(0, dailyFreeLimit - dailyAfter),
          adCredits: user.ad_credits,
          usedCredit: false,
        };
      }

      // Paid/ad credit use
      if (user.ad_credits > 0) {
        // Guard with AND ad_credits > 0 to prevent underflow
        const result = await this.runAsync(
          `
        UPDATE users_usage
        SET daily_count = daily_count + 1,
            total_count = total_count + 1,
            ad_credits = ad_credits - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE identifier = ?
          AND ad_credits > 0
        `,
          [identifier]
        );

        // If somehow it didn't update, treat as no credits
        if (result?.changes === 0) {
          return {
            canProceed: false,
            reason: "need_to_watch_ad",
            remainingFree: 0,
            adCredits: 0,
            usedCredit: false,
            message:
              "Free daily limit reached. Please watch an ad to continue.",
          };
        }

        return {
          canProceed: true,
          reason: "using_ad_credit",
          remainingFree: 0,
          adCredits: user.ad_credits - 1,
          usedCredit: true,
        };
      }

      // No free + no credits
      return {
        canProceed: false,
        reason: "need_to_watch_ad",
        remainingFree: 0,
        adCredits: 0,
        usedCredit: false,
        message: "Free daily limit reached. Please watch an ad to continue.",
      };
    });
  }

  // Refund 1 usage if the downstream request fails
  async refundUsage(identifier: string, usedCredit: boolean): Promise<boolean> {
    try {
      await this.withTransaction(async () => {
        await this.runAsync(
          `
        UPDATE users_usage
        SET daily_count = CASE WHEN daily_count > 0 THEN daily_count - 1 ELSE 0 END,
            total_count = CASE WHEN total_count > 0 THEN total_count - 1 ELSE 0 END,
            ad_credits = ad_credits + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE identifier = ?
        `,
          [usedCredit ? 1 : 0, identifier]
        );
      });
      return true;
    } catch (e) {
      console.error("Error refunding usage:", e);
      return false;
    }
  }

  // Fix your /reset route by exposing a public method
  async resetUserUsage(identifier: string): Promise<boolean> {
    try {
      await this.runAsync(
        `
      UPDATE users_usage
      SET daily_count = 0,
          ad_credits = 0,
          last_reset_date = date('now'),
          updated_at = CURRENT_TIMESTAMP
      WHERE identifier = ?
      `,
        [identifier]
      );
      return true;
    } catch (e) {
      console.error("Error resetting user usage:", e);
      return false;
    }
  }

  private async initialize() {
    try {
      // Create users_usage table
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS users_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          identifier TEXT UNIQUE NOT NULL,
          daily_count INTEGER DEFAULT 0,
          total_count INTEGER DEFAULT 0,
          last_reset_date TEXT DEFAULT (date('now')),
          ad_credits INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create app_settings table for dynamic configuration
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create ad_views table to track ad completions
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS ad_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          identifier TEXT NOT NULL,
          ad_network TEXT,
          credits_earned INTEGER DEFAULT 1,
          viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create comments table for user feedback
      await this.runAsync(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

      // Create index for faster queries
      await this.runAsync(`
      CREATE INDEX IF NOT EXISTS idx_comments_created_at 
      ON comments(created_at DESC)
    `);

      // Initialize default settings
      await this.initializeDefaultSettings();

      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  private async initializeDefaultSettings() {
    const defaultSettings = [
      { key: "daily_free_limit", value: "2" },
      { key: "credits_per_ad", value: "1" },
      { key: "max_daily_usage", value: "10" },
      { key: "auto_adjust_limits", value: "true" },
    ];

    for (const setting of defaultSettings) {
      await this.runAsync(
        `
        INSERT OR IGNORE INTO app_settings (key, value) 
        VALUES (?, ?)
      `,
        [setting.key, setting.value]
      );
    }
  }

  // Get or create user usage record
  async getUserUsage(identifier: string): Promise<UserUsage | null> {
    try {
      let user = await this.getAsync(
        "SELECT * FROM users_usage WHERE identifier = ?",
        [identifier]
      );

      if (!user) {
        // Create new user record
        await this.runAsync(
          `
          INSERT INTO users_usage (identifier, daily_count, total_count) 
          VALUES (?, 0, 0)
        `,
          [identifier]
        );

        user = await this.getAsync(
          "SELECT * FROM users_usage WHERE identifier = ?",
          [identifier]
        );
      } else {
        // Check if we need to reset daily count
        const today = new Date().toISOString().split("T")[0];
        if (user.last_reset_date !== today) {
          await this.runAsync(
            `
            UPDATE users_usage 
            SET daily_count = 0, last_reset_date = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE identifier = ?
          `,
            [today, identifier]
          );

          user.daily_count = 0;
          user.last_reset_date = today;
        }
      }

      return user;
    } catch (error) {
      console.error("Error getting user usage:", error);
      return null;
    }
  }

  // Increment usage count
  async incrementUsage(identifier: string): Promise<boolean> {
    try {
      await this.runAsync(
        `
        UPDATE users_usage 
        SET daily_count = daily_count + 1, 
            total_count = total_count + 1, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE identifier = ?
      `,
        [identifier]
      );
      return true;
    } catch (error) {
      console.error("Error incrementing usage:", error);
      return false;
    }
  }

  // Record ad view and add credits
  async recordAdView(
    identifier: string,
    adNetwork: string = "default"
  ): Promise<boolean> {
    try {
      const creditsPerAd = await this.getSetting("credits_per_ad");
      const credits = parseInt(creditsPerAd) || 1;

      // Record the ad view
      await this.runAsync(
        `
        INSERT INTO ad_views (identifier, ad_network, credits_earned) 
        VALUES (?, ?, ?)
      `,
        [identifier, adNetwork, credits]
      );

      // Add credits to user
      await this.runAsync(
        `
        UPDATE users_usage 
        SET ad_credits = ad_credits + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE identifier = ?
      `,
        [credits, identifier]
      );

      return true;
    } catch (error) {
      console.error("Error recording ad view:", error);
      return false;
    }
  }

  // Use ad credits
  async useAdCredit(identifier: string): Promise<boolean> {
    try {
      const user = await this.getUserUsage(identifier);
      if (!user || user.ad_credits < 1) {
        return false;
      }

      await this.runAsync(
        `
        UPDATE users_usage 
        SET ad_credits = ad_credits - 1, updated_at = CURRENT_TIMESTAMP 
        WHERE identifier = ?
      `,
        [identifier]
      );

      return true;
    } catch (error) {
      console.error("Error using ad credit:", error);
      return false;
    }
  }

  // Get app setting
  async getSetting(key: string): Promise<string> {
    try {
      const result = await this.getAsync(
        "SELECT value FROM app_settings WHERE key = ?",
        [key]
      );
      return result ? result.value : "";
    } catch (error) {
      console.error("Error getting setting:", error);
      return "";
    }
  }
  // Get recent comments (paginated)
  async getComments(limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const comments = await this.allAsync(
        `
      SELECT 
        comment,
        created_at,
        SUBSTR(identifier, 1, 8) as user_id
      FROM comments 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
      `,
        [limit, offset]
      );
      return comments || [];
    } catch (error) {
      console.error("Error getting comments:", error);
      return [];
    }
  }
  // Update app setting
  async updateSetting(key: string, value: string): Promise<boolean> {
    try {
      await this.runAsync(
        `
        INSERT OR REPLACE INTO app_settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
        [key, value]
      );
      return true;
    } catch (error) {
      console.error("Error updating setting:", error);
      return false;
    }
  }

  // Add a new comment
  async addComment(identifier: string, comment: string): Promise<boolean> {
    try {
      // Sanitize and validate comment
      const cleanComment = comment.trim().slice(0, 300);

      if (!cleanComment) {
        return false;
      }

      // Check rate limiting (max 3 comments per day per user)
      const today = new Date().toISOString().slice(0, 10);
      const recentCount = await this.getAsync(
        `
      SELECT COUNT(*) as count 
      FROM comments 
      WHERE identifier = ? 
      AND DATE(created_at) = ?
      `,
        [identifier, today]
      );

      if (recentCount && recentCount.count >= 3) {
        console.log("User has reached daily comment limit");
        return false;
      }

      await this.runAsync(
        `
      INSERT INTO comments (identifier, comment) 
      VALUES (?, ?)
      `,
        [identifier, cleanComment]
      );

      return true;
    } catch (error) {
      console.error("Error adding comment:", error);
      return false;
    }
  }

  // Get comment stats
  async getCommentStats(): Promise<any> {
    try {
      const stats = await this.getAsync(`
      SELECT 
        COUNT(*) as total_comments,
        COUNT(DISTINCT identifier) as unique_users,
        COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as today_comments
      FROM comments
    `);
      return stats;
    } catch (error) {
      console.error("Error getting comment stats:", error);
      return null;
    }
  }

  // Get usage statistics
  async getUsageStats() {
    try {
      const today = new Date().toISOString().split("T")[0];

      const dailyStats = await this.getAsync(
        `
        SELECT 
          COUNT(*) as total_users,
          SUM(daily_count) as total_daily_requests,
          AVG(daily_count) as avg_requests_per_user
        FROM users_usage 
        WHERE last_reset_date = ?
      `,
        [today]
      );

      const adStats = await this.getAsync(
        `
        SELECT 
          COUNT(*) as total_ads_viewed,
          SUM(credits_earned) as total_credits_earned
        FROM ad_views 
        WHERE date(viewed_at) = ?
      `,
        [today]
      );

      return {
        daily: dailyStats,
        ads: adStats,
      };
    } catch (error) {
      console.error("Error getting usage stats:", error);
      return null;
    }
  }

  close() {
    this.db.close();
  }
}

// Add this interface near your other exports/types
export interface ConsumeUsageResult {
  canProceed: boolean;
  reason:
    | "within_free_limit"
    | "using_ad_credit"
    | "need_to_watch_ad"
    | "max_daily_exceeded";
  remainingFree: number;
  adCredits: number;
  usedCredit: boolean;
  message?: string;
}

export interface UserUsage {
  id: number;
  identifier: string;
  daily_count: number;
  total_count: number;
  last_reset_date: string;
  ad_credits: number;
  created_at: string;
  updated_at: string;
}

export const database = new Database();
export default database;

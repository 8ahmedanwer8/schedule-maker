import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import OpenAI from "openai";
import {
  GET_SCHEDULE_PROMPT,
  USER_INPUT,
  GET_SCHEDULE_PROMPT_SHORT,
  RESPONSE,
} from "./prompt";
import { usageLimitMiddleware } from "./middleware/usageLimit";
import usageRoutes from "./routes/usage";
import commentRoutes from "./routes/comments";
import { database } from "./database";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Toggle between real OpenAI API and mock data
const USE_REAL_API =
  process.env.OPENAI_API_KEY && process.env.USE_OPENAI === "true";

app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "x-session-id"],
  })
);
app.use(bodyParser.json());

// Add usage routes
app.use("/api/usage", usageRoutes);
app.use("/api/comments", commentRoutes);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Route to handle the POST request to ChatGPT with usage limiting
app.post(
  "/api/chat",
  usageLimitMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      console.log("reached");

      const userInput = prompt && prompt.trim() ? prompt : USER_INPUT;
      const fullPrompt = GET_SCHEDULE_PROMPT + userInput;

      let scheduleData;
      console.log(USE_REAL_API);
      if (USE_REAL_API) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that converts text into structured schedule data. Always return valid JSON only.",
              },
              { role: "user", content: fullPrompt },
            ],
            max_tokens: 1000,
            temperature: 0.3,
          });

          const content = response.choices[0].message.content || "[]";
          scheduleData = JSON.parse(content);
        } catch (apiError) {
          console.error("OpenAI API error:", apiError);
          scheduleData = JSON.parse(RESPONSE);
        }
      } else {
        scheduleData = JSON.parse(RESPONSE);
      }

      const mutatedData = scheduleData.map((classItem: any) => ({
        title: `${classItem.title}`,
        instructors: `${classItem.instructors?.join(", ")}`,
        location: `@${classItem.location}`,
        start: classItem.start,
        end: classItem.end,
      }));

      res.json({
        schedule: mutatedData,
        usage: {
          remainingFree: req.userUsage?.remainingFree ?? 0,
          adCredits: req.userUsage?.adCredits ?? 0,
          usedCredit: req.userUsage?.usedCredit ?? false,
        },
      });
    } catch (error) {
      console.error("Error in /api/chat:", error);

      // Refund only if we successfully consumed earlier
      if (req.usageConsumed && req.userIdentifier) {
        await database.refundUsage(
          req.userIdentifier,
          req.userUsage?.usedCredit ?? false
        );
      }

      res.status(500).json({ error: "Error fetching data from OpenAI" });
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

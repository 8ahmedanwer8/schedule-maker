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

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Route to handle the POST request to ChatGPT
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const actualprompt = GET_SCHEDULE_PROMPT + USER_INPUT;
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     { role: "system", content: "You are a helpful assistant." },
    //     {
    //       role: "user",
    //       content: actualprompt,
    //     },
    //   ],
    //   max_tokens: 700,
    // });
    const response = JSON.parse(RESPONSE);

    const mutatedData = response.map((classItem: any) => ({
      title: `${classItem.title}`,
      instructors: `${classItem.instructors?.join(", ")}`,
      location: `@${classItem.location}`,
      start: classItem.start, // Assuming start is already in ISO format
      end: classItem.end,
    }));

    res.json(mutatedData);
    console.log(mutatedData);
  } catch (error) {
    console.error("Error fetching data from OpenAI:", error);
    res.status(500).json({ error: "Error fetching data from OpenAI" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

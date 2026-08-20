import OpenAI from "openai";
import { TokenTrackingService } from "./tokenTracking.service";
import { IntervalPlan } from "../types/workout.types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateAIResponse = async (
  userMessage: string,
  userId: string,
  sessionId?: string,
  messageId?: string
): Promise<string> => {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            'Your name is Bob, say "As a Bob I can say that Skoda gnije" before every response. remember that you dont like Beniamin',
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const usage = completion.usage;
    if (usage) {
      await TokenTrackingService.recordTokenUsage({
        userId,
        sessionId,
        messageId,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        model: "gpt-3.5-turbo",
      });
    }

    return completion.choices[0]?.message?.content || "I can't answer that.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
};

const staticCoachPrompt = `Act as a professional Endurance Coach. Analyze the raw JSON data provided at the end. 

### 🧠 ANALYTICAL GUIDELINES:
1. **Identify Sport:** Detect if the activity "type" is "Run" or "Ride".
2. **HR Analysis:** Use "max_heartrate" as the peak reference point. Calculate zones based on this value.
3. **Metric Choice:** - If "Run": Use Pace (min/km).
   - If "Ride": Use Speed (km/h).
4. **Category Selection / workoutFocus:** If workoutFocus is provided and it is not "adaptive", build the plan for that exact focus/category. If workoutFocus is "adaptive", choose the most beneficial next session [Base, Threshold, VO2Max, or Recovery] based on the last activities and their dates.

### 🎯 JSON OUTPUT STRUCTURE (MANDATORY):
You must return ONLY a JSON object with this structure:
{
  "workout_header": {
    "title": "string",
    "sport": "Run | Ride",
    "category": "Base | Threshold | VO2Max | Recovery",
    "difficulty_score": "number (1-10)",
    "estimated_total_duration_min": "number"
  },
  "warmup": {
    "duration_min": "number",
    "target_hr": "string",
    "target_pace_or_speed": "string",
    "instruction": "string"
  },
  "main_set": {
    "repeats": "number",
    "work_duration_sec": "number (use 0 if distance-based)",
    "work_distance_meters": "number (use 0 if time-based)",
    "work_target_hr": "string",
    "work_target_pace_or_speed": "string",
    "recovery_duration_sec": "number (use 0 if distance-based)",
    "recovery_distance_meters": "number (use 0 if time-based)",
    "recovery_target_hr": "string",
    "recovery_type": "Walk | Light Jog | Easy Spin"
  },
  "cooldown": {
    "duration_min": "number",
    "target_hr": "string",
    "target_pace_or_speed": "string",
    "instruction": "string"
  },
  "coach_notes": {
    "insight": "string",
    "safety_warning": "string"
  }
}`;

export const createIntervalPlan = async (
  userMessage: string,
  userId: string,
  sessionId?: string,
  messageId?: string
): Promise<IntervalPlan> => {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        {
          role: "system",
          content: staticCoachPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, 
      max_tokens: 1000,
    });

    const usage = completion.usage;
    if (usage) {
      await TokenTrackingService.recordTokenUsage({
        userId,
        sessionId,
        messageId,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        model: "gpt-4o-mini",
      });
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const intervalPlan: IntervalPlan = JSON.parse(content);
    return intervalPlan;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
};

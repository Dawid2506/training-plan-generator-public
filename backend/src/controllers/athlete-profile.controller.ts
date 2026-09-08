import { Request, Response } from "express";
import { ZodError } from "zod";
import * as athleteProfileService from "../services/athlete-profile.service";
import { athleteProfileSchema } from "../utils/athlete-profile.validation";

export const getAthleteProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const profile = await athleteProfileService.getProfile(userId);

    // An athlete who has never filled the form in is not an error - the client
    // renders an empty form and the coach says which fields it is missing.
    res.status(200).json({
      profile,
      missingFields: athleteProfileService.missingProfileFields(profile),
    });
  } catch (error) {
    console.error("Error reading athlete profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateAthleteProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const input = athleteProfileSchema.parse(req.body);
    const profile = await athleteProfileService.upsertProfile(userId, input);

    res.status(200).json({
      profile,
      missingFields: athleteProfileService.missingProfileFields(profile),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Invalid profile data",
        code: "VALIDATION_ERROR",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    console.error("Error updating athlete profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

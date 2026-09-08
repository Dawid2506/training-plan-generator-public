import { Request, Response } from "express";
import { ActivityFileService } from "../services/activityFile.service";
import { createIntervalPlan } from "../services/openai.service";
import { TrainingPlanService } from "../services/trainingPlan.service";
import { ActivityAnalysisEntry } from "../types/activity-analysis.types";
import { getInteger, getString } from "../utils/request";

const SUPPORTED_EXTENSIONS = new Set(["fit"]);

const MAX_PLAN_ACTIVITIES = 20;

// The coach prompt matches these lowercase values, "adaptive" included.
const SUPPORTED_WORKOUT_FOCUS = new Set([
	"adaptive",
	"base",
	"threshold",
	"vo2max",
	"recovery",
]);

const getFileExtension = (fileName: string): string => {
	const parts = fileName.toLowerCase().split(".");
	return parts.length > 1 ? parts[parts.length - 1] : "";
};

const getWorkoutFocus = (value: unknown): string => {
	if (typeof value !== "string" || !value.trim()) {
		return "Base";
	}

	return value.trim();
};

const validateUploadedFile = (file?: Express.Multer.File): string | null => {
	if (!file) {
		return "File is required";
	}

	if (!file.originalname) {
		return "File name is missing";
	}

	if (!file.buffer?.length) {
		return "Uploaded file is empty";
	}

	const extension = getFileExtension(file.originalname);

	if (!SUPPORTED_EXTENSIONS.has(extension)) {
		return "Unsupported file format";
	}

	return null;
};

export const parseUserActivityFile = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const validationError = validateUploadedFile(req.file);

		if (validationError) {
			res.status(400).json({ success: false, error: validationError });
			return;
		}

		const file = req.file as Express.Multer.File;
		const parser = require("../services/activity-parsers/registry").getParserForFile(
			file.originalname
		);
		const parsed = await parser.parse({
			buffer: file.buffer,
			fileName: file.originalname,
		});

		res.status(200).json({ success: true, data: parsed.analysis });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Parsing failed";
		res.status(422).json({ success: false, error: message });
	}
};

export const parseAndSaveUserActivityFile = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ success: false, error: "Unauthorized" });
			return;
		}

		const validationError = validateUploadedFile(req.file);

		if (validationError) {
			res.status(400).json({ success: false, error: validationError });
			return;
		}

		const file = req.file as Express.Multer.File;
		const workoutFocus = getWorkoutFocus(req.body?.workoutFocus);
		const payload = await ActivityFileService.parseFile({
			buffer: file.buffer,
			fileName: file.originalname,
			workoutFocus,
		});

		const format = getFileExtension(file.originalname);
		const savedActivity = await ActivityFileService.saveParsedActivity({
			userId,
			fileName: file.originalname,
			format,
			workoutFocus,
			payload,
		});

		res.status(201).json({
			success: true,
			data: payload,
			saved: {
				id: savedActivity.id,
				createdAt: savedActivity.createdAt,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Parsing failed";
		res.status(422).json({ success: false, error: message });
	}
};

export const getAllUserActivities = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ success: false, error: "Unauthorized" });
			return;
		}

		// The list can be read either way round: by when the activity was done
		// (the default) or by when it was imported.
		const orderBy =
			getString(req.query.sort) === "import" ? "createdAt" : "startedAt";

		const activities = await ActivityFileService.getUserActivities(userId, {
			orderBy,
		});

		const data = activities.map((item: any) => {
			const payload = item.payload as {
				analysisData?: Array<{ activity?: unknown }>;
			};
			const activity = payload?.analysisData?.[0]?.activity ?? null;

			return {
				id: item.id,
				sourceType: item.sourceType,
				sourceFileName: item.sourceFileName,
				format: item.format,
				workoutFocus: item.workoutFocus,
				createdAt: item.createdAt,
				startedAt: item.startedAt,
				activityId: item.externalActivityId ? Number(item.externalActivityId) : null,
				activity,
			};
		});

		res.status(200).json({ success: true, data });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to fetch activities";
		res.status(500).json({ success: false, error: message });
	}
};

const getPlanWorkoutFocus = (value: unknown): string | null => {
	const focus = getString(value)?.toLowerCase();

	if (!focus || !SUPPORTED_WORKOUT_FOCUS.has(focus)) {
		return null;
	}

	return focus;
};

const collectAnalysisData = (activities: Array<{ payload?: unknown }>): ActivityAnalysisEntry[] =>
	activities.flatMap((activity) => ActivityFileService.getAnalysisEntries(activity.payload));

const generateAndSavePlan = async (params: {
	userId: string;
	workoutFocus: string;
	analysisData: ActivityAnalysisEntry[];
	res: Response;
}): Promise<void> => {
	const { analysisData, res, userId, workoutFocus } = params;

	if (analysisData.length === 0) {
		res.status(404).json({
			success: false,
			error: "No imported activities with analysis data were found",
		});
		return;
	}

	const payloadForPlan = {
		workoutFocus,
		analysisData,
	};

	const intervalPlan = await createIntervalPlan(JSON.stringify(payloadForPlan), userId);

	await TrainingPlanService.saveGeneratedPlan({
		userId,
		plan: intervalPlan,
	});

	res.json({
		success: true,
		data: intervalPlan,
	});
};

/**
 * POST /api/user/activities/certain-activities/:focus/create-plan
 * Builds an interval plan from hand-picked activities imported from files.
 */
export const getIntervalPlanForCertainFileActivities = async (
	req: Request,
	res: Response
): Promise<void> => {
	const workoutFocus = getPlanWorkoutFocus(req.params.focus);

	if (!workoutFocus) {
		res.status(400).json({ success: false, error: "Invalid workout focus" });
		return;
	}

	const rawActivityIds = req.body?.activityIds;

	if (!Array.isArray(rawActivityIds) || rawActivityIds.length === 0) {
		res.status(400).json({
			success: false,
			error: "activityIds must be a non-empty array",
		});
		return;
	}

	if (rawActivityIds.length > MAX_PLAN_ACTIVITIES) {
		res.status(400).json({
			success: false,
			error: `Too many activity IDs. Maximum is ${MAX_PLAN_ACTIVITIES}`,
		});
		return;
	}

	const activityIds = [
		...new Set(
			rawActivityIds
				.filter((value: unknown): value is string => typeof value === "string")
				.map((value: string) => value.trim())
				.filter((value: string) => value.length > 0)
		),
	];

	if (activityIds.length === 0) {
		res.status(400).json({
			success: false,
			error: "activityIds contains no valid IDs",
		});
		return;
	}

	try {
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, error: "Unauthorized" });
			return;
		}

		const activities = await ActivityFileService.getFileActivitiesByIds({
			userId,
			activityIds,
		});

		if (activities.length === 0) {
			res.status(404).json({
				success: false,
				error: "No imported activities were found for the given IDs",
			});
			return;
		}

		await generateAndSavePlan({
			userId,
			workoutFocus,
			analysisData: collectAnalysisData(activities),
			res,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		res.status(500).json({
			success: false,
			error: `Creating interval plan failed: ${message}`,
		});
	}
};

/**
 * POST /api/user/activities/last-activities/:focus/:type/:count/create-plan
 * Builds an interval plan from the most recently imported activities of one sport.
 */
export const getIntervalPlanForLastFileActivities = async (
	req: Request,
	res: Response
): Promise<void> => {
	const workoutFocus = getPlanWorkoutFocus(req.params.focus);

	if (!workoutFocus) {
		res.status(400).json({ success: false, error: "Invalid workout focus" });
		return;
	}

	const count = getInteger(req.params.count);

	if (count === undefined || count <= 0 || count > MAX_PLAN_ACTIVITIES) {
		res.status(400).json({ success: false, error: "Invalid count parameter" });
		return;
	}

	try {
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({ success: false, error: "Unauthorized" });
			return;
		}

		const activities = await ActivityFileService.getRecentFileActivities({
			userId,
			activityType: getString(req.params.type),
			count,
		});

		if (activities.length === 0) {
			res.status(404).json({
				success: false,
				error: "No imported activities match the selected sport",
			});
			return;
		}

		await generateAndSavePlan({
			userId,
			workoutFocus,
			analysisData: collectAnalysisData(activities),
			res,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		res.status(500).json({
			success: false,
			error: `Creating interval plan failed: ${message}`,
		});
	}
};

import { Request, Response } from "express";
import { ActivityFileService } from "../services/activityFile.service";

const SUPPORTED_EXTENSIONS = new Set(["fit"]);

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

		const activities = await ActivityFileService.getUserActivities(userId);

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

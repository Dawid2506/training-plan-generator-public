/* eslint-disable @typescript-eslint/no-var-requires */
import {
  buildActivityFromSession,
  buildDataPoints,
  buildSplitsFromDataPoints,
} from "../../core/analysis-normalizer";
import {
  ActivityFileParser,
  ParseActivityFileInput,
  ParseActivityFileOutput,
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FitParserModule = require("fit-file-parser");
const FitParser = FitParserModule.default || FitParserModule;

type FitDecodedPayload = {
  records?: Array<Record<string, unknown>>;
  sessions?: Array<Record<string, unknown>>;
  sports?: Array<Record<string, unknown>>;
};

const getExtension = (fileName: string): string => {
  const fileParts = fileName.toLowerCase().split(".");
  return fileParts.length > 1 ? fileParts[fileParts.length - 1] : "";
};

export class FitActivityParser implements ActivityFileParser {
  readonly format = "fit";

  canParse(fileName: string): boolean {
    return getExtension(fileName) === this.format;
  }

  async parse(input: ParseActivityFileInput): Promise<ParseActivityFileOutput> {
    const decoded = await this.decode(input.buffer);
    const records = decoded.records || [];

    if (!records.length) {
      throw new Error("FIT file has no record messages");
    }

    const dataPoints = buildDataPoints(records);

    if (!dataPoints.length) {
      throw new Error("FIT file has no valid timestamped records");
    }

    const splits = buildSplitsFromDataPoints(dataPoints);
    const sportName = String(decoded.sports?.[0]?.sport || "Ride");
    const activity = buildActivityFromSession(decoded.sessions || [], sportName);

    return {
      analysis: {
        streams: {
          dataPoints,
          splits,
        },
        activity,
      },
    };
  }

  private decode(buffer: Buffer): Promise<FitDecodedPayload> {
    return new Promise((resolve, reject) => {
      const parser = new FitParser({
        force: true,
        speedUnit: "m/s",
        lengthUnit: "m",
        temperatureUnit: "celsius",
        elapsedRecordField: true,
        mode: "list",
      });

      parser.parse(buffer, (error: Error | null, data: FitDecodedPayload) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(data || {});
      });
    });
  }
}

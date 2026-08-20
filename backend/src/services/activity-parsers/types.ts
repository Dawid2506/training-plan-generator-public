import { ActivityAnalysisEntry } from "../../types/activity-analysis.types";

export interface ParseActivityFileInput {
  buffer: Buffer;
  fileName: string;
}

export interface ParseActivityFileOutput {
  analysis: ActivityAnalysisEntry;
}

export interface ActivityFileParser {
  readonly format: string;
  canParse(fileName: string): boolean;
  parse(input: ParseActivityFileInput): Promise<ParseActivityFileOutput>;
}

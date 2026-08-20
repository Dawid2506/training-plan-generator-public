import { ActivityFileParser } from "./types";
import { FitActivityParser } from "./parsers/fit/fit-activity.parser";

const parsers: ActivityFileParser[] = [new FitActivityParser()];

export const getParserForFile = (fileName: string): ActivityFileParser => {
  const parser = parsers.find((item) => item.canParse(fileName));

  if (!parser) {
    throw new Error("Unsupported activity file format");
  }

  return parser;
};

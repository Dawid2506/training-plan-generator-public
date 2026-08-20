declare module "fit-file-parser" {
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: "list" | "cascade" | string;
  }

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(
      buffer: Buffer,
      callback: (error: Error | null, data: any) => void
    ): void;
  }

  export = FitParser;
}

import { mergeConfig, type UserConfigExport } from "vitest/config";
import shared from "../../vitest.config.js";

const config: UserConfigExport = {
  test: { includeSource: ["src/**/*.ts"] }
};

export default mergeConfig(shared, config);

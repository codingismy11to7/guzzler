import * as path from "node:path";
import { type ViteUserConfig, configDefaults } from "vitest/config";

const alias = (name: string) => {
  const target = process.env.TEST_DIST !== undefined ? "dist/dist/esm" : "src";
  return ({
    [`${name}/test`]: path.join(__dirname, "packages", name, "test"),
    [`${name}`]: path.join(__dirname, "packages", name, target)
  });
};

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: ViteUserConfig = {
  esbuild: {
    target: "es2020"
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"]
  },
  test: {
    setupFiles: [path.join(__dirname, "setupTests.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [...configDefaults.exclude, "**/dist/**", "**/build/**", "**/*.js"]
    },
    alias: {
      ...alias("domain"),
      ...alias("mongodb"),
      ...alias("server"),
      ...alias("webui")
    }
  }
};

export default config;

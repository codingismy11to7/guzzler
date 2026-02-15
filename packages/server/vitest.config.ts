import * as path from "node:path";
import { defineProject } from "vitest/config";

const packagesDir = path.resolve(import.meta.dirname, "..");

const alias = (pkg: string) => ({
  [`@guzzlerapp/${pkg}`]: path.join(packagesDir, pkg, "src"),
});

export default defineProject({
  resolve: {
    alias: {
      ...alias("domain"),
      ...alias("mongodb"),
      ...alias("utils"),
    },
  },
  test: {
    environment: "node",
  },
});

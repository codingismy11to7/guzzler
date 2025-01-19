import * as fs from "node:fs";
import * as path from "node:path";

// @ts-ignore
const __dirname = import.meta.dirname;

const pkg = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "..", "packages", "server", "package.json"),
    { encoding: "utf8" },
  ),
);

// eslint-disable-next-line no-console
console.log(pkg.version);

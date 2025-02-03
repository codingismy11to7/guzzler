import * as Glob from "glob";
import * as Fs from "node:fs";

const deleteNodeModules = process.argv.includes("-nm");

const dirs = [".", ...Glob.sync("packages/*/")];
dirs.forEach(pkg => {
  const files = [
    ".eslintcache",
    ".tsbuildinfo",
    "build",
    "dist",
    "coverage",
    ...(deleteNodeModules ? ["node_modules"] : []),
  ];

  files.forEach(file => {
    Fs.rmSync(`${pkg}/${file}`, { recursive: true, force: true });
  });
});

import * as fs from "node:fs";
import * as path from "path";

const timeZones = Intl.supportedValuesOf("timeZone");

// @ts-ignore
const __dirname = import.meta.dirname;
const outFile = path.resolve(__dirname, "..", "packages", "domain", "src", "TimeZone.ts");

fs.writeFileSync(
  outFile,
  `import { Schema } from "effect";

export const TimeZone = Schema.Literal(${timeZones.map(i => `"${i}"`).join(",")});

export type TimeZone = typeof TimeZone.Encoded;

export const AllTimeZones = TimeZone.literals;
export const AllTimeZoneStrings: ReadonlyArray<string> = AllTimeZones;
export const isTimeZone = (x: string): x is TimeZone => AllTimeZoneStrings.includes(x);
`,
  {
    encoding: "utf8",
  },
);

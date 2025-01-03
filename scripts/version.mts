import * as child_process from "node:child_process"

child_process.spawnSync("npm", ["install"], { encoding: "utf8", stdio: "inherit" })


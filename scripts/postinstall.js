const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "..", "setup.log");
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + "\n");
};

try {
  log("Running prisma generate...");
  execSync("npx prisma generate", { stdio: "inherit", cwd: path.join(__dirname, "..") });
  log("prisma generate OK");
} catch (err) {
  log(`prisma generate FAILED: ${err.message}`);
  log("You can retry later with: npx prisma generate");
}

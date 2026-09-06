import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const outDir = join(root, "dist");
const zipPath = join(outDir, `inline-reader-${manifest.version}.zip`);
const files = ["manifest.json", "background", "content", "icons", "lib", "pages", "_locales"];

mkdirSync(outDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);

execFileSync("tar", ["-a", "-c", "-f", zipPath, ...files], {
  cwd: root,
  stdio: "inherit"
});

console.log(`Wrote ${zipPath}`);

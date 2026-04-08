const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");
const assetsRoot = path.join(projectRoot, "assets");
const publicRoot = path.join(projectRoot, "public");

function removeDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyIfExists(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath)) return;
  fs.cpSync(sourcePath, destPath, { recursive: true });
}

function copyHtmlFiles() {
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .forEach((entry) => {
      fs.copyFileSync(
        path.join(projectRoot, entry.name),
        path.join(distRoot, entry.name)
      );
    });
}

function writeRuntimeConfig() {
  const apiBaseUrl = String(process.env.FRONTEND_API_BASE || "").trim().replace(/\/$/, "");
  const runtimeConfigPath = path.join(distRoot, "assets", "js", "runtime-config.js");
  ensureDir(path.dirname(runtimeConfigPath));
  fs.writeFileSync(
    runtimeConfigPath,
    `window.__UEPP_CONFIG__ = Object.assign({}, window.__UEPP_CONFIG__, { apiBaseUrl: ${JSON.stringify(apiBaseUrl)} });\n`
  );
}

removeDir(distRoot);
ensureDir(distRoot);
copyHtmlFiles();
copyIfExists(assetsRoot, path.join(distRoot, "assets"));
copyIfExists(publicRoot, distRoot);
writeRuntimeConfig();

console.log("Frontend build complete.");

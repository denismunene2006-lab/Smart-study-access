import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";

const srcRoot = path.dirname(fileURLToPath(import.meta.url));

export const serverRoot = path.resolve(srcRoot, "..");
export const storageRoot = path.isAbsolute(config.storageRoot)
  ? config.storageRoot
  : path.resolve(serverRoot, config.storageRoot);
export const uploadsRoot = path.resolve(storageRoot, "uploads");
export const papersRoot = path.resolve(storageRoot, "papers");

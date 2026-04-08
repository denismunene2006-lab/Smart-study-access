import fs from "fs";
import { papersRoot, storageRoot, uploadsRoot } from "../paths.js";

const requiredDirectories = [storageRoot, uploadsRoot, papersRoot];

export function ensureStorageDirectories() {
  requiredDirectories.forEach((directory) => {
    fs.mkdirSync(directory, { recursive: true });
  });

  return [...requiredDirectories];
}

export function getStorageStatus() {
  try {
    ensureStorageDirectories();
    return {
      status: "ok",
      ready: true,
      paths: {
        root: storageRoot,
        uploads: uploadsRoot,
        papers: papersRoot
      }
    };
  } catch (error) {
    return {
      status: "error",
      ready: false,
      error: error.message
    };
  }
}

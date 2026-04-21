import { getConfigDiagnostics } from "../config.js";
import { checkDatabaseConnection } from "../db.js";
import { getMpesaConfigStatus } from "./mpesa.js";
import { getStorageStatus } from "./storage.js";

function buildWarnings(mpesaStatus, configWarnings) {
  const warnings = [...configWarnings];

  if (mpesaStatus.status === "disabled") {
    warnings.push("M-Pesa is disabled until the MPESA_* environment variables are added.");
  }

  if (mpesaStatus.status === "partial") {
    warnings.push(`M-Pesa configuration is incomplete: ${mpesaStatus.missing.join(", ")}.`);
  }

  return warnings;
}

export async function getHealthReport() {
  const configStatus = getConfigDiagnostics();
  const [databaseStatus, storageStatus] = await Promise.all([
    checkDatabaseConnection(),
    getStorageStatus()
  ]);
  const mpesaStatus = getMpesaConfigStatus();

  const ready = databaseStatus.ready && storageStatus.ready && configStatus.issues.length === 0;
  const warnings = buildWarnings(mpesaStatus, configStatus.warnings);

  return {
    status: ready ? (mpesaStatus.ready ? "ok" : "degraded") : "error",
    ready,
    timestamp: new Date().toISOString(),
    services: {
      database: databaseStatus,
      storage: storageStatus,
      mpesa: mpesaStatus
    },
    config: {
      issues: configStatus.issues,
      warnings
    }
  };
}

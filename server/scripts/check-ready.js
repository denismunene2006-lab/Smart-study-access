import { closeDatabaseConnection } from "../src/db.js";
import { getHealthReport } from "../src/services/health.js";

async function run() {
  const report = await getHealthReport();
  console.log(JSON.stringify(report, null, 2));

  if (!report.ready || report.services.mpesa.status === "partial") {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error("Readiness check failed.", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });

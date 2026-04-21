import express from "express";
import cors from "cors";
import { config, isOriginAllowed } from "./config.js";
import { connectToDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";
import papersRoutes from "./routes/papers.js";
import uploadsRoutes from "./routes/uploads.js";
import subscriptionsRoutes from "./routes/subscriptions.js";
import transactionsRoutes from "./routes/transactions.js";
import referralsRoutes from "./routes/referrals.js";
import adminRoutes from "./routes/admin.js";
import { getHealthReport } from "./services/health.js";

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    const error = new Error(`Origin ${origin} is not allowed by CORS.`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true
}));
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health/live", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", async (req, res) => {
  const report = await getHealthReport();
  res.status(report.ready ? 200 : 503).json(report);
});

app.get("/api/health/ready", async (req, res) => {
  const report = await getHealthReport();
  res.status(report.ready ? 200 : 503).json({
    ready: report.ready,
    status: report.status,
    timestamp: report.timestamp
  });
});

app.use("/api", async (req, res, next) => {
  try {
    await connectToDatabase();
    return next();
  } catch (error) {
    error.statusCode = 503;
    return next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/papers", papersRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  const statusCode = err?.statusCode || 500;
  const message = err?.message || "Server error";
  res.status(statusCode).json({ error: message });
});

async function startServer() {
  const report = await getHealthReport();
  report.config.warnings.forEach((warning) => {
    console.warn(`[startup] ${warning}`);
  });

  if (config.strictStartup && !report.ready) {
    const startupIssues = [
      ...report.config.issues,
      !report.services.database.ready
        ? `Database: ${report.services.database.error || report.services.database.status}.`
        : null,
      !report.services.storage.ready
        ? `Storage: ${report.services.storage.error || report.services.storage.status}.`
        : null
    ].filter(Boolean);

    throw new Error(`Strict startup is enabled. API is not ready: ${startupIssues.join(" ")}`);
  }

  app.listen(config.port, () => {
    console.log(`API running on port ${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start API", error);
  process.exit(1);
});

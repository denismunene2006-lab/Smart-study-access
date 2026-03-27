import express from "express";
import cors from "cors";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import papersRoutes from "./routes/papers.js";
import uploadsRoutes from "./routes/uploads.js";
import subscriptionsRoutes from "./routes/subscriptions.js";
import transactionsRoutes from "./routes/transactions.js";
import referralsRoutes from "./routes/referrals.js";
import adminRoutes from "./routes/admin.js";

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/papers", papersRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  const message = err?.message || "Server error";
  res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`API running on port ${config.port}`);
});

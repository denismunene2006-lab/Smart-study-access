import dotenv from "dotenv";

dotenv.config();

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);
const LOCAL_CORS_DEFAULTS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value, fallback = false) {
  const normalized = readString(value).toLowerCase();
  if (!normalized) return fallback;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value, fallback = []) {
  const parsed = readString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
}

const mongodbUri = readString(process.env.MONGODB_URI);
const corsOrigins = parseList(process.env.CORS_ORIGIN, LOCAL_CORS_DEFAULTS);
const renderExternalHostname = readString(process.env.RENDER_EXTERNAL_HOSTNAME);
const inferredMpesaCallbackUrl = renderExternalHostname
  ? `https://${renderExternalHostname}/api/subscriptions/mpesa/callback`
  : "";

export const config = {
  port: parseInteger(process.env.PORT, 4000),
  mongodbUri,
  databaseConfigured: Boolean(mongodbUri),
  databaseConfigSource: mongodbUri ? "MONGODB_URI" : null,
  mongodbDbName: readString(process.env.MONGODB_DB_NAME),
  mongodbServerSelectionTimeoutMs: parseInteger(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    5000
  ),
  jwtSecret: readString(process.env.JWT_SECRET) || "change_me",
  corsOrigins,
  corsAllowAnyOrigin: corsOrigins.includes("*"),
  strictStartup: parseBoolean(process.env.STRICT_STARTUP, false),
  storageRoot: readString(process.env.STORAGE_ROOT) || "storage",
  renderExternalHostname,
  mpesaEnv: readString(process.env.MPESA_ENV) || "sandbox",
  mpesaConsumerKey: readString(process.env.MPESA_CONSUMER_KEY),
  mpesaConsumerSecret: readString(process.env.MPESA_CONSUMER_SECRET),
  mpesaShortcode: readString(process.env.MPESA_SHORTCODE),
  mpesaPasskey: readString(process.env.MPESA_PASSKEY),
  mpesaCallbackUrl:
    readString(process.env.MPESA_CALLBACK_URL) || inferredMpesaCallbackUrl,
  mpesaAccountRef: readString(process.env.MPESA_ACCOUNT_REF) || "UEPPASTPAPERS",
  mpesaTransactionDesc:
    readString(process.env.MPESA_TRANSACTION_DESC) || "Past Papers Subscription"
};

export function isDefaultJwtSecret(value = config.jwtSecret) {
  return value === "change_me" || value === "local_dev_secret_change_me";
}

export function getConfigDiagnostics() {
  const issues = [];
  const warnings = [];

  if (!config.databaseConfigured) {
    issues.push("MongoDB is not configured. Set MONGODB_URI before deploying.");
  }

  if (isDefaultJwtSecret()) {
    warnings.push("JWT_SECRET is still using a placeholder value.");
  }

  if (config.corsAllowAnyOrigin) {
    warnings.push("CORS_ORIGIN allows any origin. Restrict this before production.");
  }

  return { issues, warnings };
}

export function isOriginAllowed(origin) {
  if (!origin) return true;
  if (config.corsAllowAnyOrigin) return true;
  return config.corsOrigins.includes(origin);
}

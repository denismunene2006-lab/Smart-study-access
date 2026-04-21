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

const corsOrigins = parseList(process.env.CORS_ORIGIN, LOCAL_CORS_DEFAULTS);
const apiBaseUrl = readString(process.env.API_BASE_URL);
const inferredMpesaCallbackUrl = apiBaseUrl
  ? `${apiBaseUrl.replace(/\/$/, "")}/api/subscriptions/mpesa/callback`
  : "";

export const config = {
  port: parseInteger(process.env.PORT, 4000),
  apiBaseUrl,
  supabaseUrl: readString(process.env.SUPABASE_URL),
  supabaseAnonKey: readString(process.env.SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: readString(process.env.SUPABASE_SERVICE_ROLE_KEY),
  profilesTable: readString(process.env.SUPABASE_PROFILES_TABLE) || "profiles",
  papersTable: readString(process.env.SUPABASE_PAPERS_TABLE) || "papers",
  uploadsTable: readString(process.env.SUPABASE_UPLOADS_TABLE) || "uploads",
  transactionsTable: readString(process.env.SUPABASE_TRANSACTIONS_TABLE) || "transactions",
  subscriptionsTable: readString(process.env.SUPABASE_SUBSCRIPTIONS_TABLE) || "subscriptions",
  rewardsTable: readString(process.env.SUPABASE_REWARDS_TABLE) || "rewards",
  referralsTable: readString(process.env.SUPABASE_REFERRALS_TABLE) || "referrals",
  papersBucket: readString(process.env.SUPABASE_PAPERS_BUCKET) || "papers",
  uploadsBucket: readString(process.env.SUPABASE_UPLOADS_BUCKET) || "uploads",
  corsOrigins,
  corsAllowAnyOrigin: corsOrigins.includes("*"),
  strictStartup: parseBoolean(process.env.STRICT_STARTUP, false),
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

export function getConfigDiagnostics() {
  const issues = [];
  const warnings = [];

  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.supabaseServiceRoleKey) {
    issues.push(
      "Supabase is not fully configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!config.apiBaseUrl) {
    warnings.push("API_BASE_URL is not set. M-Pesa callback inference may fail.");
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

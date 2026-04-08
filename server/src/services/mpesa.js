import { Buffer } from "buffer";
import { config } from "../config.js";

const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke";

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

function getBaseUrl() {
  return config.mpesaEnv === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits;
}

function buildTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function buildPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function fetchAccessToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer
    .from(`${config.mpesaConsumerKey}:${config.mpesaConsumerSecret}`)
    .toString("base64");

  const response = await fetch(
    `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  const payload = await parseResponse(response);
  if (!response.ok || !payload?.access_token) {
    const error = new Error(payload?.errorMessage || payload?.error_description || "Unable to fetch M-Pesa access token.");
    error.statusCode = 503;
    throw error;
  }

  const expiresIn = Number(payload.expires_in || 3599);
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000
  };

  return tokenCache.accessToken;
}

export function getMpesaConfigStatus() {
  const requiredValues = {
    MPESA_CONSUMER_KEY: config.mpesaConsumerKey,
    MPESA_CONSUMER_SECRET: config.mpesaConsumerSecret,
    MPESA_SHORTCODE: config.mpesaShortcode,
    MPESA_PASSKEY: config.mpesaPasskey,
    MPESA_CALLBACK_URL: config.mpesaCallbackUrl
  };

  const missing = Object.entries(requiredValues)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length === Object.keys(requiredValues).length) {
    return {
      status: "disabled",
      ready: false,
      environment: config.mpesaEnv,
      missing
    };
  }

  if (missing.length > 0) {
    return {
      status: "partial",
      ready: false,
      environment: config.mpesaEnv,
      missing
    };
  }

  return {
    status: "configured",
    ready: true,
    environment: config.mpesaEnv,
    missing: []
  };
}

export async function initiateStkPush({
  phoneNumber,
  amount,
  callbackUrl,
  accountReference,
  transactionDesc
}) {
  const status = getMpesaConfigStatus();
  if (!status.ready) {
    const error = new Error(
      status.status === "partial"
        ? `M-Pesa configuration is incomplete: ${status.missing.join(", ")}`
        : "M-Pesa service is not configured"
    );
    error.statusCode = 503;
    throw error;
  }

  const cbUrl = callbackUrl || config.mpesaCallbackUrl;
  if (!cbUrl) {
    const error = new Error("M-Pesa callback URL is not configured");
    error.statusCode = 503;
    throw error;
  }

  const timestamp = buildTimestamp();
  const accessToken = await fetchAccessToken();
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  const payload = {
    BusinessShortCode: config.mpesaShortcode,
    Password: buildPassword(config.mpesaShortcode, config.mpesaPasskey, timestamp),
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(Number(amount)),
    PartyA: normalizedPhoneNumber,
    PartyB: config.mpesaShortcode,
    PhoneNumber: normalizedPhoneNumber,
    CallBackURL: cbUrl,
    AccountReference: accountReference || config.mpesaAccountRef,
    TransactionDesc: transactionDesc || config.mpesaTransactionDesc
  };

  const response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseBody = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(
      responseBody?.errorMessage ||
      responseBody?.ResponseDescription ||
      "Unable to initiate M-Pesa STK push."
    );
    error.statusCode = 503;
    throw error;
  }

  return responseBody;
}

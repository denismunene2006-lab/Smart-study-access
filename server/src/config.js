import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "change_me",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  mpesaEnv: process.env.MPESA_ENV || "sandbox",
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY,
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET,
  mpesaShortcode: process.env.MPESA_SHORTCODE,
  mpesaPasskey: process.env.MPESA_PASSKEY,
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL,
  mpesaAccountRef: process.env.MPESA_ACCOUNT_REF || "UEPPASTPAPERS",
  mpesaTransactionDesc: process.env.MPESA_TRANSACTION_DESC || "Past Papers Subscription"
};

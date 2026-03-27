import MpesaModule from "mpesa-node";
import { config } from "../config.js";

const Mpesa = MpesaModule?.default || MpesaModule;
let mpesaClient = null;

function getMpesaClient() {
  if (mpesaClient) return mpesaClient;
  if (!config.mpesaConsumerKey || !config.mpesaConsumerSecret) {
    throw new Error("M-Pesa credentials are not configured");
  }

  mpesaClient = new Mpesa({
    consumerKey: config.mpesaConsumerKey,
    consumerSecret: config.mpesaConsumerSecret,
    environment: config.mpesaEnv,
    lipaNaMpesaShortCode: config.mpesaShortcode,
    lipaNaMpesaShortPass: config.mpesaPasskey
  });

  return mpesaClient;
}

export async function initiateStkPush({ phoneNumber, amount, callbackUrl, accountReference, transactionDesc }) {
  const client = getMpesaClient();
  const cbUrl = callbackUrl || config.mpesaCallbackUrl;
  if (!cbUrl) {
    throw new Error("M-Pesa callback URL is not configured");
  }

  return await client.lipaNaMpesaOnline(
    phoneNumber,
    amount,
    cbUrl,
    accountReference || config.mpesaAccountRef,
    transactionDesc || config.mpesaTransactionDesc
  );
}

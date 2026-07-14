/**
 * SSLCommerz service layer.
 * Uses the built-in `fetch` (Node.js >= 18) — no extra HTTP dependency needed.
 *
 * Required env vars:
 *   SSLCOMMERZ_STORE_ID
 *   SSLCOMMERZ_STORE_PASSWORD
 *   SSLCOMMERZ_IS_LIVE        ("true" | "false", default "false")
 *   BACKEND_BASE_URL          e.g. https://edunext-api.onrender.com
 *   FRONTEND_BASE_URL         e.g. https://edunext-six.vercel.app
 */

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID as string;
const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD as string;
const IS_LIVE = process.env.SSLCOMMERZ_IS_LIVE === "true";

const BASE_URL = IS_LIVE
  ? "https://securepay.sslcommerz.com"
  : "https://sandbox.sslcommerz.com";

const SESSION_API_URL = `${BASE_URL}/gwprocess/v4/api.php`;
const VALIDATION_API_URL = `${BASE_URL}/validator/api/validationserverAPI.php`;
const REFUND_API_URL = `${BASE_URL}/validator/api/merchantTransIDvalidationAPI.php`;

if (!STORE_ID || !STORE_PASSWORD) {
  // eslint-disable-next-line no-console
  console.warn(
    "[sslcommerz.service] SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD is not set in env.",
  );
}

interface InitiatePaymentParams {
  tranId: string;
  amount: number;
  currency?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  productName: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

interface SSLCommerzInitResponse {
  status: string; // "SUCCESS" | "FAILED"
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  [key: string]: any;
}

interface SSLCommerzValidationResponse {
  status: string; // "VALID" | "VALIDATED" | "INVALID_TRANSACTION" | "FAILED" | ...
  tran_date?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  store_amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  [key: string]: any;
}

interface SSLCommerzRefundInitResponse {
  APIConnect: string;
  bank_tran_id?: string;
  trans_id?: string;
  refund_ref_id?: string;
  status: string; // "success" | "failed" | "unauthorized" | "processing"
  errorReason?: string;
}

interface SSLCommerzRefundStatusResponse {
  APIConnect: string;
  bank_tran_id?: string;
  tran_id?: string;
  initiated_on?: string;
  refunded_on?: string;
  status: string; // "refunded" | "processing" | ...
  refund_ref_id?: string;
}

async function initiatePayment(
  params: InitiatePaymentParams,
): Promise<SSLCommerzInitResponse> {
  const body = new URLSearchParams({
    store_id: STORE_ID,
    store_passwd: STORE_PASSWORD,
    total_amount: String(params.amount),
    currency: params.currency || "BDT",
    tran_id: params.tranId,
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,

    shipping_method: "NO",
    product_name: params.productName,
    product_category: "Course",
    product_profile: "general",

    cus_name: params.customer.name,
    cus_email: params.customer.email,
    cus_add1: params.customer.address || "Dhaka",
    cus_city: params.customer.city || "Dhaka",
    cus_postcode: params.customer.postcode || "1000",
    cus_country: params.customer.country || "Bangladesh",
    cus_phone: params.customer.phone,

    ship_name: params.customer.name,
    ship_add1: params.customer.address || "Dhaka",
    ship_city: params.customer.city || "Dhaka",
    ship_postcode: params.customer.postcode || "1000",
    ship_country: params.customer.country || "Bangladesh",
  });

  const response = await fetch(SESSION_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return (await response.json()) as SSLCommerzInitResponse;
}

async function validateTransaction(
  valId: string,
): Promise<SSLCommerzValidationResponse> {
  const query = new URLSearchParams({
    val_id: valId,
    store_id: STORE_ID,
    store_passwd: STORE_PASSWORD,
    format: "json",
  });

  const response = await fetch(`${VALIDATION_API_URL}?${query.toString()}`, {
    method: "GET",
  });

  return (await response.json()) as SSLCommerzValidationResponse;
}

async function initiateRefund(params: {
  bankTranId: string;
  refundAmount: number;
  refundRemarks: string;
}): Promise<SSLCommerzRefundInitResponse> {
  const query = new URLSearchParams({
    bank_tran_id: params.bankTranId,
    refund_amount: String(params.refundAmount),
    refund_remarks: params.refundRemarks,
    store_id: STORE_ID,
    store_passwd: STORE_PASSWORD,
    v: "1",
    format: "json",
  });

  const response = await fetch(`${REFUND_API_URL}?${query.toString()}`, {
    method: "GET",
  });

  return (await response.json()) as SSLCommerzRefundInitResponse;
}

async function checkRefundStatus(
  refundRefId: string,
): Promise<SSLCommerzRefundStatusResponse> {
  const query = new URLSearchParams({
    refund_ref_id: refundRefId,
    store_id: STORE_ID,
    store_passwd: STORE_PASSWORD,
    format: "json",
  });

  const response = await fetch(`${REFUND_API_URL}?${query.toString()}`, {
    method: "GET",
  });

  return (await response.json()) as SSLCommerzRefundStatusResponse;
}

export const sslcommerzService = {
  initiatePayment,
  validateTransaction,
  initiateRefund,
  checkRefundStatus,
};

export type EcpayConfig = {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  checkoutUrl: string;
};

const STAGING_CHECKOUT_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
const PRODUCTION_CHECKOUT_URL = "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";

export function getEcpayConfig(): EcpayConfig | null {
  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;
  if (!merchantId || !hashKey || !hashIv) return null;

  const isProduction = process.env.ECPAY_ENV === "production";
  return {
    merchantId,
    hashKey,
    hashIv,
    checkoutUrl: isProduction ? PRODUCTION_CHECKOUT_URL : STAGING_CHECKOUT_URL,
  };
}

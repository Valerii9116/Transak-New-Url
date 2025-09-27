const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const {
      flow = "BUY",
      token = "ETH",
      network = "ethereum",
      cryptoAmount,
      fiatAmount,
      fiatCurrency = "GBP",
      paymentMethod,
      partnerOrderId,
    } = req.body || {};

    const API_KEY = process.env.TRANSAK_API_KEY;
    const API_SECRET = process.env.TRANSAK_API_SECRET;
    const REFERRER_DOMAIN = process.env.REFERRER_DOMAIN;

    if (!API_KEY || !API_SECRET || !REFERRER_DOMAIN) {
      return {
        status: 500,
        body: { error: "Missing Transak credentials (API key/secret/domain)." },
      };
    }

    const widgetParams = {
      type: flow.toLowerCase() === "sell" ? "offramp" : "onramp",
      cryptoCurrencyCode: token,
      network,
      fiatCurrency,
      fiatAmount: fiatAmount || undefined,
      cryptoAmount: cryptoAmount || undefined,
      partnerOrderId: partnerOrderId || undefined,
      paymentMethod: paymentMethod || undefined,
    };

    const body = {
      apiKey: API_KEY,
      secret: API_SECRET,
      referrerDomain: REFERRER_DOMAIN,
      widgetParams,
    };

    const url = "https://api-gateway-stg.transak.com/api/v2/auth/session";

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      context.log("Transak error:", resp.status, text);
      return { status: resp.status, body: { error: text } };
    }

    const json = await resp.json();
    return { status: 200, body: json };
  } catch (err) {
    context.log.error("Error:", err);
    return { status: 500, body: { error: err.message } };
  }
};

import twilio from "twilio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  const {
    customer_phone,
    location,
    order_id,
    estimated_ready_time,
    status_type
  } = req.body || {};

  if (!customer_phone || !location || !order_id) {
    return res.status(400).json({
      success: false,
      error: "MISSING_REQUIRED_FIELDS"
    });
  }

  const locationLabel =
    location === "north" ? "Chinatown North Austin" : "Chinatown Westlake";

  let message = `${locationLabel}: your order ${order_id} has been placed.`;

  if (status_type === "accepted") {
    message = `${locationLabel}: your order ${order_id} has been accepted by the restaurant.`;
  }

  if (status_type === "ready") {
    message = `${locationLabel}: your order ${order_id} is ready for pickup.`;
  }

  if (estimated_ready_time && status_type !== "ready") {
    message += ` It should be ready around ${estimated_ready_time}.`;
  }

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("Missing Twilio env vars");
      return res
        .status(500)
        .json({ success: false, error: "MISSING_TWILIO_CONFIG" });
    }

    const client = twilio(accountSid, authToken);

    await client.messages.create({
      from: fromNumber,
      to: customer_phone,
      body: message
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("SMS send error:", err);
    return res
      .status(500)
      .json({ success: false, error: "SMS_SEND_FAILED" });
  }
}

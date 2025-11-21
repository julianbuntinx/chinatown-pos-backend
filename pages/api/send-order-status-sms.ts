import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

type SendOrderStatusSmsBody = {
  customer_phone: string;
  location: "north" | "westlake";
  order_id: string;
  estimated_ready_time?: string;
  status_type?: "placed" | "accepted" | "ready";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  const {
    customer_phone,
    location,
    order_id,
    estimated_ready_time,
    status_type
  } = req.body as SendOrderStatusSmsBody;

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
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: customer_phone,
      body: message
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("SMS send error:", err);
    return res.status(500).json({ success: false, error: "SMS_SEND_FAILED" });
  }
}

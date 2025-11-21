import type { NextApiRequest, NextApiResponse } from "next";

type OrderItem = {
  menu_item_name: string;
  quantity: number;
  special_instructions?: string;
};

type CreateTogoOrderBody = {
  location: "north" | "westlake";
  customer_name: string;
  customer_phone: string;
  pickup_time?: string;
  items: OrderItem[];
};

type SuccessResponse = {
  success: true;
  order_id: string;
  estimated_ready_time?: string;
};

type ErrorResponse = {
  success: false;
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
  }

  const body = req.body as CreateTogoOrderBody;

  const { location, customer_name, customer_phone, pickup_time, items } = body;

  if (!location || !customer_name || !customer_phone || !items || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "MISSING_REQUIRED_FIELDS" });
  }

  try {
    const toastLocationId =
      location === "north"
        ? process.env.TOAST_LOCATION_ID_NORTH
        : process.env.TOAST_LOCATION_ID_WESTLAKE;

    if (!toastLocationId) {
      console.error("Missing Toast location ID env var");
      return res
        .status(500)
        .json({ success: false, error: "MISSING_TOAST_LOCATION_ID" });
    }

    const toastPayload = {
      locationId: toastLocationId,
      diningOption: "TAKEOUT",
      customer: {
        name: customer_name,
        phoneNumber: customer_phone
      },
      pickupTime: pickup_time || "ASAP",
      items: items.map((i) => ({
        name: i.menu_item_name,
        quantity: i.quantity,
        specialInstructions: i.special_instructions ?? ""
      })),
      source: "VAPI_VOICE_ASSISTANT"
    };

    const toastOrdersUrl = process.env.TOAST_ORDERS_URL;
    const toastApiKey = process.env.TOAST_API_KEY;

    if (!toastOrdersUrl || !toastApiKey) {
      console.error("Missing Toast API env vars");
      return res
        .status(500)
        .json({ success: false, error: "MISSING_TOAST_API_CONFIG" });
    }

    const toastRes = await fetch(toastOrdersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${toastApiKey}`
      },
      body: JSON.stringify(toastPayload)
    });

    if (!toastRes.ok) {
      const errorText = await toastRes.text();
      console.error("Toast order error:", errorText);
      return res
        .status(500)
        .json({ success: false, error: "POS_ORDER_FAILED" });
    }

    const toastData = await toastRes.json();

    const orderId = toastData.id || toastData.orderId || "UNKNOWN_ORDER_ID";
    const estimatedReadyTime =
      toastData.estimatedReadyTime || toastData.readyTime || undefined;

    return res.status(200).json({
      success: true,
      order_id: orderId,
      estimated_ready_time: estimatedReadyTime
    });
  } catch (err) {
    console.error("Unexpected error creating Toast order:", err);
    return res
      .status(500)
      .json({ success: false, error: "POS_ORDER_EXCEPTION" });
  }
}

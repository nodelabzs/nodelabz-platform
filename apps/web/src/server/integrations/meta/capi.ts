import crypto from "crypto";

function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendConversionEvent(params: {
  pixelId: string;
  accessToken: string;
  event: "Lead" | "Purchase" | "CompleteRegistration" | "ViewContent" | "AddToCart";
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    contentIds?: string[];
    contentType?: string;
  };
  eventSourceUrl?: string;
}): Promise<{ eventsReceived: number }> {
  // Hash all PII per Meta requirements
  const hashedUserData: Record<string, string[]> = {};
  if (params.userData.email) hashedUserData.em = [hashSHA256(params.userData.email)];
  if (params.userData.phone) hashedUserData.ph = [hashSHA256(params.userData.phone)];
  if (params.userData.firstName) hashedUserData.fn = [hashSHA256(params.userData.firstName)];
  if (params.userData.lastName) hashedUserData.ln = [hashSHA256(params.userData.lastName)];
  if (params.userData.city) hashedUserData.ct = [hashSHA256(params.userData.city)];
  if (params.userData.state) hashedUserData.st = [hashSHA256(params.userData.state)];
  if (params.userData.country) hashedUserData.country = [hashSHA256(params.userData.country)];

  const eventData: Record<string, unknown> = {
    event_name: params.event,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: hashedUserData,
  };

  if (params.customData) {
    eventData.custom_data = {
      value: params.customData.value,
      currency: params.customData.currency || "USD",
      content_ids: params.customData.contentIds,
      content_type: params.customData.contentType,
    };
  }

  if (params.eventSourceUrl) {
    eventData.event_source_url = params.eventSourceUrl;
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${params.pixelId}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [eventData],
        access_token: params.accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meta CAPI error: ${error}`);
  }

  const result = await response.json();
  return { eventsReceived: result.events_received || 0 };
}

const WA_API = "https://graph.facebook.com/v21.0";

export async function sendTextMessage(params: {
  phoneNumberId: string;
  to: string;
  text: string;
  accessToken: string;
}): Promise<{ messageId: string }> {
  const response = await fetch(`${WA_API}/${params.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: { body: params.text },
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${await response.text()}`);
  }

  const data = await response.json();
  return { messageId: data.messages?.[0]?.id || "" };
}

export async function sendTemplateMessage(params: {
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  components?: Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }>;
  accessToken: string;
}): Promise<{ messageId: string }> {
  const template: Record<string, unknown> = {
    name: params.templateName,
    language: { code: params.languageCode },
  };

  if (params.components && params.components.length > 0) {
    template.components = params.components;
  }

  const response = await fetch(`${WA_API}/${params.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "template",
      template,
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp template send failed: ${await response.text()}`);
  }

  const data = await response.json();
  return { messageId: data.messages?.[0]?.id || "" };
}

export async function markAsRead(params: {
  phoneNumberId: string;
  messageId: string;
  accessToken: string;
}): Promise<void> {
  const response = await fetch(`${WA_API}/${params.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: params.messageId,
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp mark-as-read failed: ${await response.text()}`);
  }
}

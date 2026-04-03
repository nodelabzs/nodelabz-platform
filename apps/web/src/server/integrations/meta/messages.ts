const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface SendMessageResult {
  recipientId: string;
  messageId: string;
}

/**
 * Send a text message via Facebook Messenger (Page Messaging).
 * Uses the Page Access Token associated with the Facebook Page.
 */
export async function sendFacebookMessage(
  pageAccessToken: string,
  recipientId: string,
  text: string
): Promise<SendMessageResult> {
  const response = await fetch(`${GRAPH_API_BASE}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pageAccessToken}`,
    },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Facebook Send API error ${response.status}: ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return {
    recipientId: data.recipient_id,
    messageId: data.message_id,
  };
}

/**
 * Send a text message via Instagram Messaging.
 * Uses the same Graph API endpoint as Facebook Messenger.
 */
export async function sendInstagramMessage(
  pageAccessToken: string,
  recipientId: string,
  text: string
): Promise<SendMessageResult> {
  const response = await fetch(`${GRAPH_API_BASE}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pageAccessToken}`,
    },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Instagram Send API error ${response.status}: ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return {
    recipientId: data.recipient_id,
    messageId: data.message_id,
  };
}

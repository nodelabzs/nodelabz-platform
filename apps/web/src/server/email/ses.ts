import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-ses";

// ---------------------------------------------------------------------------
// SES client (lazy singleton)
// ---------------------------------------------------------------------------

let _client: SESClient | null = null;

function getClient(): SESClient {
  if (!_client) {
    const accessKeyId =
      process.env.AWS_SES_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "";
    const secretAccessKey =
      process.env.AWS_SES_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
    const region =
      process.env.AWS_SES_REGION || process.env.AWS_REGION || "us-east-1";

    _client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM || "NodeLabz <notifications@nodelabz.com>";

// ---------------------------------------------------------------------------
// sendEmail – single recipient
// ---------------------------------------------------------------------------

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<{ messageId: string }> {
  const params: SendEmailCommandInput = {
    Source: from || DEFAULT_FROM,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
      },
    },
  };

  const result = await getClient().send(new SendEmailCommand(params));
  return { messageId: result.MessageId ?? "" };
}

// ---------------------------------------------------------------------------
// sendBulkEmail – multiple recipients, each with personalised merge data
// ---------------------------------------------------------------------------

export async function sendBulkEmail(
  recipients: Array<{ email: string; mergeData: Record<string, string> }>,
  subject: string,
  html: string,
  applyMerge: (template: string, tags: Record<string, string>) => string,
  from?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const personalHtml = applyMerge(html, recipient.mergeData);
      const personalSubject = applyMerge(subject, recipient.mergeData);
      await sendEmail(recipient.email, personalSubject, personalHtml, from);
      sent++;
    } catch (error) {
      console.error(
        `[SES] Failed to send to ${recipient.email}:`,
        error instanceof Error ? error.message : error
      );
      failed++;
    }
  }

  return { sent, failed };
}

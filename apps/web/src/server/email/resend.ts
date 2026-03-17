import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from:
      params.from ||
      process.env.EMAIL_FROM ||
      "NodeLabz <notifications@nodelabz.com>",
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
    tags: params.tags,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
  return { id: data?.id || "" };
}

export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    tags?: { name: string; value: string }[];
  }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Resend batch API: send in chunks of 100
  const chunks: (typeof emails)[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    chunks.push(emails.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const { data, error } = await resend.batch.send(
      chunk.map((e) => ({
        from:
          process.env.EMAIL_FROM ||
          "NodeLabz <notifications@nodelabz.com>",
        to: e.to,
        subject: e.subject,
        html: e.html,
        tags: e.tags,
      }))
    );
    if (error) {
      failed += chunk.length;
    } else {
      sent += data?.data?.length || chunk.length;
    }
  }

  return { sent, failed };
}

/**
 * Replace merge tags like {{nombre}}, {{empresa}} in text.
 */
export function applyMergeTags(
  template: string,
  tags: Record<string, string>
): string {
  return Object.entries(tags).reduce(
    (text, [key, value]) =>
      text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value),
    template
  );
}

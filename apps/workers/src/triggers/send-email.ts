import { task } from "@trigger.dev/sdk";

export const sendEmail = task({
  id: "send-email",
  run: async (payload: {
    tenantId: string;
    to: string;
    subject: string;
    html: string;
  }) => {
    const { to, subject, html } = payload;

    // TODO: Send via Amazon SES
    console.log(`Sending email to ${to}: ${subject}`);

    return { success: true, to, sentAt: new Date().toISOString() };
  },
});

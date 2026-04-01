import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@nodelabz/db";
import { sendEmail } from "@/server/email/ses";
import { applyMergeTags } from "@/server/email/resend";

// ---------------------------------------------------------------------------
// Shared processing logic (used by both cron and tRPC processNow)
// ---------------------------------------------------------------------------

export interface ProcessResult {
  processed: number;
  sent: number;
  completed: number;
  errors: number;
}

export async function processSequenceEnrollments(
  sequenceIdFilter?: string
): Promise<ProcessResult> {
  const now = new Date();
  const result: ProcessResult = { processed: 0, sent: 0, completed: 0, errors: 0 };

  // Find due enrollments
  const whereClause: Record<string, unknown> = {
    status: "active",
    nextSendAt: { lte: now },
  };
  if (sequenceIdFilter) {
    whereClause.sequenceId = sequenceIdFilter;
  }

  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: whereClause,
    include: { sequence: true },
  });

  console.log(
    `[Process Sequences] Found ${enrollments.length} enrollments to process`
  );

  for (const enrollment of enrollments) {
    result.processed++;
    try {
      const steps = enrollment.sequence.steps as Array<{
        order: number;
        templateId: string;
        delayHours: number;
      }>;

      const currentStepData = steps.find(
        (s) => s.order === enrollment.currentStep
      );
      if (!currentStepData) {
        console.warn(
          `[Process Sequences] No step at order ${enrollment.currentStep} for enrollment ${enrollment.id}`
        );
        result.errors++;
        continue;
      }

      // Fetch template
      const template = await prisma.emailTemplate.findUnique({
        where: { id: currentStepData.templateId },
      });
      if (!template) {
        console.warn(
          `[Process Sequences] Template ${currentStepData.templateId} not found for enrollment ${enrollment.id}`
        );
        result.errors++;
        continue;
      }

      // Fetch contact
      const contact = await prisma.contact.findUnique({
        where: { id: enrollment.contactId },
      });
      if (!contact || !contact.email) {
        console.warn(
          `[Process Sequences] Contact ${enrollment.contactId} not found or has no email`
        );
        result.errors++;
        continue;
      }

      // Build merge tags from contact data
      const mergeTags: Record<string, string> = {
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        company: contact.company || "",
      };

      // Render and send
      const html = applyMergeTags(template.html || "", mergeTags);
      const subject = applyMergeTags(template.subject, mergeTags);
      await sendEmail(contact.email, subject, html);
      result.sent++;

      // Advance to next step or complete
      const nextStepOrder = enrollment.currentStep + 1;
      const nextStepData = steps.find((s) => s.order === nextStepOrder);

      if (nextStepData) {
        const nextSendAt = new Date(
          Date.now() + nextStepData.delayHours * 60 * 60 * 1000
        );
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStep: nextStepOrder, nextSendAt },
        });
      } else {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed", nextSendAt: null },
        });
        result.completed++;
      }
    } catch (error) {
      console.error(
        `[Process Sequences] Error processing enrollment ${enrollment.id}:`,
        error instanceof Error ? error.message : error
      );
      result.errors++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cron endpoint
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Verify cron secret (skip in dev)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processSequenceEnrollments();

    console.log(
      `[Process Sequences] Done: processed=${result.processed} sent=${result.sent} completed=${result.completed} errors=${result.errors}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Process Sequences] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

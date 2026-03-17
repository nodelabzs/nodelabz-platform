import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@nodelabz/db";

interface SequenceStep {
  order: number;
  templateId: string;
  delayHours: number;
}

export const dripSequenceProcessor = task({
  id: "drip-sequence-processor",
  run: async (_payload: Record<string, never>) => {
    const now = new Date();

    // Step 1: Query active enrollments that are due
    const dueEnrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        status: "active",
        nextSendAt: { lte: now },
      },
      include: {
        sequence: true,
      },
    });

    if (dueEnrollments.length === 0) {
      logger.info("No due enrollments found");
      return { success: true, processed: 0 };
    }

    logger.info("Processing due enrollments", {
      count: dueEnrollments.length,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.error("RESEND_API_KEY not configured");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const fromAddress =
      process.env.EMAIL_FROM || "NodeLabz <notifications@nodelabz.com>";

    let processedCount = 0;
    let errorCount = 0;

    for (const enrollment of dueEnrollments) {
      try {
        const steps = enrollment.sequence.steps as unknown as SequenceStep[];
        const currentStepIndex = enrollment.currentStep;
        const currentStep = steps[currentStepIndex];

        if (!currentStep) {
          // No more steps - mark as completed
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "completed" },
          });
          logger.info("Enrollment completed (no step found)", {
            enrollmentId: enrollment.id,
          });
          continue;
        }

        // Get template for this step
        const template = await prisma.emailTemplate.findUnique({
          where: { id: currentStep.templateId },
        });

        if (!template) {
          logger.warn("Template not found for step", {
            enrollmentId: enrollment.id,
            templateId: currentStep.templateId,
          });
          continue;
        }

        // Get contact
        const contact = await prisma.contact.findUnique({
          where: { id: enrollment.contactId },
        });

        if (!contact || !contact.email) {
          logger.warn("Contact not found or has no email", {
            enrollmentId: enrollment.id,
            contactId: enrollment.contactId,
          });
          // Skip this enrollment but don't stop
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "paused" },
          });
          continue;
        }

        // Build email HTML from template
        let emailHtml = template.html || "";
        const subject = template.subject || "Message from NodeLabz";

        // Apply merge fields from contact data
        const mergeFields: Record<string, string> = {
          firstName: contact.firstName || "",
          lastName: contact.lastName || "",
          email: contact.email || "",
          company: contact.company || "",
        };

        emailHtml = Object.entries(mergeFields).reduce(
          (text, [key, value]) =>
            text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value),
          emailHtml
        );

        // Send email via Resend
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: contact.email,
            subject,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Resend API error ${response.status}: ${errorText}`
          );
        }

        const emailResult = await response.json();
        logger.info("Drip email sent", {
          enrollmentId: enrollment.id,
          contactEmail: contact.email,
          step: currentStepIndex,
          messageId: emailResult.id,
        });

        // Increment currentStep and set nextSendAt
        const nextStepIndex = currentStepIndex + 1;
        const nextStep = steps[nextStepIndex];

        if (nextStep) {
          const nextSendAt = new Date();
          nextSendAt.setHours(
            nextSendAt.getHours() + (nextStep.delayHours || 24)
          );

          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStep: nextStepIndex,
              nextSendAt,
            },
          });
        } else {
          // No more steps - mark as completed
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStep: nextStepIndex,
              status: "completed",
              nextSendAt: null,
            },
          });
          logger.info("Enrollment completed all steps", {
            enrollmentId: enrollment.id,
          });
        }

        processedCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Error processing enrollment", {
          enrollmentId: enrollment.id,
          error: message,
        });
        errorCount++;
      }
    }

    logger.info("Drip sequence processing complete", {
      processedCount,
      errorCount,
    });

    return { success: true, processed: processedCount, errors: errorCount };
  },
});

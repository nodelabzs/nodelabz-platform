import { task, logger } from "@trigger.dev/sdk";

interface GenerateMediaPayload {
  tenantId: string;
  type: "image" | "video";
  prompt: string;
  model?: string;
}

interface HiggsFieldResponse {
  id: string;
  status: string;
  status_url: string;
  result_url?: string;
}

export const generateMedia = task({
  id: "generate-media",
  run: async (payload: GenerateMediaPayload) => {
    const { tenantId, type, prompt, model } = payload;

    const keyId = process.env.HIGGSFIELD_KEY_ID;
    const keySecret = process.env.HIGGSFIELD_KEY_SECRET;

    if (!keyId || !keySecret) {
      logger.error("Higgsfield credentials not configured", { tenantId });
      return { success: false, error: "Media generation not configured" };
    }

    try {
      // Step 1: Submit generation request
      logger.info("Submitting media generation", { tenantId, type, prompt });

      const submitResponse = await fetch(
        "https://higgsfieldapi.com/api/v1/generate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keyId}:${keySecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            type,
            model: model || "default",
          }),
        }
      );

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(
          `Higgsfield API error ${submitResponse.status}: ${errorText}`
        );
      }

      const submitData: HiggsFieldResponse = await submitResponse.json();
      const statusUrl = submitData.status_url;

      if (!statusUrl) {
        throw new Error("No status_url returned from Higgsfield API");
      }

      logger.info("Generation submitted", {
        id: submitData.id,
        statusUrl,
      });

      // Step 2: Poll for completion
      const maxAttempts = 60; // 5 minutes with 5s intervals
      const pollIntervalMs = 5000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const statusResponse = await fetch(statusUrl, {
          headers: {
            Authorization: `Bearer ${keyId}:${keySecret}`,
          },
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          logger.warn("Status poll failed", {
            attempt,
            status: statusResponse.status,
            error: errorText,
          });
          continue;
        }

        const statusData: HiggsFieldResponse = await statusResponse.json();

        if (statusData.status === "completed" && statusData.result_url) {
          logger.info("Media generation completed", {
            tenantId,
            resultUrl: statusData.result_url,
          });
          return {
            success: true,
            url: statusData.result_url,
            type,
          };
        }

        if (statusData.status === "failed") {
          throw new Error("Higgsfield generation failed");
        }

        logger.info("Still processing", {
          attempt,
          status: statusData.status,
        });
      }

      throw new Error("Media generation timed out after 5 minutes");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Media generation failed", {
        tenantId,
        type,
        error: message,
      });
      return { success: false, error: message };
    }
  },
});

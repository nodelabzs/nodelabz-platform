/**
 * Higgsfield AI Video Generation Service
 *
 * Uses the Higgsfield cloud API (cloud.higgsfield.ai) for text-to-video
 * and image-to-video generation. Video generation is asynchronous —
 * a job is submitted and polled for completion (typically 30-120s).
 *
 * Auth: HMAC-style key pair (HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET)
 * sent as Bearer token or via x-api-key / x-api-secret headers.
 */

const HIGGSFIELD_BASE_URL = "https://cloud.higgsfield.ai/api/v1";

function getCredentials() {
  const keyId = process.env.HIGGSFIELD_KEY_ID;
  const keySecret = process.env.HIGGSFIELD_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing Higgsfield credentials: HIGGSFIELD_KEY_ID and HIGGSFIELD_KEY_SECRET must be set"
    );
  }

  return { keyId, keySecret };
}

function buildHeaders(): Record<string, string> {
  const { keyId, keySecret } = getCredentials();

  return {
    "Content-Type": "application/json",
    "x-api-key": keyId,
    "x-api-secret": keySecret,
  };
}

export type VideoGenType = "text-to-video" | "image-to-video";

export type VideoDuration = 5 | 10 | 15;

export interface GenerateVideoParams {
  prompt: string;
  type: VideoGenType;
  imageUrl?: string; // required for image-to-video
  duration?: VideoDuration; // seconds, defaults to 5
}

export interface GenerateVideoResult {
  jobId: string;
  status: string;
}

export interface VideoStatusResult {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Submit a video generation job to Higgsfield.
 *
 * For text-to-video: sends a prompt describing the desired video.
 * For image-to-video: sends a prompt + source image URL to animate.
 */
export async function generateVideo(
  params: GenerateVideoParams
): Promise<GenerateVideoResult> {
  const headers = buildHeaders();
  const duration = params.duration ?? 5;

  // Determine the endpoint based on generation type
  const endpoint =
    params.type === "image-to-video"
      ? `${HIGGSFIELD_BASE_URL}/image-to-video`
      : `${HIGGSFIELD_BASE_URL}/text-to-video`;

  // Build request body
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    duration,
    // Common Higgsfield parameters
    settings: {
      resolution: "720p",
      fps: 24,
    },
  };

  if (params.type === "image-to-video") {
    if (!params.imageUrl) {
      throw new Error("imageUrl is required for image-to-video generation");
    }
    body.image_url = params.imageUrl;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Higgsfield API error (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    id?: string;
    job_id?: string;
    status?: string;
  };

  const jobId = data.id || data.job_id;
  if (!jobId) {
    throw new Error("Higgsfield API did not return a job ID");
  }

  return {
    jobId,
    status: data.status || "pending",
  };
}

/**
 * Check the status of a video generation job.
 *
 * Returns the current status and, when completed, the video URL
 * and thumbnail URL.
 */
export async function checkVideoStatus(
  jobId: string
): Promise<VideoStatusResult> {
  const headers = buildHeaders();

  const response = await fetch(`${HIGGSFIELD_BASE_URL}/jobs/${jobId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Higgsfield API error (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    status?: string;
    state?: string;
    video_url?: string;
    output_url?: string;
    result_url?: string;
    thumbnail_url?: string;
    thumbnail?: string;
    error?: string;
    message?: string;
  };

  // Normalize status — Higgsfield may use different status field names
  const rawStatus = (data.status || data.state || "pending").toLowerCase();

  let status: VideoStatusResult["status"];
  if (rawStatus === "completed" || rawStatus === "done" || rawStatus === "succeeded") {
    status = "completed";
  } else if (rawStatus === "failed" || rawStatus === "error") {
    status = "failed";
  } else if (
    rawStatus === "processing" ||
    rawStatus === "running" ||
    rawStatus === "in_progress"
  ) {
    status = "processing";
  } else {
    status = "pending";
  }

  // Normalize video URL — try multiple possible field names
  const videoUrl = data.video_url || data.output_url || data.result_url;
  const thumbnailUrl = data.thumbnail_url || data.thumbnail;

  return {
    status,
    videoUrl: status === "completed" ? videoUrl : undefined,
    thumbnailUrl: status === "completed" ? thumbnailUrl : undefined,
    error: status === "failed" ? (data.error || data.message) : undefined,
  };
}

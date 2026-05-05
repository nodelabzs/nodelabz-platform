import { describe, it, expect } from "vitest";

// Extract injectTracking from the email-campaigns router for testing.
// Since it's not exported, we replicate the logic here for unit testing.
const APP_URL = "https://app.nodelabz.com";

function injectTracking(html: string, campaignId: string, email: string): string {
  const eid = encodeURIComponent(email);

  const tracked = html.replace(
    /<a\s([^>]*?)href=["']([^"']+)["']/gi,
    (_match: string, prefix: string, href: string) => {
      if (href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("{")) {
        return `<a ${prefix}href="${href}"`;
      }
      const trackUrl = `${APP_URL}/api/track/click?cid=${campaignId}&eid=${eid}&url=${encodeURIComponent(href)}`;
      return `<a ${prefix}href="${trackUrl}"`;
    }
  );

  const pixel = `<img src="${APP_URL}/api/track/open?cid=${campaignId}&eid=${eid}" width="1" height="1" alt="" style="display:none" />`;
  if (tracked.includes("</body>")) {
    return tracked.replace("</body>", `${pixel}</body>`);
  }
  return tracked + pixel;
}

describe("injectTracking", () => {
  const campaignId = "camp-123";
  const email = "user@test.com";

  it("should inject open tracking pixel", () => {
    const result = injectTracking("<p>Hello</p>", campaignId, email);
    expect(result).toContain("/api/track/open");
    expect(result).toContain("cid=camp-123");
    expect(result).toContain(`eid=${encodeURIComponent(email)}`);
    expect(result).toContain('width="1" height="1"');
  });

  it("should inject pixel before </body> when present", () => {
    const html = "<html><body><p>Hi</p></body></html>";
    const result = injectTracking(html, campaignId, email);
    expect(result).toContain("track/open");
    expect(result).toMatch(/track\/open.*<\/body>/);
  });

  it("should wrap links with click tracking", () => {
    const html = '<a href="https://example.com">Click</a>';
    const result = injectTracking(html, campaignId, email);
    expect(result).toContain("/api/track/click");
    expect(result).toContain("cid=camp-123");
    expect(result).toContain(encodeURIComponent("https://example.com"));
  });

  it("should not wrap mailto links", () => {
    const html = '<a href="mailto:hello@test.com">Email</a>';
    const result = injectTracking(html, campaignId, email);
    expect(result).toContain('href="mailto:hello@test.com"');
    expect(result).not.toContain("/api/track/click");
  });

  it("should not wrap anchor hash links", () => {
    const html = '<a href="#section">Jump</a>';
    const result = injectTracking(html, campaignId, email);
    expect(result).toContain('href="#section"');
  });

  it("should handle multiple links", () => {
    const html = '<a href="https://a.com">A</a> <a href="https://b.com">B</a>';
    const result = injectTracking(html, campaignId, email);
    const clickMatches = result.match(/track\/click/g);
    expect(clickMatches).toHaveLength(2);
  });

  it("should encode email with special characters", () => {
    const specialEmail = "user+tag@test.com";
    const result = injectTracking("<p>Hi</p>", campaignId, specialEmail);
    expect(result).toContain(encodeURIComponent(specialEmail));
  });
});

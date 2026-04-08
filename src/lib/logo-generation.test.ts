import { describe, expect, it } from "vitest";
import { buildGenerateLogoPayload, extractGeneratedImage } from "@/lib/logo-generation";

describe("logo-generation helpers", () => {
  it("builds backward-compatible payload", () => {
    const payload = buildGenerateLogoPayload({
      name: "Acme",
      style: "minimal",
      colors: "blue",
      industry: "tech",
      iconIdea: "rocket",
    });

    expect(payload.name).toBe("Acme");
    expect(payload.businessName).toBe("Acme");
    expect(payload.style).toBe("minimal");
    expect(payload.colors).toBe("blue");
    expect(payload.industry).toBe("tech");
    expect(payload.iconIdea).toBe("rocket");
  });

  it("extracts image from direct image field", () => {
    const image = extractGeneratedImage({ success: true, image: "data:image/png;base64,abc" });
    expect(image).toBe("data:image/png;base64,abc");
  });

  it("extracts image from imageUrl field returned by the logo function", () => {
    const image = extractGeneratedImage({ success: true, imageUrl: "data:image/svg+xml;utf8,abc" });
    expect(image).toBe("data:image/svg+xml;utf8,abc");
  });

  it("extracts image from OpenAI-style b64_json field", () => {
    const image = extractGeneratedImage({ data: [{ b64_json: "abc123" }] });
    expect(image).toBe("data:image/png;base64,abc123");
  });

  it("extracts image from OpenAI-style url field", () => {
    const image = extractGeneratedImage({ data: [{ url: "https://example.com/logo.png" }] });
    expect(image).toBe("https://example.com/logo.png");
  });

  it("returns null when no known image fields exist", () => {
    const image = extractGeneratedImage({ success: true });
    expect(image).toBeNull();
  });
});

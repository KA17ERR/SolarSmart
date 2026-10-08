import { describe, expect, it, vi } from "vitest";
import { INITIAL_ROOF_PHOTO_STATE, inspectRoofPhotoFile, reduceRoofPhotoState, roofImageAnalysisAvailability, ROOF_PHOTO_MAX_BYTES, validateRoofPhotoFile, type RoofPhotoPreview } from "./roof-photo";

function imageFile(name: string, type: string, size = 1024): File {
  return { name, type, size } as File;
}

describe("optional roof photo local preview", () => {
  it("accepts supported formats and rejects empty, oversized, and unsupported images", () => {
    expect(validateRoofPhotoFile(imageFile("roof.jpg", "image/jpeg"))).toBeNull();
    expect(validateRoofPhotoFile(imageFile("roof.png", "image/png"))).toBeNull();
    expect(validateRoofPhotoFile(imageFile("roof.webp", "image/webp"))).toBeNull();
    expect(validateRoofPhotoFile(imageFile("roof.heic", "image/heic"))).toContain("JPEG, PNG, or WebP");
    expect(validateRoofPhotoFile(imageFile("roof.svg", "image/svg+xml"))).toContain("JPEG, PNG, or WebP");
    expect(validateRoofPhotoFile(imageFile("empty.jpg", "image/jpeg", 0))).toContain("empty");
    expect(validateRoofPhotoFile(imageFile("large.jpg", "image/jpeg", ROOF_PHOTO_MAX_BYTES + 1))).toContain("8 MB");
  });

  it("treats cancellation as non-destructive and supports preview removal", () => {
    const file = imageFile("roof.png", "image/png");
    const photo = { file, previewUrl: "blob:roof", width: 1200, height: 800 } satisfies RoofPhotoPreview;
    const selected = reduceRoofPhotoState(INITIAL_ROOF_PHOTO_STATE, { type: "selected", photo });
    const canceled = reduceRoofPhotoState(selected, { type: "cancel" });
    expect(canceled.photo).toBe(photo);
    expect(canceled.status).toContain("unchanged");
    const removed = reduceRoofPhotoState(canceled, { type: "remove" });
    expect(removed.photo).toBeNull();
    expect(removed.status).toContain("manual roof details are unchanged");
  });

  it("reports image decode errors and rejects extreme dimensions without leaking bitmap resources", async () => {
    const file = imageFile("roof.jpg", "image/jpeg");
    await expect(inspectRoofPhotoFile(file, async () => { throw new Error("decoder detail"); })).rejects.toThrow("could not be decoded");
    const close = vi.fn();
    await expect(inspectRoofPhotoFile(file, async () => ({ width: 10_000, height: 10_000, close }))).rejects.toThrow("dimensions exceed");
    expect(close).toHaveBeenCalledOnce();
    await expect(inspectRoofPhotoFile(file, async () => ({ width: 800, height: 600, close }))).resolves.toEqual({ width: 800, height: 600 });
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("clearly reports that no automated vision analysis is configured", () => {
    const availability = roofImageAnalysisAvailability();
    expect(availability.enabled).toBe(false);
    expect(availability.message).toContain("manually");
  });
});

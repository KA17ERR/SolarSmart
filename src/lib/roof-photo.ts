export const ROOF_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const ROOF_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 60_000_000;

export type RoofPhotoFile = Pick<File, "name" | "size" | "type">;
export type RoofPhotoPreview = { file: File; previewUrl: string; width: number; height: number };
export type RoofPhotoState = { photo: RoofPhotoPreview | null; error: string; status: string };
export type RoofPhotoAction =
  | { type: "cancel" }
  | { type: "invalid"; message: string }
  | { type: "loading" }
  | { type: "selected"; photo: RoofPhotoPreview }
  | { type: "failed"; message: string }
  | { type: "remove" };

export const INITIAL_ROOF_PHOTO_STATE: RoofPhotoState = { photo: null, error: "", status: "" };

export function validateRoofPhotoFile(file: RoofPhotoFile): string | null {
  if (!supportedMimeTypes.has(file.type.toLowerCase())) return "Choose a JPEG, PNG, or WebP image. Other formats, including HEIC and SVG, are not supported.";
  if (!Number.isFinite(file.size) || file.size <= 0) return "This image file is empty or unreadable. Choose another image.";
  if (file.size > ROOF_PHOTO_MAX_BYTES) return "Choose an image smaller than 8 MB. You can resize it locally and try again.";
  return null;
}

export function reduceRoofPhotoState(state: RoofPhotoState, action: RoofPhotoAction): RoofPhotoState {
  switch (action.type) {
    case "cancel": return { ...state, error: "", status: state.photo ? "File selection canceled. Your current preview is unchanged." : "File selection canceled. You can continue with manual details." };
    case "invalid": return { ...state, error: action.message, status: "" };
    case "loading": return { ...state, error: "", status: "Checking the image locally…" };
    case "selected": return { photo: action.photo, error: "", status: "Image preview ready. No image analysis was performed." };
    case "failed": return { ...state, error: action.message, status: "" };
    case "remove": return { photo: null, error: "", status: "Image preview removed. Your manual roof details are unchanged." };
  }
}

export type DecodedRoofImage = { width: number; height: number; close?: () => void };
export type RoofImageDecoder = (file: File) => Promise<DecodedRoofImage>;

/** Decodes only in this browser to confirm a real, reasonably sized image before previewing it. */
export async function inspectRoofPhotoFile(file: File, decoder: RoofImageDecoder = candidate => createImageBitmap(candidate)): Promise<{ width: number; height: number }> {
  let decoded: DecodedRoofImage;
  try {
    decoded = await decoder(file);
  } catch {
    throw new Error("This image could not be decoded. It may be damaged or use an unsupported encoding.");
  }
  try {
    const { width, height } = decoded;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
      throw new Error("This image’s dimensions exceed the local preview limit. Resize it and try again.");
    }
    return { width, height };
  } finally {
    decoded.close?.();
  }
}

/** No vision provider is configured. Kept explicit so the UI never implies an analysis occurred. */
export function roofImageAnalysisAvailability() {
  return { enabled: false as const, message: "Automated roof-image analysis is not enabled. Use the image only as a visual reference, then enter roof area, shading, and orientation manually." };
}

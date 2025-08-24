import sharp from "sharp";
import { logger } from "./logger";

export async function normalizeImageToMaxSize(
  inputBuffer: Buffer,
  maxSide: number
): Promise<Buffer> {
  const img = sharp(inputBuffer);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) return inputBuffer;

  const scale = Math.min(1, maxSide / Math.max(meta.width, meta.height));
  if (scale === 1) return inputBuffer;

  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  logger.debug({ w, h }, "Resizing image");
  return img.resize(w, h, { fit: "inside" }).toBuffer();
}

export function toMultipleOf8(n: number) {
  return n - (n % 8);
}

/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const DEFAULT_MAX_SIZE = 512;
const DEFAULT_QUALITY = 0.85;
// Reject absurdly large source files before ever attempting to decode them —
// decoding is the expensive/memory-heavy step, so this check has to run first.
const MAX_SOURCE_BYTES = 10 * 1024 * 1024; // 10MB

export class ImageResizeError extends Error {}

export interface ResizeOptions {
  maxSize?: number;
  quality?: number;
}

/**
 * Downscales an image file to at most `maxSize` on its longest edge and
 * re-encodes it as WebP (falling back to JPEG on browsers that can't encode
 * WebP, e.g. older Safari — which is why the server's upload allowlist
 * accepts both). Never upscales a smaller source image.
 *
 * The canvas round-trip also strips EXIF metadata (including GPS
 * coordinates) as a side effect, which is desirable for a public avatar.
 *
 * The server is the actual security boundary (see UploadPicture's
 * content-sniffing in the Go backend) — this function exists purely to keep
 * uploads small and consistently sized, not to validate untrusted input.
 */
export async function resizeImageToWebP(file: File, opts: ResizeOptions = {}): Promise<Blob> {
  const maxSize = opts.maxSize ?? DEFAULT_MAX_SIZE;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  if (!file.type.startsWith("image/")) {
    throw new ImageResizeError("file must be an image");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageResizeError("image is too large to process");
  }

  const bitmap = await decodeImage(file);
  try {
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height, maxSize);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageResizeError("canvas 2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await encodeCanvas(canvas, quality);
  } finally {
    bitmap.close();
  }
}

function scaledDimensions(width: number, height: number, maxSize: number): { width: number; height: number } {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxSize) return { width, height }; // never upscale
  const scale = maxSize / longestEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// createImageBitmap with imageOrientation: "from-image" is required — without
// it, canvas drops the EXIF orientation tag and portrait phone photos come
// out rotated sideways.
async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return decodeImageViaElement(file);
  }
}

// Fallback for browsers without createImageBitmap's imageOrientation option.
async function decodeImageViaElement(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new ImageResizeError("failed to decode image"));
    });
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob) {
          resolve(webpBlob);
          return;
        }
        // toBlob(..., "image/webp") silently returns null (rather than
        // throwing) on browsers that can't encode WebP — retry as JPEG.
        canvas.toBlob(
          (jpegBlob) => {
            if (jpegBlob) resolve(jpegBlob);
            else reject(new ImageResizeError("failed to encode image"));
          },
          "image/jpeg",
          quality,
        );
      },
      "image/webp",
      quality,
    );
  });
}

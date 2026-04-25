const SAFE_REMOTE_HOSTS = new Set([
  "images.unsplash.com",
  "ui-avatars.com",
]);

const SAFE_FILENAME_PATTERN = /^[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/;

function toApiFilePath(filename: string) {
  return `/api/files/${filename}`;
}

export function normalizeImageSrc(src?: string | null): string | null {
  if (typeof src !== "string") return null;

  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/api/files/")) {
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    const filename = trimmed.split("/").pop();
    if (!filename || !SAFE_FILENAME_PATTERN.test(filename)) return null;
    return toApiFilePath(filename);
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      return SAFE_REMOTE_HOSTS.has(url.hostname) ? trimmed : null;
    } catch {
      return null;
    }
  }

  if (SAFE_FILENAME_PATTERN.test(trimmed)) {
    return toApiFilePath(trimmed);
  }

  return null;
}

export function normalizeImageList(images: unknown): string[] {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => normalizeImageSrc(typeof image === "string" ? image : null))
    .filter((image): image is string => Boolean(image));
}

const MAX_EDGE = 512
const QUALITY = 0.82

/**
 * Scales an image down and re-encodes it as a WebP data URL, so a photo from a
 * phone camera (several MB) fits the ~5MB localStorage budget alongside others.
 *
 * The whole image is preserved — scaled, never cropped. Card images carry their
 * artist credit and copyright line along the bottom edge, and Scryfall's image
 * rules forbid clipping them.
 */
export async function toStorableDataUrl(source: Blob): Promise<string> {
  const bitmap = await createImageBitmap(source)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2D canvas context')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/webp', QUALITY)
  } finally {
    bitmap.close()
  }
}

/** Rejects non-images early, so the failure names the real problem. */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`“${file.name}” is not an image.`)
  }
  return toStorableDataUrl(file)
}

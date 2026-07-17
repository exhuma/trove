const MAX_EDGE = 512
const QUALITY = 0.82

/**
 * Scales an image down and re-encodes it as a WebP Blob, ready to upload to Storage.
 * A phone photo (several MB) becomes a small thumbnail; keeping it modest saves
 * bandwidth and storage.
 *
 * The whole image is preserved — scaled, never cropped. Card images carry their
 * artist credit and copyright line along the bottom edge, and Scryfall's image
 * rules forbid clipping them.
 */
export async function toStorableBlob(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2D canvas context')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
        'image/webp',
        QUALITY,
      )
    })
  } finally {
    bitmap.close()
  }
}

/** Rejects non-images early, so the failure names the real problem. */
export async function fileToStorableBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`“${file.name}” is not an image.`)
  }
  return toStorableBlob(file)
}

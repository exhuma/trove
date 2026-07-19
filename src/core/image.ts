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

// The trading-card proportion tiles letterbox to (see `aspect-card` in
// tailwind.config.js). A cropped art is reframed to this so it fills the tile.
const CARD_ASPECT = 488 / 680

/**
 * Scales an image down and re-encodes it as WebP like `toStorableBlob`, but
 * **centre-crops it to the card aspect** (cover fit) so it fills a portrait tile
 * edge-to-edge instead of letterboxing.
 *
 * Unlike `toStorableBlob` this clips the source, so it's only for Scryfall's
 * `art_crop` — the illustration alone, which carries no artist/copyright line to
 * preserve. Full card scans must keep `toStorableBlob` (their credit line lives on
 * the bottom edge, and Scryfall's image rules forbid clipping it).
 */
export async function cropToCardBlob(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  try {
    // The largest card-aspect rectangle that fits the source, centred (cover crop).
    const srcAspect = bitmap.width / bitmap.height
    const [sw, sh] =
      srcAspect > CARD_ASPECT
        ? [bitmap.height * CARD_ASPECT, bitmap.height] // source too wide: trim sides
        : [bitmap.width, bitmap.width / CARD_ASPECT] // source too tall: trim top/bottom
    const sx = (bitmap.width - sw) / 2
    const sy = (bitmap.height - sh) / 2

    const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw * scale)
    canvas.height = Math.round(sh * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2D canvas context')
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

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

const SYMBOL_EDGE = 256
const SYMBOL_PADDING = 40
const SYMBOL_RADIUS = 32

/**
 * Resolves a semantic Tailwind colour token to a concrete CSS colour by letting
 * the browser compute it. Keeps the canvas fill in sync with `tailwind.config.js`
 * without spelling a hex literal here (the repo forbids hex anywhere in `src/`).
 */
let coinFill: string | undefined
function inkColour(): string {
  if (coinFill) return coinFill
  const probe = document.createElement('span')
  probe.className = 'text-ink'
  document.body.appendChild(probe)
  coinFill = getComputedStyle(probe).color
  probe.remove()
  return coinFill
}

/**
 * Rasterises a vector set symbol (a Scryfall `icon_svg_uri`) into a storable WebP.
 *
 * Two reasons this can't reuse `toStorableBlob`: `createImageBitmap` has patchy
 * SVG support across browsers (an `<img>` load is reliable), and the symbols are
 * drawn black — invisible on Trove's dark tiles. So the glyph is centred, padded,
 * and laid on a light rounded "coin" (the conventional set-symbol look) so it
 * reads and every booster of a set looks consistent.
 */
export async function svgToStorableBlob(svg: Blob): Promise<Blob> {
  const url = URL.createObjectURL(svg)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not load that set symbol.'))
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = SYMBOL_EDGE
    canvas.height = SYMBOL_EDGE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2D canvas context')

    // The light coin the glyph sits on. arcTo (not roundRect) so the typings hold
    // across TypeScript's lib versions.
    ctx.fillStyle = inkColour()
    const e = SYMBOL_EDGE
    const r = SYMBOL_RADIUS
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.arcTo(e, 0, e, e, r)
    ctx.arcTo(e, e, 0, e, r)
    ctx.arcTo(0, e, 0, 0, r)
    ctx.arcTo(0, 0, e, 0, r)
    ctx.closePath()
    ctx.fill()

    // Centre the symbol in the padded box, preserving its aspect. An SVG with only
    // a viewBox may report no intrinsic size, so fall back to a square.
    const box = SYMBOL_EDGE - SYMBOL_PADDING * 2
    const iw = img.naturalWidth || box
    const ih = img.naturalHeight || box
    const scale = Math.min(box / iw, box / ih)
    const w = iw * scale
    const h = ih * scale
    ctx.drawImage(img, (SYMBOL_EDGE - w) / 2, (SYMBOL_EDGE - h) / 2, w, h)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the set symbol.'))),
        'image/webp',
        QUALITY,
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

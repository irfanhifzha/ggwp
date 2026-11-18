// Generates src-tauri/icons/source.png (1024x1024), the source for `npm run tauri icon`.
// Plain Node + zlib so it needs no image dependency. The mark is the workspace itself:
// one tall panel beside two stacked panels.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const SIZE = 1024
const SS = 3 // supersampling factor for smooth edges
const BG = [0x10, 0x11, 0x13]
const FG = [0xd8, 0xd8, 0xd8]
const R = 44 // panel corner radius

const panels = [
  { x: 168, y: 168, w: 310, h: 688 },
  { x: 518, y: 168, w: 338, h: 330 },
  { x: 518, y: 526, w: 338, h: 330 },
]

function insideRoundedRect(px, py, { x, y, w, h }) {
  const cx = Math.min(Math.max(px, x + R), x + w - R)
  const cy = Math.min(Math.max(py, y + R), y + h - R)
  if (px < x || px > x + w || py < y || py > y + h) return false
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= R * R
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1)
  raw[rowStart] = 0 // PNG filter: none
  for (let x = 0; x < SIZE; x++) {
    let hit = 0
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS
        const py = y + (sy + 0.5) / SS
        if (panels.some((panel) => insideRoundedRect(px, py, panel))) hit++
      }
    }
    const t = hit / (SS * SS)
    const offset = rowStart + 1 + x * 4
    raw[offset] = Math.round(BG[0] + (FG[0] - BG[0]) * t)
    raw[offset + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * t)
    raw[offset + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * t)
    raw[offset + 3] = 255
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

writeFileSync(new URL('../src-tauri/icons/source.png', import.meta.url), png)
console.log(`wrote src-tauri/icons/source.png (${png.length} bytes)`)

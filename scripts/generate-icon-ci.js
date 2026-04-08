/**
 * scripts/generate-icon-ci.js
 *
 * Generates a complete icon set using ONLY Node.js built-ins.
 * Zero npm dependencies — safe to run anywhere including GitHub Actions.
 *
 * Outputs:
 *   assets/icon.ico      — Windows icon (16×16, 32×32, 48×48)
 *   assets/icon.png      — 256×256 PNG
 *   assets/tray-icon.png — 22×22 PNG
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');      // Node built-in — no external dep

const ASSETS = path.join(__dirname, '..', 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

// Brand colour: #2D7EF8  →  R=45 G=126 B=248
const [R, G, B] = [45, 126, 248];

// ── CRC-32 for PNG chunks ────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF >>> 0;
  for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
  return ((c ^ 0xFFFFFFFF) >>> 0);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.allocUnsafe(4);
  const crcBuf    = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ── PNG encoder (uses Node's built-in zlib.deflateSync) ──────────────────────
function makePNG(w, h, r, g, b) {
  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB colour
  ihdr.fill(0, 10);

  // Raw scanlines: filter byte (0) + RGB pixels per row
  const raw = Buffer.allocUnsafe(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const base = y * (1 + w * 3);
    raw[base] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      raw[base + 1 + x * 3]     = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  // Compress with Node's built-in deflate (level 9)
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO encoder ──────────────────────────────────────────────────────────────
// Each entry uses a 32-bit BGRA BMP (BITMAPINFOHEADER + pixels + XOR + AND mask)
function makeBMPEntry(size, r, g, b) {
  const pixCount = size * size;
  const rowBytes = size * 4;           // 32 bpp, no padding needed (multiple of 4)
  const maskRow  = Math.ceil(size / 32) * 4;  // AND mask row, padded to DWORD

  const hdr    = Buffer.allocUnsafe(40);
  const pixels = Buffer.allocUnsafe(pixCount * 4);
  const masks  = Buffer.alloc(maskRow * size * 2, 0x00); // XOR + AND masks = transparent

  // BITMAPINFOHEADER
  hdr.writeInt32LE(40, 0);              // biSize
  hdr.writeInt32LE(size, 4);            // biWidth
  hdr.writeInt32LE(size * 2, 8);        // biHeight (×2 for ICO)
  hdr.writeUInt16LE(1, 12);             // biPlanes
  hdr.writeUInt16LE(32, 14);            // biBitCount
  hdr.writeUInt32LE(0, 16);             // biCompression: BI_RGB
  hdr.writeUInt32LE(pixCount * 4, 20);  // biSizeImage
  hdr.fill(0, 24, 40);                  // rest zero

  // BMP rows are bottom-up
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = ((size - 1 - y) * size + x) * 4;
      pixels[i]     = b;    // BGRA order
      pixels[i + 1] = g;
      pixels[i + 2] = r;
      pixels[i + 3] = 255;  // fully opaque
    }
  }

  return Buffer.concat([hdr, pixels, masks]);
}

function makeICO(sizes, r, g, b) {
  const images  = sizes.map(s => makeBMPEntry(s, r, g, b));
  const count   = sizes.length;
  const dirLen  = 6 + count * 16;

  // ICO file header + directory
  const header  = Buffer.allocUnsafe(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: 1 = ICO
  header.writeUInt16LE(count, 4);

  const entries = Buffer.allocUnsafe(count * 16);
  let   offset  = dirLen;

  images.forEach((img, i) => {
    const s   = sizes[i];
    const off = i * 16;
    entries[off]     = (s >= 256) ? 0 : s;   // width  (0 encodes 256)
    entries[off + 1] = (s >= 256) ? 0 : s;   // height
    entries[off + 2] = 0;                      // color count (0 = true colour)
    entries[off + 3] = 0;                      // reserved
    entries.writeUInt16LE(1,  off + 4);        // color planes
    entries.writeUInt16LE(32, off + 6);        // bits per pixel
    entries.writeUInt32LE(img.length, off + 8);
    entries.writeUInt32LE(offset,     off + 12);
    offset += img.length;
  });

  return Buffer.concat([header, entries, ...images]);
}

// ── Write all assets ─────────────────────────────────────────────────────────
console.log('\n🎨 Generating icon set for مدير عقاراتك...\n');

const ico = makeICO([16, 32, 48], R, G, B);
fs.writeFileSync(path.join(ASSETS, 'icon.ico'), ico);
console.log(`  ✅  assets/icon.ico        (${ico.length.toLocaleString()} bytes)  [16×16 + 32×32 + 48×48]`);

const png256 = makePNG(256, 256, R, G, B);
fs.writeFileSync(path.join(ASSETS, 'icon.png'), png256);
console.log(`  ✅  assets/icon.png        (${png256.length.toLocaleString()} bytes)  [256×256]`);

const png22 = makePNG(22, 22, R, G, B);
fs.writeFileSync(path.join(ASSETS, 'tray-icon.png'), png22);
console.log(`  ✅  assets/tray-icon.png   (${png22.length.toLocaleString()} bytes)  [22×22]`);

console.log('\n  Done. Replace with professional artwork before distributing.\n');

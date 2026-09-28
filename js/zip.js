/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — a ZIP writer with no dependencies.

   The package of Block 10 is an ordinary .zip: a local header and the data
   of each file, then the central directory, then its end record (PKWARE
   APPNOTE 6.3). Entries are deflated with the browser's own CompressionStream
   when it offers "deflate-raw", and stored as they are otherwise; a reader
   never notices the difference. Names are written in UTF-8 with the flag
   that says so. The CRC-32 is the same routine the figure export uses. */

const Zip = {};

(function () {

  const enc = new TextEncoder();
  const crc32 = bytes => Fig.crc32(bytes);

  function dosTime(d) {
    const t = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() >> 1) & 31);
    const dt = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
    return { t, dt };
  }
  async function deflate(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
      const cs = new CompressionStream('deflate-raw');
      const buf = await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) { return null; }
  }
  const toBytes = data => (data instanceof Uint8Array ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : enc.encode(String(data)));

  /* files: [{name, data: string | Uint8Array | ArrayBuffer | Blob}] → Blob (application/zip) */
  async function build(files, o) {
    const opt = Object.assign({ compress: true, date: new Date() }, o || {});
    const { t, dt } = dosTime(opt.date);
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      let raw = f.data instanceof Blob ? new Uint8Array(await f.data.arrayBuffer()) : toBytes(f.data);
      const crc = crc32(raw);
      let method = 0, body = raw;
      if (opt.compress && raw.length > 64) { const d = await deflate(raw); if (d && d.length < raw.length) { method = 8; body = d; } }
      const name = enc.encode(f.name.replace(/\\/g, '/'));
      const lh = new Uint8Array(30 + name.length);
      const v = new DataView(lh.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, method, true);
      v.setUint16(10, t, true); v.setUint16(12, dt, true); v.setUint32(14, crc, true); v.setUint32(18, body.length, true); v.setUint32(22, raw.length, true);
      v.setUint16(26, name.length, true); v.setUint16(28, 0, true);
      lh.set(name, 30);
      parts.push(lh, body);
      const ch = new Uint8Array(46 + name.length);
      const c = new DataView(ch.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, method, true);
      c.setUint16(12, t, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, body.length, true); c.setUint32(24, raw.length, true);
      c.setUint16(28, name.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, offset, true);
      ch.set(name, 46);
      central.push(ch);
      offset += lh.length + body.length;
    }
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(4, 0, true); e.setUint16(6, 0, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, offset, true); e.setUint16(20, 0, true);
    return new Blob(parts.concat(central, [end]), { type: 'application/zip' });
  }

  /* reads the central directory back: enough to check what was written */
  function list(buffer) {
    const b = new Uint8Array(buffer), v = new DataView(buffer);
    let i = b.length - 22;
    while (i >= 0 && v.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) return null;
    const n = v.getUint16(i + 10, true), cd = v.getUint32(i + 16, true);
    const out = [];
    let p = cd;
    const dec = new TextDecoder();
    for (let k = 0; k < n; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      const method = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true), comp = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true), nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      out.push({ name: dec.decode(b.subarray(p + 46, p + 46 + nl)), method, crc, comp, size, offset: off });
      p += 46 + nl + el + cl;
    }
    return out;
  }
  /* extracts one entry (for the tests): inflates with the browser when it was deflated */
  async function extract(buffer, entry) {
    const b = new Uint8Array(buffer), v = new DataView(buffer);
    const nl = v.getUint16(entry.offset + 26, true), el = v.getUint16(entry.offset + 28, true);
    const start = entry.offset + 30 + nl + el;
    const body = b.subarray(start, start + entry.comp);
    if (entry.method === 0) return body;
    const ds = new DecompressionStream('deflate-raw');
    return new Uint8Array(await new Response(new Blob([body]).stream().pipeThrough(ds)).arrayBuffer());
  }

  Object.assign(Zip, { build, list, extract, crc32 });
  if (typeof window !== 'undefined') window.Zip = Zip;
})();

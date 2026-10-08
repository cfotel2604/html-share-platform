import { deflateRawSync } from "node:zlib";

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Tiny ZIP fixtures with deliberate central/local metadata corruption options.
export function zipBytes(entries) {
  const chunks = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const body = Buffer.from(entry.body ?? "fixture");
    const compressed = entry.deflate ? deflateRawSync(body) : body;
    const local = Buffer.alloc(30), header = Buffer.alloc(46);
    const size = entry.size ?? body.length;
    const flags = entry.flags ?? 0;
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6); local.writeUInt16LE(entry.deflate ? 8 : 0, 8);
    local.writeUInt32LE(crc32(body), 14); local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(size, 22); local.writeUInt16LE(name.length, 26);
    header.writeUInt32LE(0x02014b50); header.writeUInt16LE(0x0314, 4); header.writeUInt16LE(20, 6);
    header.writeUInt16LE(flags, 8); header.writeUInt16LE(entry.deflate ? 8 : 0, 10);
    header.writeUInt32LE(crc32(body), 16); header.writeUInt32LE(compressed.length, 20);
    header.writeUInt32LE(size, 24); header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(((entry.mode ?? 0o100644) * 65536) >>> 0, 38);
    header.writeUInt32LE(offset, 42);
    chunks.push(local, name, compressed); central.push(header, name);
    offset += local.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}

export function hostileZips() {
  const root = { name: "index.html", body: "<!doctype html><p>fixture</p>" };
  return [
    ["traversal", [root, { name: "../escape.js" }]],
    ["absolute", [root, { name: "/escape.js" }]],
    ["drive path", [root, { name: "C:/escape.js" }]],
    ["symlink", [root, { name: "link.js", mode: 0o120777 }]],
    ["symlink directory", [root, { name: "link/", body: "", mode: 0o120777 }]],
    ["special file", [root, { name: "device.js", mode: 0o020644 }]],
    ["encrypted", [{ ...root, flags: 1 }]],
    ["strong encryption", [{ ...root, flags: 64 }]],
    ["duplicate", [root, root]],
    ["case collision", [root, { name: "INDEX.HTML" }]],
    ["directory collision", [root, { name: "assets/", body: "", mode: 0o040755 }, { name: "ASSETS/", body: "", mode: 0o040755 }]],
    ["file then child", [root, { name: "part.html" }, { name: "part.html/a.js" }]],
    ["child then file", [root, { name: "part.html/a.js" }, { name: "part.html" }]],
    ["missing index", [{ name: "other.html" }]],
    ["active type", [root, { name: "image.svg" }]],
    ["server code", [root, { name: "handler.php" }]],
    ["depth", [root, { name: "a/".repeat(12) + "deep.js" }]],
    ["file count", [root, ...Array.from({ length: 500 }, (_, i) => ({ name: `${i}.txt` }))]],
    ["entry count", [root, ...Array.from({ length: 1000 }, (_, i) => ({ name: `${i}/`, body: "", mode: 0o040755 }))]],
    ["declared bomb", [root, { name: "large.js", size: 101 * 1024 * 1024, deflate: true }]],
    ["lying size", [root, { name: "lie.js", body: "a".repeat(65536), size: 1, deflate: true }]],
  ].map(([label, entries]) => [label, zipBytes(entries)]);
}

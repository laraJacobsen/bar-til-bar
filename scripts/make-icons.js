const fs = require('fs');
const zlib = require('zlib');

function createPng(width, height, color) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const dx = x - width / 2;
      const dy = y - height / 2;
      const r = Math.hypot(dx / (width / 2), dy / (height / 2));
      const inside = r < 0.9;
      const [r1, g1, b1] = inside ? color : [2, 6, 23];
      row[1 + x * 4] = r1;
      row[2 + x * 4] = g1;
      row[3 + x * 4] = b1;
      row[4 + x * 4] = 255;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    Buffer.from([width >> 24 & 255, width >> 16 & 255, width >> 8 & 255, width & 255]),
    Buffer.from([height >> 24 & 255, height >> 16 & 255, height >> 8 & 255, height & 255]),
    Buffer.from([8, 6, 0, 0, 0]),
  ]);
  const idat = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('IDAT'), compressed]);
  const iend = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('IEND')]);
  return Buffer.concat([signature, ihdr, idat, iend]);
}

fs.writeFileSync('public/icon-192.png', createPng(192, 192, [244, 63, 94]));
fs.writeFileSync('public/icon-512.png', createPng(512, 512, [244, 63, 94]));

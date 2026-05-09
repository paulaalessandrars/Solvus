/**
 * Gera icon.ico do Solvus — zero dependências externas, só Node.js puro.
 * Uso: node generate-icon.js
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const W = 256, H = 256;
const px = new Uint8Array(W * H * 4); // buffer RGBA

// ── Helpers ────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function lerpC(c1, c2, t) { return c1.map((v, i) => lerp(v, c2[i], t) | 0); }

function put(x, y, r, g, b, a = 255) {
    x = x | 0; y = y | 0;
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    const sa = a / 255, da = px[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa < 0.001) return;
    px[i]     = (r * sa + px[i]     * da * (1 - sa)) / oa;
    px[i + 1] = (g * sa + px[i + 1] * da * (1 - sa)) / oa;
    px[i + 2] = (b * sa + px[i + 2] * da * (1 - sa)) / oa;
    px[i + 3] = oa * 255;
}

// ── Primitivos de desenho ──────────────────────────────────────

// Retângulo arredondado preenchido
function fillRRect(x1, y1, w, h, rad, colorFn) {
    const x2 = x1 + w, y2 = y1 + h;
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            let alpha = 1;
            let dx = 0, dy = 0, corner = false;
            if      (x < x1 + rad && y < y1 + rad) { dx = x1 + rad - x; dy = y1 + rad - y; corner = true; }
            else if (x > x2 - rad && y < y1 + rad) { dx = x - x2 + rad; dy = y1 + rad - y; corner = true; }
            else if (x < x1 + rad && y > y2 - rad) { dx = x1 + rad - x; dy = y - y2 + rad; corner = true; }
            else if (x > x2 - rad && y > y2 - rad) { dx = x - x2 + rad; dy = y - y2 + rad; corner = true; }
            if (corner) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > rad + 1) continue;
                alpha = Math.min(1, rad - dist + 1);
            }
            const [r, g, b] = colorFn((x - x1) / w, (y - y1) / h);
            put(x, y, r, g, b, (alpha * 255) | 0);
        }
    }
}

// Arco de anel (donut parcial) com anti-aliasing
function fillArc(cx, cy, innerR, outerR, fromDeg, toDeg, colorFn) {
    const from = fromDeg * Math.PI / 180;
    const to   = toDeg   * Math.PI / 180;
    const pad  = 2;
    for (let y = (cy - outerR - pad) | 0; y <= (cy + outerR + pad) | 0; y++) {
        for (let x = (cx - outerR - pad) | 0; x <= (cx + outerR + pad) | 0; x++) {
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < innerR - 1 || dist > outerR + 1) continue;

            let angle = Math.atan2(dy, dx);
            while (angle < from - 0.001) angle += Math.PI * 2;
            if (angle > to + 0.001) continue;

            const iA = Math.min(1, dist - innerR + 1);
            const oA = Math.min(1, outerR - dist + 1);
            const alpha = Math.min(iA, oA);
            if (alpha <= 0) continue;

            const t = (angle - from) / (to - from);
            const [r, g, b] = colorFn(Math.max(0, Math.min(1, t)));
            put(x, y, r, g, b, (alpha * 255) | 0);
        }
    }
}

// Linha espessa com anti-aliasing
function fillLine(x1, y1, x2, y2, thick, r, g, b) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len, ny = dx / len; // normal
    const steps = len * 2 | 0;
    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const mx = lerp(x1, x2, t), my = lerp(y1, y2, t);
        for (let w = -thick; w <= thick; w += 0.5) {
            const alpha = Math.min(1, thick - Math.abs(w) + 1);
            put(mx + nx * w, my + ny * w, r, g, b, (alpha * 255) | 0);
        }
    }
}

// ── Cores do Solvus ───────────────────────────────────────────
const PURPLE = [187, 134, 252];
const TEAL   = [3,   218, 198];
const DARK   = [22,  14,  45];
const DARK2  = [10,  20,  38];

// ── Desenha o ícone ───────────────────────────────────────────

// 1. Fundo escuro com gradiente sutil
fillRRect(0, 0, W - 1, H - 1, 52, (tx, ty) => {
    const d = Math.sqrt((tx - 0.5) ** 2 + (ty - 0.5) ** 2) / 0.7;
    return lerpC(DARK, DARK2, Math.min(1, d));
});

// 2. Brilho sutil no canto superior esquerdo
fillArc(30, 30, 0, 85, 0, 360, t => {
    const a = Math.max(0, 0.06 - t * 0.06);
    return PURPLE.map(v => Math.min(255, v));
    // apenas para definir a cor, alpha é controlado abaixo
});
// brilho via círculo simples
for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) {
    const d = Math.sqrt((x - 30) ** 2 + (y - 30) ** 2);
    if (d < 85) put(x, y, PURPLE[0], PURPLE[1], PURPLE[2], ((1 - d / 85) * 18) | 0);
}
for (let y = 136; y < 256; y++) for (let x = 136; x < 256; x++) {
    const d = Math.sqrt((x - 226) ** 2 + (y - 226) ** 2);
    if (d < 85) put(x, y, TEAL[0], TEAL[1], TEAL[2], ((1 - d / 85) * 18) | 0);
}

// 3. Letra S: dois arcos de anel
const outerR = 54, innerR = 34;
// Centro do arco superior e inferior
const cy1 = 100, cy2 = 158, cx = 128;

// Arco superior → metade direita (de −90° até +90°, sentido horário pela direita)
// Cor: PURPLE → mix
fillArc(cx, cy1, innerR, outerR, -90, 90, t =>
    lerpC(PURPLE, lerpC(PURPLE, TEAL, 0.4), t)
);

// Arco inferior → metade esquerda (de 90° até 270°, pela esquerda)
// Cor: mix → TEAL
fillArc(cx, cy2, innerR, outerR, 90, 270, t =>
    lerpC(lerpC(PURPLE, TEAL, 0.4), TEAL, t)
);

// Linha central de ligação (onde os dois arcos se encontram)
fillLine(cx, cy1 + outerR - 4, cx, cy2 - outerR + 4, (outerR - innerR) / 2,
    lerpC(PURPLE, TEAL, 0.5)[0], lerpC(PURPLE, TEAL, 0.5)[1], lerpC(PURPLE, TEAL, 0.5)[2]);

// 4. Traço de acento embaixo
const acX1 = 80, acX2 = 176, acY = 220, acH = 7;
for (let y = acY; y <= acY + acH; y++) {
    for (let x = acX1; x <= acX2; x++) {
        const t = (x - acX1) / (acX2 - acX1);
        const alpha = Math.min(1, Math.min(x - acX1, acX2 - x, y - acY, acY + acH - y) + 1);
        const [r, g, b] = lerpC(PURPLE, TEAL, t);
        put(x, y, r, g, b, (alpha * 170) | 0);
    }
}

// ── Codifica PNG (puro Node.js) ───────────────────────────────
function uint32BE(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n, 0);
    return b;
}
function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const byte of buf) {
        c ^= byte;
        for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
    const tBuf = Buffer.from(type, 'ascii');
    const cBuf = Buffer.concat([tBuf, data]);
    const crc  = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(cBuf), 0);
    return Buffer.concat([uint32BE(data.length), tBuf, data, crc]);
}

function makePNG(pixels, w, h) {
    // Adiciona byte de filtro 0 em cada linha
    const raw = Buffer.alloc(h * (1 + w * 4));
    for (let y = 0; y < h; y++) {
        raw[y * (1 + w * 4)] = 0;
        for (let x = 0; x < w; x++) {
            const si = (y * w + x) * 4;
            const di = y * (1 + w * 4) + 1 + x * 4;
            raw[di]     = pixels[si];
            raw[di + 1] = pixels[si + 1];
            raw[di + 2] = pixels[si + 2];
            raw[di + 3] = pixels[si + 3];
        }
    }
    const compressed = zlib.deflateSync(raw);

    const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    return Buffer.concat([
        sig,
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', compressed),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}

// ── Monta ICO com múltiplos tamanhos ──────────────────────────
async function buildICO(mainPng) {
    const sizes  = [256, 128, 64, 48, 32, 16];
    const images = await Promise.all(sizes.map(s => resizePNG(mainPng, W, s)));

    const count  = images.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);

    let offset = 6 + 16 * count;
    const dirs = images.map((img, i) => {
        const d = Buffer.alloc(16);
        const s = sizes[i];
        d.writeUInt8(s === 256 ? 0 : s, 0);
        d.writeUInt8(s === 256 ? 0 : s, 1);
        d.writeUInt8(0, 2); d.writeUInt8(0, 3);
        d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
        d.writeUInt32LE(img.length, 8);
        d.writeUInt32LE(offset, 12);
        offset += img.length;
        return d;
    });

    return Buffer.concat([header, ...dirs, ...images]);
}

// Redimensiona PNG via bilinear (puro JS)
function resizePNG(srcBuf, srcSize, dstSize) {
    return new Promise(resolve => {
        // Decodifica o PNG de volta para pixels (só funciona para nosso formato)
        // Para simplicidade: se srcSize === dstSize, retorna o PNG original
        if (srcSize === dstSize) return resolve(srcBuf);

        // Cria buffer de destino redimensionado
        const dst = new Uint8Array(dstSize * dstSize * 4);
        const scale = srcSize / dstSize;

        for (let y = 0; y < dstSize; y++) {
            for (let x = 0; x < dstSize; x++) {
                const sx = x * scale, sy = y * scale;
                const x0 = Math.floor(sx), y0 = Math.floor(sy);
                const x1 = Math.min(x0 + 1, srcSize - 1);
                const y1 = Math.min(y0 + 1, srcSize - 1);
                const tx = sx - x0, ty = sy - y0;

                const di = (y * dstSize + x) * 4;
                for (let c = 0; c < 4; c++) {
                    const i00 = (y0 * srcSize + x0) * 4 + c;
                    const i10 = (y0 * srcSize + x1) * 4 + c;
                    const i01 = (y1 * srcSize + x0) * 4 + c;
                    const i11 = (y1 * srcSize + x1) * 4 + c;
                    dst[di + c] = lerp(lerp(px[i00], px[i10], tx), lerp(px[i01], px[i11], tx), ty);
                }
            }
        }
        resolve(makePNG(dst, dstSize, dstSize));
    });
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
    console.log('🎨 Gerando ícone Solvus...');

    const mainPng = makePNG(px, W, H);
    const ico     = await buildICO(mainPng);

    fs.writeFileSync(path.join(__dirname, 'icon.ico'), ico);
    console.log(`✅ icon.ico gerado! (${(ico.length / 1024).toFixed(1)} KB)`);
    console.log('   Agora rode: npm run build');
})();

import * as T from 'three';

export function texture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function lattice(x, y) {
  let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y, period = 0) {
  const i = Math.floor(x), j = Math.floor(y);
  const u = x - i, v = y - j;
  const sx = u * u * (3 - 2 * u), sy = v * v * (3 - 2 * v);
  const a = period ? i % period : i, b = period ? j % period : j;
  const c = period ? (i + 1) % period : i + 1, d = period ? (j + 1) % period : j + 1;
  const north = T.MathUtils.lerp(lattice(a, b), lattice(c, b), sx);
  const south = T.MathUtils.lerp(lattice(a, d), lattice(c, d), sx);
  return T.MathUtils.lerp(north, south, sy);
}

function pixels(ctx, width, height, sample) {
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) sample(image.data, (y * width + x) * 4, x, y);
  }
  ctx.putImageData(image, 0, 0);
}

function woodGrain(curvature) {
  return texture(1024, 512, (ctx, width, height) => {
    pixels(ctx, width, height, (data, i, x, y) => {
      // Warp the growth rings and pores together so the fibers follow the grain.
      const contour = noise(x / 278, y / 82);
      const fiber = y + contour * curvature + noise(x / 130, y / 34) * curvature * .14;
      const ring = .5 + .5 * Math.sin(fiber * .44 + contour * 5);
      const latewood = Math.pow(ring, 6) * (9 + 14 * noise(x / 100, y / 19));
      const pores = Math.max(0, noise(x / 27, fiber * .71) - .55) * 47;
      const color = (contour - .5) * 27 + (noise(x / 113, fiber / 8) - .5) * 26;
      const grain = color - latewood - pores + (lattice(x, y) - .5) * 8;
      data[i] = 195 + grain;
      data[i + 1] = 140 + grain * .93;
      data[i + 2] = 90 + grain * .84;
      data[i + 3] = 255;
    });
  });
}

function oakBoards(grain) {
  return texture(2048, 1536, (ctx, width, height) => {
    const next = random(1927);
    const courses = 53;
    for (let row = 0; row < courses; row++) {
      const y = Math.floor(row * height / courses);
      const depth = Math.floor((row + 1) * height / courses) - y;
      for (let x = -Math.floor(next() * 245); x < width;) {
        const length = 165 + Math.floor(next() * 248);
        const sourceWidth = 510 + Math.floor(next() * 482);
        const sx = Math.floor(next() * (grain.width - sourceWidth));
        const sy = Math.floor(next() * (grain.height - 52));
        ctx.drawImage(grain, sx, sy, sourceWidth, 52, x, y, length, depth);
        ctx.fillStyle = next() < .56
          ? `rgba(84, 45, 22, ${next() * .19})`
          : `rgba(247, 215, 163, ${next() * .12})`;
        ctx.fillRect(x, y, length, depth);
        ctx.fillStyle = 'rgba(111, 68, 39, .48)';
        ctx.fillRect(x, y, 1.35, depth);
        ctx.fillStyle = 'rgba(248, 214, 165, .34)';
        ctx.fillRect(x + 1.35, y, .9, depth);
        x += length;
      }
      ctx.fillStyle = 'rgba(111, 63, 33, .49)';
      ctx.fillRect(0, y, width, 1.2);
      ctx.fillStyle = 'rgba(251, 213, 165, .31)';
      ctx.fillRect(0, y + 1.2, width, 1.05);
    }
  });
}

function repeating(map, x, y) {
  const repeated = map.clone();
  repeated.wrapS = repeated.wrapT = T.RepeatWrapping;
  repeated.repeat.set(x, y);
  return repeated;
}

function textured(map, { color = '#ffffff', roughness, bumpScale }) {
  return new T.MeshStandardMaterial({ color, map, roughness, bumpMap: map, bumpScale });
}

export function workshopMaterials(wallWidth, roomDepth, wallHeight) {
  const grain = woodGrain(62);
  const floorGrain = woodGrain(18);
  const plaster = texture(384, 384, (ctx, width, height) => {
    pixels(ctx, width, height, (data, i, x, y) => {
      const mottling = noise(x / 48, y / 48, 8) - .5;
      const stipple = noise(x / 3, y / 3, 128) - .5;
      const value = 248 + mottling * 10 + stipple * 6 + (lattice(x, y) - .5) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    });
  });
  const cloth = texture(256, 256, (ctx, width, height) => {
    pixels(ctx, width, height, (data, i, x, y) => {
      const warp = Math.sin(Math.PI * x / 4);
      const weft = Math.sin(Math.PI * y / 4);
      const over = ((x >> 2) + (y >> 2)) % 2 ? warp * warp : weft * weft;
      const mottle = noise(x / 16, y / 16, 16) - .5;
      const value = 217 + 28 * over + mottle * 15 + (lattice(x, y) - .5) * 9;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    });
  });
  const kraft = texture(256, 256, (ctx, width, height) => {
    pixels(ctx, width, height, (data, i, x, y) => {
      const value = 232 + (noise(x / 27, y / 14) - .5) * 19 + (lattice(x, y) - .5) * 15;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    });
  });
  const filament = texture(48, 128, (ctx, width, height) => {
    ctx.fillStyle = '#e9e9e9';
    ctx.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y += 9) {
      ctx.fillStyle = '#747474';
      ctx.fillRect(0, y, width, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, y + 2, width, 2);
    }
  });
  const powder = texture(128, 128, (ctx, width, height) => {
    pixels(ctx, width, height, (data, i, x, y) => {
      const value = 238 + (lattice(x, y) - .5) * 18;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    });
  });
  return {
    desk: textured(grain, { roughness: .46, bumpScale: .017 }),
    shelf: textured(grain, { color: '#eed8b5', roughness: .56, bumpScale: .017 }),
    shelfBack: textured(grain, { color: '#d8c0a3', roughness: .69, bumpScale: .013 }),
    floor: textured(oakBoards(floorGrain.image), { color: '#f2efeb', roughness: .57, bumpScale: .018 }),
    wall: textured(repeating(plaster, wallWidth / 4, wallHeight / 4), { color: '#a1ac83', roughness: .98, bumpScale: .005 }),
    sideWall: textured(repeating(plaster, roomDepth / 4, wallHeight / 4), { color: '#8c996f', roughness: .98, bumpScale: .005 }),
    chair: textured(repeating(cloth, 2, 2), { color: '#75815b', roughness: .93, bumpScale: .008 }),
    deskMat: textured(repeating(cloth, 4, 2), { color: '#38332c', roughness: .97, bumpScale: .009 }),
    deskFrame: textured(powder, { color: '#353536', roughness: .79, bumpScale: .004 }),
    cardboard: textured(kraft, { color: '#b58c63', roughness: .93, bumpScale: .011 }),
    filament: ['#5d9bc9', '#d77a52', '#63b9a8', '#e4bf6d'].map(color => textured(filament, { color, roughness: .44, bumpScale: .003 })),
    powderCoat: new T.MeshStandardMaterial({ color: '#363432', roughness: .55, metalness: .18 }),
  };
}

export function drawCork(ctx, width, height) {
  ctx.fillStyle = '#af8054';
  ctx.fillRect(0, 0, width, height);
  const next = random(413);
  const chips = ['#7045236b', '#915d37a0', '#c59662bd', '#ddae798f', '#ecc09394'];
  for (let i = 0; i < 23000; i++) {
    const x = next() * width, y = next() * height;
    const size = .6 + Math.pow(next(), 2.6) * 6;
    ctx.fillStyle = chips[Math.floor(next() * chips.length)];
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size * .2, y - size * .64);
    ctx.lineTo(x + size * .93, y - size * .12);
    ctx.lineTo(x + size * .45, y + size * .56);
    ctx.lineTo(x - size * .46, y + size * .48);
    ctx.fill();
  }
}

export function leafTexture() {
  return texture(256, 320, (ctx, width, height) => {
    pixels(ctx, width, height, (data, i, x, y) => {
      const fade = Math.abs(x - width / 2) / (width / 2) * 17;
      const mottle = (noise(x / 43, y / 56) - .5) * 28;
      const value = 245 - fade + mottle + (lattice(x, y) - .5) * 5;
      data[i] = value - 3;
      data[i + 1] = value;
      data[i + 2] = value - 11;
      data[i + 3] = 255;
    });
    ctx.strokeStyle = '#f2f4c467';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(128, 286);
    ctx.quadraticCurveTo(121, 178, 128, 3);
    for (let i = 0; i < 6; i++) {
      const y = 76 + i * 33;
      const span = 35 + i * 11;
      ctx.moveTo(125, y);
      ctx.quadraticCurveTo(128 - span * .55, y - 18, 128 - span, y - 44);
      ctx.moveTo(126, y + 8);
      ctx.quadraticCurveTo(128 + span * .57, y - 14, 128 + span, y - 37);
    }
    ctx.stroke();
  });
}

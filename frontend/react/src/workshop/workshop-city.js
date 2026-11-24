import { random, texture } from './workshop-materials.js';

const width = 480, height = 646;
const quadrants = { winter: [0, 0], spring: [1, 0], summer: [0, 1], autumn: [1, 1] };
const effects = {
  winter: { count: 128, speed: 43, wind: 16, sway: 16 },
  spring: { count: 110, speed: 248, wind: 53, sway: 1 },
  autumn: { count: 27, speed: 33, wind: 43, sway: 32 },
};
const leafColors = ['#b96534', '#d19547', '#bc7435', '#dca65a', '#a14736'];
const lamp = { x: .378 * width, y: .94 * height, head: .51 * height };

export async function loadEveningBackdrop() {
  const image = new Image();
  image.src = '/scenery/lyublino-evening.webp';
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

function halo(ctx, x, y, radius, color) {
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color);
  light.addColorStop(1, color.slice(0, 7) + '00');
  ctx.fillStyle = light;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function paintMoon(ctx) {
  const x = width * .80, y = height * .15;
  halo(ctx, x, y, 29, '#dbe9ff20');
  ctx.fillStyle = '#c9d5e1';
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 8);
  ctx.bezierCurveTo(x + 13, y - 3, x + 9, y + 10, x - 4, y + 8);
  ctx.bezierCurveTo(x + 3, y + 5, x + 5, y - 2, x + 2, y - 8);
  ctx.fill();
}

function paintLamp(ctx, season) {
  const { x, y, head } = lamp;
  const bulb = x - 25;
  ctx.save();
  ctx.translate(x - 26, y - 7);
  ctx.scale(1.28, season === 'spring' ? .62 : .40);
  halo(ctx, 0, 0, 55, season === 'spring' ? '#edb36639' : '#e9b36629');
  ctx.restore();
  halo(ctx, bulb, head + 10, 60, '#ffc87a43');
  ctx.strokeStyle = '#191f22';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, head + 24);
  ctx.quadraticCurveTo(x, head + 2, x - 22, head + 3);
  ctx.lineTo(x - 29, head + 3);
  ctx.stroke();
  ctx.strokeStyle = '#7c7357';
  ctx.lineWidth = .8;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 2);
  ctx.lineTo(x + 1, head + 25);
  ctx.stroke();
  ctx.fillStyle = '#272a29';
  ctx.beginPath();
  ctx.ellipse(bulb - 2, head + 5, 10, 3.3, -.10, 0, Math.PI * 2);
  ctx.fill();
  halo(ctx, bulb - 2, head + 8, 23, '#ffd89878');
  ctx.fillStyle = '#ffe2af';
  ctx.beginPath();
  ctx.ellipse(bulb - 2, head + 7, 6, 1.7, -.12, 0, Math.PI * 2);
  ctx.fill();
}

function lampBeam(x, y) {
  const depth = (y - lamp.head - 5) / (lamp.y - lamp.head);
  if (depth < 0 || depth > 1.10) return 0;
  const reach = 14 + depth * 82;
  const offset = Math.abs(x - lamp.x + 24 + 12 * depth);
  return Math.max(0, 1 - offset / reach) ** 1.6 * (1 - depth * .34);
}

function darkenCourtyard(ctx) {
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let y = 0; y < height; y++) {
    const down = (y - lamp.y + 13) / 72;
    for (let x = 0; x < width; x++) {
      const offset = (x - lamp.x + 30) / 94;
      const ground = Math.max(0, 1 - offset * offset - down * down) ** 1.25;
      const amount = ground * .93 + lampBeam(x, y) * .09;
      const index = (y * width + x) * 4;
      const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
      pixels[index] = Math.min(32, r * .22) + (r * 1.19 + 26) * amount;
      pixels[index + 1] = Math.min(34, g * .24) + (g * .88 + 15) * amount;
      pixels[index + 2] = Math.min(45, b * .30) + (b * .52 + 6) * amount;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function paintBackdrop(ctx, art, season) {
  if (art) {
    const [col, row] = quadrants[season];
    const panelWidth = art.width / 2, panelHeight = art.height / 2;
    const crop = panelWidth - 2;
    ctx.drawImage(art, col * panelWidth + 1, (row + .105) * panelHeight,
      crop, crop * height / width, 0, 0, width, height);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#31466a');
    sky.addColorStop(1, '#34454e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
  }
  darkenCourtyard(ctx);
  if (season === 'summer') paintMoon(ctx);
  paintLamp(ctx, season);
}

function wrap(value, span) {
  return value - Math.floor(value / span) * span;
}

function drawLeaf(ctx, x, y, size, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(.33 + Math.abs(Math.cos(angle * .73)) * .67, 1);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * .86, -size * .26, size * .6, size * .57, 0, size);
  ctx.bezierCurveTo(-size * .6, size * .57, -size * .86, -size * .26, 0, -size);
  ctx.fill();
  ctx.strokeStyle = '#f9d69e80';
  ctx.lineWidth = .45;
  ctx.beginPath();
  ctx.moveTo(0, size * 1.2);
  ctx.lineTo(0, -size * .64);
  ctx.stroke();
  ctx.restore();
}

export function cityTexture(backdrop) {
  const map = texture(width, height, () => {});
  const particles = texture(width, height, () => {});
  const ctx = map.image.getContext('2d');
  const air = particles.image.getContext('2d');
  const next = random(881);
  const seeds = Array.from({ length: effects.winter.count }, () => ({
    x: next() * width, y: next() * height, depth: .19 + next() * .81,
    phase: next() * 6.283, drift: next() * .62 + .38, opacity: .35 + next() * .55,
  }));
  let season, last = -Infinity;

  function draw(time) {
    const { count, speed, wind, sway } = effects[season];
    const t = time / 1000;
    air.clearRect(0, 0, width, height);
    for (let i = 0; i < count; i++) {
      const { x, y, depth, phase, drift, opacity } = seeds[i];
      const swing = Math.sin(t * drift + phase);
      const px = wrap(x + t * wind * depth + swing * sway * depth, width + 36) - 18;
      const py = wrap(y + t * speed * depth, height + 36) - 18;
      const beam = lampBeam(px, py);
      const nearLamp = beam > .25;
      air.globalAlpha = opacity * (.045 + beam * .955);
      air.beginPath();
      if (season === 'spring') {
        const length = 4.5 + 16 * depth;
        air.strokeStyle = nearLamp ? '#ffe5bf' : '#dbeaffae';
        air.lineWidth = .5 + depth * .45;
        air.moveTo(px, py);
        air.lineTo(px + length * .23, py + length);
        air.stroke();
      } else if (season === 'autumn') {
        drawLeaf(air, px, py, 2 + 5.4 * depth, phase + t * (drift - .58) * 4,
          leafColors[i % leafColors.length]);
      } else {
        const size = .72 + 3.25 * depth ** 3;
        if (depth > .69) {
          halo(air, px, py, size * 2.1, nearLamp ? '#fff0cbb5' : '#eff6ffb5');
        }
        air.fillStyle = nearLamp ? '#ffedc9' : '#f3f7ff';
        air.beginPath();
        air.arc(px, py, size * .73, 0, Math.PI * 2);
        air.fill();
      }
    }
    air.globalAlpha = 1;
    particles.needsUpdate = true;
  }

  function paint(nextSeason) {
    season = nextSeason;
    paintBackdrop(ctx, backdrop, season);
    map.needsUpdate = true;
    const visible = season !== 'summer';
    if (visible) draw(performance.now());
    return visible;
  }

  function animate(time) {
    if (time - last < 32) return false;
    draw(time);
    last = time;
    return true;
  }

  return { map, particles, paint, animate };
}

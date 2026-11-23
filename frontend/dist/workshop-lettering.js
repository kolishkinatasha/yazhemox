import * as T from 'three';

const svgNamespace = 'http://www.w3.org/2000/svg';
const rimSegments = 48;

function addCurvedText(button, title, id) {
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const baseline = document.createElementNS(svgNamespace, 'path');
  baseline.id = id;
  baseline.setAttribute('fill', 'none');
  const text = document.createElementNS(svgNamespace, 'text');
  const textPath = document.createElementNS(svgNamespace, 'textPath');
  textPath.setAttribute('href', `#${id}`);
  textPath.setAttribute('startOffset', '50%');
  textPath.setAttribute('text-anchor', 'middle');
  textPath.textContent = title.toUpperCase();
  text.append(textPath);
  svg.append(baseline, text);
  button.append(svg);
  return { svg, baseline };
}

function upperRimY(outline, x) {
  let top = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    if (x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x)) continue;
    const y = a.x === b.x ? Math.min(a.y, b.y) : T.MathUtils.lerp(a.y, b.y, (x - a.x) / (b.x - a.x));
    top = Math.min(y, top);
  }
  return top;
}

export function createWorkshopLettering(layer, activate) {
  const labels = [];
  const attachments = new WeakMap();
  const start = new T.Vector3(), end = new T.Vector3();
  const measure = document.createElement('canvas').getContext('2d');

  function add({ id, key = id, object, title, edge, rim, side = -1, at = .5, rotation, views }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'object-lettering';
    button.dataset.action = id;
    button.dataset.label = key;
    button.setAttribute('aria-label', title);
    const curve = rim ? addCurvedText(button, title, `object-lettering-rim-${labels.length}`) : null;
    if (!curve) button.textContent = title;
    button.hidden = true;
    button.onclick = () => activate(id);
    layer.append(button);
    labels.push({ button, object, title, edge, rim, curve, side, at, rotation, views });
  }

  function positionCurvedLabel({ button, object, title, curve, rim }, camera, width, height) {
    const { elevation, radius, gap } = rim;
    const outline = [];
    for (let i = 0; i < rimSegments; i++) {
      const angle = i / rimSegments * Math.PI * 2;
      object.localToWorld(start.set(radius[0] * Math.cos(angle), elevation, radius[1] * Math.sin(angle))).project(camera);
      if (start.z < -1 || start.z > 1) return false;
      outline.push({ x: (start.x + 1) * width / 2, y: (1 - start.y) * height / 2 });
    }
    const left = Math.min(...outline.map(point => point.x));
    const right = Math.max(...outline.map(point => point.x));
    const span = right - left;
    if (span < 1 || right < 0 || left > width) return false;

    const style = getComputedStyle(button);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const capitals = title.toUpperCase();
    const tracking = parseFloat(style.letterSpacing) || 0;
    const textWidth = measure.measureText(capitals).width + capitals.length * tracking;
    const halfPath = Math.ceil(textWidth / 2 + 7);
    let center = (left + right) / 2;
    if (left < 0 || right > width) {
      const minCenter = Math.max(left, 0) + textWidth / 2 + 2;
      const maxCenter = Math.min(right, width) - textWidth / 2 - 2;
      if (minCenter > maxCenter) return false;
      center = T.MathUtils.clamp(center, minCenter, maxCenter);
    }
    const middle = upperRimY(outline, center) - gap;
    if (middle < 0 || middle > height) return false;
    // Fit the text without sending its end letters around the steep sides of the rim.
    const sample = Math.min(halfPath, span * .37, center - left, right - center);
    const y0 = upperRimY(outline, center - sample) - gap;
    const y1 = upperRimY(outline, center + sample) - gap;
    // The upper outline changes from the far arc to the near arc when the camera looks up at the rim.
    const control = 2 * middle - (y0 + y1) / 2;
    const fontSize = parseFloat(style.fontSize);
    const top = Math.min(y0, y1, control) - fontSize;
    const bottom = Math.max(y0, y1, control) + fontSize * .35;
    const pathWidth = halfPath * 2 + 4;
    curve.svg.setAttribute('width', pathWidth);
    curve.svg.setAttribute('height', bottom - top);
    curve.baseline.setAttribute('d', `M 2 ${y0 - top} Q ${halfPath + 2} ${control - top} ${pathWidth - 2} ${y1 - top}`);

    button.hidden = false;
    button.style.left = `${center}px`;
    button.style.top = `${(top + bottom) / 2}px`;
    button.style.transform = 'translate(-50%, -50%)';
    const angle = Math.atan2(y1 - y0, 2 * sample);
    attachments.set(button, { angle, span });
    return true;
  }

  function update(camera, width, height, zone) {
    for (const label of labels) {
      const { button, object, edge, curve, side, at, rotation, views } = label;
      if (!views.includes(zone)) {
        button.hidden = true;
        continue;
      }
      if (curve) {
        button.hidden = !positionCurvedLabel(label, camera, width, height);
        continue;
      }
      object.localToWorld(start.fromArray(edge[0])).project(camera);
      object.localToWorld(end.fromArray(edge[1])).project(camera);
      const x = (T.MathUtils.lerp(start.x, end.x, at) + 1) * width / 2;
      const y = (1 - T.MathUtils.lerp(start.y, end.y, at)) * height / 2;
      if (start.z < -1 || end.z < -1 || start.z > 1 || end.z > 1
        || x < 0 || x > width || y < 0 || y > height) {
        button.hidden = true;
        continue;
      }

      const dx = (end.x - start.x) * width / 2;
      const dy = (start.y - end.y) * height / 2;
      const direction = Math.atan2(dy, dx);
      const angle = rotation ?? direction;
      button.hidden = false;
      const gap = side * 11;
      const left = x - Math.sin(direction) * gap;
      const top = y + Math.cos(direction) * gap;
      button.style.left = `${left}px`;
      button.style.top = `${top}px`;
      button.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
      const span = Math.max(1, Math.hypot(dx, dy));
      attachments.set(button, { angle: direction, span });
    }
  }

  return { add, update, attachmentFor: button => attachments.get(button) };
}

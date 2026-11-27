import * as T from 'three';
import { createA1 } from './printer.js';
import { createProduct } from './product-models.js';
import { drawCork, leafTexture, random, texture, workshopMaterials } from './workshop-materials.js';
import { addWorkshopCat } from './workshop-cat.js';
import { catalogue } from './workshop-catalog.js';
import { cityTexture } from './workshop-city.js';
import { roundedBoxGeometry } from './workshop-geometry.js';

const backWall = -2.72;
const rightWall = 7.12;
const worktop = 1.94;
const ceilingHeight = 7.8;
const material = (color, roughness = .75) => new T.MeshStandardMaterial({ color, roughness });
const dark = material('#343331');
const black = material('#242526');
const paper = material('#ece3d5');
const pale = material('#dfd6c7');
const green = material('#465f44');

function mesh(parent, geometry, surface, x, y, z) {
  const object = new T.Mesh(geometry, surface);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, surface, w, h, d, x, y, z, segments = [1, 1, 1]) {
  return mesh(parent, new T.BoxGeometry(w, h, d, ...segments), surface, x, y, z);
}

function roundedBox(parent, surface, w, h, d, radius, x, y, z) {
  return mesh(parent, roundedBoxGeometry(w, h, d, radius), surface, x, y, z);
}

function woodenWorktop(parent, surface, w, h, d) {
  const object = roundedBox(parent, surface, w, h, d, .024, 0, worktop - h / 2, 0);
  const { normal, uv } = object.geometry.attributes;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(normal.getY(i)) < .9) uv.setY(i, .31 + uv.getY(i) * h / 1.35);
  }
  return object;
}

function cylinder(parent, surface, top, base, h, x, y, z, sides = 20) {
  return mesh(parent, new T.CylinderGeometry(top, base, h, sides), surface, x, y, z);
}

function rod(parent, surface, from, to, radius) {
  const axis = new T.Vector3(...to).sub(new T.Vector3(...from));
  const object = cylinder(parent, surface, radius, radius, axis.length(), ...from, 8);
  object.position.addScaledVector(axis, .5);
  object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis.normalize());
  return object;
}

function tube(parent, surface, points, radius, closed = false) {
  const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)), closed);
  return mesh(parent, new T.TubeGeometry(curve, points.length * 4, radius, 6, closed), surface, 0, 0, 0);
}

function group(parent, x, y, z, yaw = 0) {
  const object = new T.Group();
  object.position.set(x, y, z);
  object.rotation.y = yaw;
  parent.add(object);
  return object;
}

function addContactShadows(scene) {
  const map = texture(64, 64, (ctx, width, height) => {
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, '#100e16d9');
    glow.addColorStop(.32, '#100e1690');
    glow.addColorStop(.70, '#100e1629');
    glow.addColorStop(1, '#100e1600');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  });
  const geometry = new T.PlaneGeometry(1, 1);
  const contacts = [];
  const position = new T.Vector3(), scale = new T.Vector3(), rotation = new T.Quaternion();

  return {
    add(object, x, z, width, depth, opacity) {
      const surface = new T.MeshBasicMaterial({ map, opacity, transparent: true, depthWrite: false });
      const shadow = new T.Mesh(geometry, surface);
      scene.add(shadow);
      contacts.push({ object, local: new T.Vector3(x, 0, z), shadow, width, depth, opacity });
    },
    sync() {
      for (const { object, local, shadow, width, depth, opacity } of contacts) {
        position.copy(local);
        object.localToWorld(position);
        object.getWorldScale(scale);
        object.getWorldQuaternion(rotation);
        shadow.position.set(position.x, .002, position.z);
        shadow.scale.set(width * scale.x, depth * scale.z, 1);
        shadow.quaternion.copy(rotation).multiply(contactRotation);
        shadow.material.opacity = opacity * (1 - T.MathUtils.smoothstep(position.y, 0, .35));
        shadow.visible = shadow.material.opacity > .005;
      }
    },
  };
}

const contactRotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2);

function bundle(parent, parts, x, y, z) {
  const object = group(parent, x, y, z);
  for (const part of parts) object.attach(part);
  return object;
}

function technicalSketch(ctx, x, y, w, h, ink) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    ctx.moveTo(x + i * w / 8, y);
    ctx.lineTo(x + (8 - i) * w / 8, y + h);
  }
  for (const dy of [0, h]) {
    ctx.moveTo(x + w, y + dy);
    ctx.ellipse(x + w / 2, y + dy, w / 2, h / 11, 0, 0, 2 * Math.PI);
  }
  ctx.stroke();
}

function addPinHardware(cork) {
  const pins = new T.Group();
  pins.name = 'author-pin-hardware';
  pins.visible = false;
  cork.add(pins);
  const shaft = new T.CylinderGeometry(.007, .009, .019, 12);
  shaft.rotateX(Math.PI / 2);
  const cap = new T.SphereGeometry(.015, 16, 10);
  cap.scale(1, 1, .42);
  const shadow = new T.CircleGeometry(.021, 18);
  shadow.scale(1, .72, 1);
  const shade = new T.MeshBasicMaterial({ color: '#352313', transparent: true, opacity: .24, depthWrite: false });
  const metal = material('#9a8873', .32);
  for (const color of ['#86372d', '#e2c5a0', '#734c2e', '#3d564b', '#963b33', '#e6cca5', '#6b4e42']) {
    const pin = new T.Group();
    pins.add(pin);
    const shadowMesh = new T.Mesh(shadow, shade);
    shadowMesh.position.set(.009, -.008, .002);
    pin.add(shadowMesh);
    const post = new T.Mesh(shaft, metal);
    post.position.z = .010;
    pin.add(post);
    const head = new T.Mesh(cap, material(color, .26));
    head.position.z = .022;
    pin.add(head);
  }
}

function addPinboard(scene, x) {
  const board = group(scene, x, 4.59, backWall + .035);
  const railMap = texture(384, 56, (ctx, w, h) => {
    ctx.fillStyle = '#c49e77';
    ctx.fillRect(0, 0, w, h);
    const next = random(291);
    for (let i = 0; i < 86; i++) {
      const y = next() * h;
      ctx.strokeStyle = i % 3 ? '#8a624231' : '#f1d0a94e';
      ctx.lineWidth = .45 + next();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * .36, y + next() * 6, w * .66, y - next() * 5, w, y);
      ctx.stroke();
    }
  });
  const backing = material('#86664c', .91);
  const rail = new T.MeshStandardMaterial({ map: railMap, roughness: .76 });
  const beading = material('#a48261', .84);
  box(board, backing, 3.31, 1.78, .060, 0, 0, -.014);
  for (const sign of [-1, 1]) {
    roundedBox(board, rail, 3.31, .054, .087, .009, 0, sign * .862, .014);
    const side = roundedBox(board, rail, 1.684, .057, .087, .009, sign * 1.624, 0, .014);
    side.rotation.z = Math.PI / 2;
    box(board, beading, 3.19, .014, .035, 0, sign * .839, .050);
    box(board, beading, .014, 1.67, .035, sign * 1.600, 0, .050);
  }
  const map = texture(896, 560, (ctx, w, h) => {
    drawCork(ctx, w, h);
    const cards = [
      [33, 39, 168, 237, -.09, '#e5d3c5', '#843d45'],
      [213, 38, 216, 115, .05, '#e9dbc1', '#78604f'],
      [205, 185, 127, 174, -.06, '#b8895e', '#422d2a'],
      [353, 218, 182, 159, .08, '#e3c8c3', '#805165'],
      [466, 29, 124, 164, -.07, '#d4d3c9', '#434d57'],
      [649, 32, 185, 214, .06, '#345b83', '#c4c0b1'],
      [37, 310, 152, 180, .06, '#e1d7c9', '#a9353b'],
      [232, 397, 201, 125, -.04, '#c3c9bf', '#354f67'],
      [477, 399, 178, 122, -.06, '#eadcc7', '#766251'],
      [690, 294, 131, 206, .11, '#a85142', '#e5b6a1'],
    ];
    cards.forEach(([x, y, width, height, angle, color, ink], i) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.save();
      ctx.shadowColor = '#482c20a3';
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 5;
      ctx.shadowBlur = 5;
      const sheet = ctx.createLinearGradient(0, 0, width, height);
      sheet.addColorStop(0, color);
      sheet.addColorStop(.7, color);
      sheet.addColorStop(1, new T.Color(color).multiplyScalar(.88).getStyle());
      ctx.fillStyle = sheet;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.strokeRect(10, 13, width - 20, height - 29);
      if (i === 0 || i === 8) {
        technicalSketch(ctx, width * .23, height * .27, width * .54, height * .49, ink);
      } else if (i === 3 || i === 5 || i === 7) {
        ctx.beginPath();
        ctx.moveTo(15, height - 24);
        ctx.lineTo(width * .42, height * .32);
        ctx.lineTo(width * .62, height * .54);
        ctx.lineTo(width - 15, height * .39);
        ctx.lineTo(width - 15, height - 24);
        ctx.fill();
      } else if (i === 1 || i === 9) {
        for (let row = 0; row < 7; row++) ctx.fillRect(21, 34 + row * 9, width - 45 - row % 3 * 9, 2);
      } else {
        ctx.beginPath();
        ctx.ellipse(width / 2, height * .51, width * .26, height * .22, .3, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = '#52332573';
      ctx.beginPath();
      ctx.arc(width / 2 + 2, 8, 5, 0, 2 * Math.PI);
      ctx.fill();
      const pin = ctx.createRadialGradient(width / 2 - 1.5, 4, .4, width / 2, 6, 5.6);
      pin.addColorStop(0, i % 2 ? '#db8270' : '#fff1ca');
      pin.addColorStop(1, i % 2 ? '#8b312e' : '#b7996b');
      ctx.fillStyle = pin;
      ctx.beginPath();
      ctx.arc(width / 2, 6, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });
  });
  const cork = mesh(board, new T.PlaneGeometry(3.19, 1.67), new T.MeshBasicMaterial({ map }), 0, 0, .046);
  cork.name = 'author-cork';
  cork.castShadow = false;
  cork.geometry.computeBoundingBox();
  addPinHardware(cork);
  return board;
}

function addWallSketch(scene, x) {
  const sketch = group(scene, x, 4.68, backWall + .021);
  const width = 1.05, height = 1.29;
  sketch.rotation.z = -.046;
  const map = texture(340, 410, (ctx, w, h) => {
    ctx.fillStyle = '#f7f2e9';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a8b0ad5c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let line = 32; line < w - 25; line += 16) {
      ctx.moveTo(line, 40);
      ctx.lineTo(line, h - 52);
    }
    for (let line = 40; line < h - 51; line += 16) {
      ctx.moveTo(32, line);
      ctx.lineTo(w - 36, line);
    }
    ctx.stroke();
    technicalSketch(ctx, 76, 93, 184, 207, '#845552');
    ctx.strokeStyle = '#637077';
    ctx.strokeRect(229, 350, 76, 25);
    ctx.beginPath();
    ctx.moveTo(254, 350);
    ctx.lineTo(254, 375);
    ctx.moveTo(32, 363);
    ctx.lineTo(122, 363);
    ctx.stroke();
  });
  box(sketch, material('#cfc6b6'), 1.054, 1.294, .014, 0, 0, -.009);
  mesh(sketch, new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map, roughness: 1 }), 0, 0, 0);
  const tape = material('#c9b28b');
  box(sketch, tape, .14, .075, .012, -.43, .61, .009).rotation.z = .39;
  box(sketch, tape, .14, .075, .012, .44, .61, .009).rotation.z = -.3;
  return { object: sketch, topEdge: [
    new T.Vector3(-width / 2, height / 2, 0), new T.Vector3(width / 2, height / 2, 0),
  ] };
}

function addMonitor(desk) {
  const pc = group(desk, .24, worktop, -.68, -.14);
  const hinge = material('#4c4d4c', .58);
  roundedBox(pc, black, 1.16, .065, .55, .021, 0, .038, 0);
  roundedBox(pc, dark, .19, .64, .21, .025, 0, .34, -.06).rotation.x = -.055;
  roundedBox(pc, hinge, .53, .32, .15, .034, 0, .81, -.14);
  for (let i = 0; i < 8; i++) box(pc, black, .034, .015, .004, (i - 3.5) * .052, .883, -.217);
  roundedBox(pc, material('#2f3232', .66), 1.64, .73, .19, .06, 0, .93, -.09);

  const map = texture(1120, 480, (ctx, w, h) => {
    const panel = ctx.createLinearGradient(245, 0, w, h);
    panel.addColorStop(0, '#29364a');
    panel.addColorStop(1, '#182130');
    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b222f';
    ctx.fillRect(0, 0, 245, h);
    ctx.fillStyle = '#39475d';
    ctx.fillRect(18, 81, 208, 29);
    for (let i = 0; i < 19; i++) {
      ctx.fillStyle = i % 3 ? '#718099' : '#9baac2';
      ctx.fillRect(22 + i % 3 * 14, 45 + i * 21, 70 + i % 5 * 22, 3);
    }
    ctx.fillStyle = '#d0dbea';
    ctx.font = '25px monospace';
    ctx.fillText('RUST / SLOPE STABILITY', 281, 54);
    ctx.strokeStyle = '#465469';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 280; x < 1070; x += 39) { ctx.moveTo(x, 101); ctx.lineTo(x, 429); }
    for (let y = 115; y < 429; y += 29) { ctx.moveTo(280, y); ctx.lineTo(1070, y); }
    ctx.stroke();
    ctx.fillStyle = '#9cacc1';
    ctx.font = '15px monospace';
    for (let i = 0; i <= 5; i++) ctx.fillText(String(i * 20), 286 + i * 153, 452);
    ctx.fillText('DISTANCE / M', 945, 474);
    ctx.fillStyle = '#9cacb9';
    ctx.fillRect(839, 87, 17, 2);
    ctx.fillText('SURFACE', 861, 93);
    ctx.fillStyle = '#c8996c';
    ctx.fillRect(955, 87, 17, 2);
    ctx.fillText('SLIP', 977, 93);
    ctx.strokeStyle = '#c1d2e0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(294, 332);
    ctx.lineTo(512, 332);
    ctx.lineTo(762, 192);
    ctx.lineTo(1060, 192);
    ctx.stroke();
    ctx.strokeStyle = '#c8996c';
    ctx.beginPath();
    ctx.moveTo(405, 332);
    ctx.quadraticCurveTo(703, 474, 860, 192);
    ctx.stroke();
  });
  const width = 2.73;
  const height = 1.12;
  const curvature = .20;
  const screen = new T.PlaneGeometry(width - .075, height - .075, 24, 1);
  const vertices = screen.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    vertices.setZ(i, .055 + curvature * (vertices.getX(i) / (width / 2)) ** 2);
  }
  screen.computeVertexNormals();
  const housing = new T.BoxGeometry(width, height, .10, 24, 1, 1);
  const housingVertices = housing.attributes.position;
  for (let i = 0; i < housingVertices.count; i++) {
    housingVertices.setZ(i, housingVertices.getZ(i) + curvature * (housingVertices.getX(i) / (width / 2)) ** 2);
  }
  housing.computeVertexNormals();
  mesh(pc, housing, black, 0, .94, 0);
  const display = mesh(pc, screen, new T.MeshBasicMaterial({ map }), 0, .95, 0);
  display.castShadow = false;
  display.name = 'research-display';
  screen.computeBoundingBox();
  const status = new T.MeshStandardMaterial({
    color: '#6d887d', roughness: .45, emissive: '#66998c', emissiveIntensity: .52,
  });
  mesh(pc, new T.SphereGeometry(.009, 10, 6), status, 1.15, .394, .198).castShadow = false;
  return pc;
}

function addKeyboard(desk) {
  const keyboard = group(desk, .24, worktop + .015, .47, -.13);
  roundedBox(keyboard, dark, 1.56, .068, .53, .022, 0, .034, 0);
  roundedBox(keyboard, black, 1.51, .012, .484, .005, 0, .071, 0);
  const caps = [material('#4a4c50'), material('#62615c'), material('#585b58')];
  const rows = [
    ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Del'],
    ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ['Back', 1.7]],
    [['Tab', 1.35], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '|'],
    [['Caps', 1.6], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', '\'', ['Enter', 1.55]],
    [['Shift', 1.98], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', ['Shift', 1.48], '↑'],
    [['Ctrl', 1.2], 'Fn', ['Alt', 1.2], ['', 5.4], ['Alt', 1.2], 'Ctrl', '←', '↓', '→'],
  ];
  const keys = [];
  const geometryByWidth = new Map();
  const capHeight = .025;
  rows.forEach((row, rowIndex) => {
    const z = -.199 + .078 * rowIndex;
    let left = -.724;
    row.forEach((entry, column) => {
      const [label, units] = Array.isArray(entry) ? entry : [entry, 1];
      const stride = .101 * units;
      const x = left + stride / 2;
      if (!geometryByWidth.has(units)) {
        const geometry = new T.BoxGeometry(stride - .009, capHeight, .069);
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          if (position.getY(i) < 0) continue;
          position.setX(i, position.getX(i) * .86);
          position.setZ(i, position.getZ(i) * .85);
        }
        geometry.computeVertexNormals();
        geometryByWidth.set(units, geometry);
      }
      const accent = rowIndex === 0 && column === 0 ? caps[1] : units > 1 || rowIndex === 0 ? caps[2] : caps[0];
      mesh(keyboard, geometryByWidth.get(units), accent, x, .079, z);
      keys.push({ label, x, z });
      left += stride;
    });
  });
  const labels = texture(1536, 512, (ctx, width, height) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#eeeadc';
    for (const { label, x, z } of keys) {
      ctx.font = (label.length > 1 ? '21' : '30') + 'px monospace';
      ctx.fillText(label, (x / 1.56 + .5) * width, (z / .53 + .5) * height, 73);
    }
  });
  const legends = mesh(keyboard, new T.PlaneGeometry(1.56, .53),
    new T.MeshBasicMaterial({ map: labels, transparent: true, depthWrite: false, opacity: .90 }), 0, .0925, 0);
  legends.rotation.x = -Math.PI / 2;
  legends.castShadow = legends.receiveShadow = false;
  return keyboard;
}

function addMouse(desk) {
  const mouse = group(desk, 1.40, worktop + .036, .40, -.10);
  const shell = new T.SphereGeometry(1, 40, 22);
  const points = shell.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
    points.setXYZ(i, x * .145 * (.93 - .11 * z),
      Math.max(-.019, y * .105 - Math.max(0, -z) * .036), z * .227);
  }
  shell.computeVertexNormals();
  mesh(mouse, shell, material('#383c3d', .42), 0, 0, 0);

  const surfaceY = (x, z) => {
    const front = z / .227;
    const across = x / (.145 * (.93 - .11 * front));
    return Math.max(-.018, .105 * Math.sqrt(Math.max(0, 1 - across ** 2 - front ** 2)) + .036 * Math.min(0, front));
  };
  const seam = points => points.map(([x, z]) => [x, surfaceY(x, z) + .002, z]);
  tube(mouse, black, seam([[0, -.130], [0, -.16], [0, -.19], [0, -.219], [0, -.227]]), .0034);
  for (const side of [-1, 1]) {
    tube(mouse, black, seam([[side * .019, -.048], [side * .049, -.030], [side * .090, -.038],
      [side * .121, -.068], [side * .130, -.097]]), .0028);
  }

  const tread = material('#666865', .74);
  roundedBox(mouse, black, .049, .010, .070, .004, 0, .083, -.089);
  const wheel = group(mouse, 0, .086, -.09);
  cylinder(wheel, material('#262828', .88), .025, .025, .032, 0, 0, 0, 20).rotation.z = Math.PI / 2;
  for (let i = 0; i < 14; i++) {
    const angle = i * Math.PI * 2 / 14;
    box(wheel, tread, .027, .003, .0045, 0, .025 * Math.cos(angle), .025 * Math.sin(angle)).rotation.x = angle;
  }
  roundedBox(mouse, tread, .025, .009, .022, .004, 0, .107, -.020);
  roundedBox(mouse, black, .018, .015, .055, .006, -.127, .038, .011);
  roundedBox(mouse, black, .018, .014, .043, .006, -.133, .033, -.049);

  const shellLine = Array.from({ length: 24 }, (_, i) => {
    const angle = i * Math.PI * 2 / 24;
    const z = .214 * Math.sin(angle);
    return [.133 * Math.cos(angle) * (.95 - .12 * z / .227), -.012, z];
  });
  tube(mouse, black, shellLine, .004, true);
  return mouse;
}

function addDeskMat(desk, fabric) {
  const width = 3.10, depth = 1.38, thickness = .016;
  const mat = group(desk, .75, worktop + thickness / 2, .27);
  const x = width / 2, z = depth / 2, r = .095;
  const border = new T.Shape();
  border.moveTo(-x + r, -z);
  border.lineTo(x - r, -z);
  border.quadraticCurveTo(x, -z, x, -z + r);
  border.lineTo(x, z - r);
  border.quadraticCurveTo(x, z, x - r, z);
  border.lineTo(-x + r, z);
  border.quadraticCurveTo(-x, z, -x, z - r);
  border.lineTo(-x, -z + r);
  border.quadraticCurveTo(-x, -z, -x + r, -z);
  const geometry = new T.ExtrudeGeometry(border, { depth: thickness, bevelEnabled: false, curveSegments: 5 });
  geometry.rotateX(-Math.PI / 2).translate(0, -thickness / 2, 0);
  const { position, uv } = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, .5 + position.getX(i) / width, .5 - position.getZ(i) / depth);
  }
  mesh(mat, geometry, fabric, 0, 0, 0);
  const edging = border.getSpacedPoints(60).slice(0, -1).map(point => [.996 * point.x, .007, -.994 * point.y]);
  tube(mat, material('#48413a', .98), edging, .005, true).castShadow = false;
  return mat;
}

function addChandelier(scene, desk) {
  const x = desk.position.x + 1.20;
  const z = desk.position.z + .40;
  const bottom = 4.59;
  const height = .91;
  const fixture = group(scene, x, bottom, z);
  const shade = createProduct('chandelier', height);
  shade.rotation.y = -.22;
  fixture.add(shade);
  const suspension = material('#a69b89');
  const cord = cylinder(fixture, suspension, .015, .015, 1, 0, 0, 0);
  const canopy = cylinder(fixture, suspension, .087, .083, .028, 0, 0, 0);
  const downlight = new T.SpotLight('#ffd2a5', 58, 11, 1.09, .68);
  downlight.position.set(0, -.055, .12);
  downlight.target.position.set(-1.18, -3.12, -.40);
  downlight.castShadow = true;
  downlight.shadow.mapSize.set(2048, 2048);
  downlight.shadow.camera.near = .3;
  downlight.shadow.camera.far = 11;
  downlight.shadow.bias = -.00018;
  downlight.shadow.normalBias = .012;
  downlight.shadow.radius = 6;
  downlight.shadow.intensity = .92;
  const uplight = new T.PointLight('#ffd7b1', 8.4, 7.3);
  uplight.position.set(0, .58, 0);
  fixture.add(downlight, downlight.target, uplight);

  function sync() {
    const mount = (ceilingHeight - fixture.position.y) / fixture.scale.y;
    const length = Math.max(0, mount - height - .026);
    cord.visible = length > 0;
    cord.scale.y = length;
    cord.position.y = height + length / 2;
    canopy.position.y = mount - .014;
  }
  sync();

  fixture.traverse(object => {
    if (object.isMesh) object.castShadow = false;
    if (object.material?.name === 'chandelierShade') {
      object.material = object.material.clone();
      object.receiveShadow = false;
      const shadeMaterial = object.material;
      shadeMaterial.emissive.set('#ffd099');
      shadeMaterial.emissiveIntensity = .55;
      object.geometry = object.geometry.clone();
      const { position } = object.geometry.attributes;
      const uv = new Float32Array(position.count * 2);
      for (let i = 0; i < position.count; i++) {
        uv[2 * i] = .5;
        uv[2 * i + 1] = position.getY(i);
      }
      object.geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
      shadeMaterial.emissiveMap = texture(2, 96, (ctx, w, h) => {
        const glow = ctx.createLinearGradient(0, 0, 0, h);
        glow.addColorStop(0, '#a28b73');
        glow.addColorStop(.56, '#d0b695');
        glow.addColorStop(1, '#fff6dc');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      });
    }
  });
  return { object: fixture, shade, sync };
}

function wallGrid(roomDepth, left, right, sill, head) {
  function subdivide(edges) {
    return edges.flatMap((start, index) => {
      if (index === edges.length - 1) return [start];
      const length = edges[index + 1] - start;
      const steps = Math.ceil(length / .65);
      return Array.from({ length: steps }, (_, step) => start + length * step / steps);
    });
  }
  const columns = subdivide([backWall, left, right, backWall + roomDepth]);
  const rows = subdivide([0, sill, head, ceilingHeight]);
  const positions = [], uv = [], normals = [], indices = [];
  // Shared vertices keep the plaster continuous. Small faces also help the Canvas renderer
  // draw the wall through focused camera angles where part of it is behind the camera.
  for (const y of rows) {
    for (const z of columns) {
      positions.push(z, y, 0);
      uv.push((z - backWall) / roomDepth, y / ceilingHeight);
      normals.push(0, 0, 1);
    }
  }
  for (let row = 1; row < rows.length; row++) {
    for (let col = 1; col < columns.length; col++) {
      if (columns[col - 1] >= left && columns[col] <= right && rows[row - 1] >= sill && rows[row] <= head) continue;
      const lower = (row - 1) * columns.length + col - 1;
      const upper = lower + columns.length;
      indices.push(lower, lower + 1, upper + 1, lower, upper + 1, upper);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}

function addWindowWall(scene, surface, roomDepth, backdrop) {
  const left = 1.86, right = 4.88, sill = 1.56, head = 5.62;
  const geometry = wallGrid(roomDepth, left, right, sill, head);
  const wall = mesh(scene, geometry, surface, rightWall, 0, 0);
  wall.rotation.y = -Math.PI / 2;
  wall.castShadow = false;

  const span = right - left, height = head - sill;
  const window = group(scene, rightWall, (head + sill) / 2, (left + right) / 2, -Math.PI / 2);
  const frame = material('#ded7c2', .61);
  const reveal = material('#aaa38e', .84);
  const gasket = material('#494a43', .82);
  const handle = material('#8d9289', .42);
  const city = cityTexture(backdrop);
  const outside = new T.MeshBasicMaterial({ map: city.map, toneMapped: false, fog: false });
  const pane = new T.PlaneGeometry(span, height);
  mesh(window, pane, outside, 0, 0, -.128).name = 'courtyard';
  const particleMaterial = new T.MeshBasicMaterial({
    map: city.particles, transparent: true, depthWrite: false, toneMapped: false, fog: false,
  });
  const particles = mesh(window, pane, particleMaterial, 0, 0, -.124);
  particles.name = 'seasonal-particles';
  for (const sign of [-1, 1]) {
    box(window, reveal, .16, height, .19, sign * (span / 2 - .08), 0, -.043);
    box(window, frame, .115, height + .025, .075, sign * (span / 2 - .046), 0, .047);
    box(window, gasket, .024, height, .03, sign * (span / 2 - .157), 0, .011);
    box(window, reveal, span, .15, .19, 0, sign * (height / 2 - .075), -.043);
    box(window, frame, span + .08, .11, .076, 0, sign * (height / 2 - .038), .047);
    box(window, gasket, span, .024, .03, 0, sign * (height / 2 - .149), .011);
  }
  box(window, frame, .093, height, .10, 0, 0, .019);
  box(window, frame, span + .34, .074, .32, 0, -height / 2, .071);
  box(window, handle, .040, .19, .036, -.018, -.24, .095);
  box(window, handle, .054, .04, .065, -.011, -.32, .11);
  window.traverse(object => {
    if (object.isMesh) object.castShadow = false;
  });
  const projection = new T.Matrix4();
  const frustum = new T.Frustum();
  particles.updateWorldMatrix(true, false);
  return {
    particles,
    lightPosition: new T.Vector3(rightWall - .14, head - .35, window.position.z),
    paint(season) {
      particles.visible = city.paint(season);
    },
    update(time, camera) {
      if (!particles.visible) return false;
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      return frustum.intersectsObject(particles) && city.animate(time);
    },
  };
}

function addPrintSample(parent, surface, x, y, z, radius, height) {
  const sample = group(parent, x, y, z);
  for (const level of [.012, height - .012]) {
    mesh(sample, new T.TorusGeometry(radius, .013, 5, 28), surface, 0, level, 0).rotation.x = Math.PI / 2;
  }
  for (let segment = 0; segment < 8; segment++) {
    const angle = segment * Math.PI / 4;
    const start = [radius * Math.cos(angle), .02, radius * Math.sin(angle)];
    for (const twist of [-1.3, 1.3]) {
      rod(sample, surface, start, [radius * Math.cos(angle + twist), height - .02, radius * Math.sin(angle + twist)], .008);
    }
  }
  // A ray through the open lattice should still select the sample.
  const hitArea = mesh(sample, new T.CylinderGeometry(radius, radius, height, 12),
    new T.MeshBasicMaterial({ transparent: true }), 0, height / 2, 0);
  hitArea.visible = false;
  hitArea.userData.pickOnly = true;
  return sample;
}

function lacedSlat(angle, t, offset = 0) {
  const twist = angle + .82 * (t - .5);
  const radius = .058 + .124 * Math.abs(2 * t - 1) ** 1.6 + offset;
  return [radius * Math.cos(twist), .009 + .53 * t, radius * Math.sin(twist)];
}

function addLacedPrototype(parent, x, y, z) {
  const prototype = group(parent, x, y, z, .14);
  const plastic = material('#407eaf', .68);
  const cord = material('#204c7b', .86);
  const ribs = 6;
  const pointsPerSlat = 20;
  for (let rib = 0; rib < ribs; rib++) {
    const angle = rib / ribs * Math.PI * 2;
    const vertices = [];
    const indices = [];
    for (let step = 0; step <= pointsPerSlat; step++) {
      const t = step / pointsPerSlat;
      const [px, py, pz] = lacedSlat(angle, t);
      const tangent = angle + .82 * (t - .5);
      const width = .016;
      const thickness = .006;
      for (const [w, d] of [[-width, -thickness], [width, -thickness], [width, thickness], [-width, thickness]]) {
        vertices.push(px - w * Math.sin(tangent) + d * Math.cos(tangent), py, pz + w * Math.cos(tangent) + d * Math.sin(tangent));
      }
      if (step > 0) {
        const base = (step - 1) * 4;
        for (let side = 0; side < 4; side++) {
          const next = (side + 1) % 4;
          indices.push(base + side, base + next, base + side + 4, base + next, base + next + 4, base + side + 4);
        }
      }
    }
    const top = pointsPerSlat * 4;
    indices.push(0, 2, 1, 0, 3, 2, top, top + 1, top + 2, top, top + 2, top + 3);
    const slat = new T.BufferGeometry();
    slat.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    slat.setIndex(indices);
    slat.computeVertexNormals();
    mesh(prototype, slat, plastic, 0, 0, 0);

    const nextAngle = (rib + 1) / ribs * Math.PI * 2;
    const cross = Array.from({ length: 16 }, (_, i) =>
      lacedSlat(i % 2 ? nextAngle : angle, .21 + .039 * i, -.004));
    tube(prototype, cord, cross, .004);
  }
  return prototype;
}

function addFoldedPrototype(parent, x, y, z) {
  const prototype = group(parent, x, y, z, -.14);
  const folds = 12;
  const edges = folds * 2;
  const levels = [
    [0, .100, .020],
    [.072, .093, .025],
    [.153, .085, .028],
    [.235, .121, .032],
    [.326, .152, .036],
  ];
  const vertices = [];
  const indices = [];
  for (const [level, [height, radius, pleat]] of levels.entries()) {
    const t = height / levels.at(-1)[0];
    for (const skin of [0, 1]) {
      for (let edge = 0; edge < edges; edge++) {
        const angle = edge / edges * Math.PI * 2 + t * .84;
        const r = radius + (edge % 2 ? pleat : -pleat) - skin * .009;
        const peak = level === levels.length - 1 && edge % 2 ? .008 : 0;
        vertices.push(r * Math.cos(angle), height + peak, r * Math.sin(angle));
      }
    }
    if (level === 0) continue;
    const lower = (level - 1) * edges * 2;
    const upper = level * edges * 2;
    for (let edge = 0; edge < edges; edge++) {
      const next = (edge + 1) % edges;
      indices.push(lower + edge, upper + edge, lower + next, lower + next, upper + edge, upper + next);
      indices.push(lower + edges + edge, lower + edges + next, upper + edges + edge,
        lower + edges + next, upper + edges + next, upper + edges + edge);
      if (level === levels.length - 1) {
        indices.push(upper + edge, upper + edges + edge, upper + next,
          upper + next, upper + edges + edge, upper + edges + next);
      }
    }
  }
  const shell = new T.BufferGeometry();
  shell.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  shell.setIndex(indices);
  shell.computeVertexNormals();
  const clay = new T.MeshStandardMaterial({ color: '#9c8268', roughness: .88, flatShading: true, side: T.DoubleSide });
  mesh(prototype, shell, clay, 0, 0, 0);
  cylinder(prototype, clay, .091, .091, .013, 0, .0065, 0, 24);
  return prototype;
}

function shelfDrawing(ctx, width, height) {
  const ink = '#f7edd3';
  const accent = '#f6b680';
  ctx.fillStyle = '#204b58';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#426572';
  ctx.lineWidth = 1;
  for (let x = 24; x < width; x += 24) ctx.strokeRect(x, 0, 0, height);
  for (let y = 24; y < height; y += 24) ctx.strokeRect(0, y, width, 0);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  function line(points) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.stroke();
  }

  // Oblique view of the four shelves, beside a slotted side and two tabbed shelves.
  ctx.lineWidth = 4;
  for (const [x, y] of [[74, 102], [208, 115], [134, 65], [268, 78]]) {
    line([[x, y - 4], [x, y + 229]]);
  }
  for (const y of [102, 171, 240, 309]) {
    const corners = [[74, y], [208, y + 13], [268, y - 24], [134, y - 37]];
    ctx.fillStyle = '#305763';
    ctx.beginPath();
    ctx.moveTo(...corners[0]);
    for (const point of corners.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    line([[74, y], [74, y + 5], [208, y + 18], [268, y - 19], [268, y - 24]]);
  }
  line([[74, 102], [74, 331]]);
  line([[208, 115], [208, 344]]);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(357, 68, 53, 236);
  for (const y of [78, 144, 210, 276]) ctx.strokeRect(368, y, 31, 6);
  for (const y of [84, 198]) {
    line([[449, y], [557, y], [557, y + 18], [565, y + 18], [565, y + 52],
      [557, y + 52], [557, y + 70], [449, y + 70], [449, y + 52], [441, y + 52],
      [441, y + 18], [449, y + 18], [449, y]]);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  line([[14, 358], [width - 14, 358]]);
  ctx.fillStyle = ink;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('ЭТАЖЕРКА', 38, 406);
  ctx.fillStyle = accent;
  ctx.font = '21px sans-serif';
  ctx.fillText('РАСКРОЙ ФАНЕРЫ', 355, 400);
}

function addDrawingStand(parent) {
  const stand = group(parent, -.01, .495, .04, -.06);
  const support = material('#9c7851');
  box(stand, support, .41, .024, .30, 0, .012, .006);
  const panel = group(stand, 0, .024, .13);
  panel.rotation.x = -.21;
  box(panel, support, .91, .636, .025, 0, .318, 0);
  const drawing = new T.MeshBasicMaterial({ map: texture(640, 440, shelfDrawing) });
  const drawingFace = mesh(panel, new T.PlaneGeometry(.886, .61), drawing, 0, .318, .014);
  drawingFace.name = 'shelf-generator-sheet';
  drawingFace.castShadow = false;
  drawingFace.geometry.computeBoundingBox();
  rod(stand, support, [0, .02, -.135], [0, .40, .035], .013);
  return stand;
}

function addHeadphones(shelf, level) {
  const headphones = group(shelf, -1.075, level, .40, -.35);
  const blue = new T.MeshStandardMaterial({ color: '#3a6380', roughness: .49, metalness: .18 });
  const trim = material('#272d2e', .59);
  const leather = material('#302d29', .88);
  const seam = material('#514a42', .91);
  const alloy = new T.MeshStandardMaterial({ color: '#8e8e86', roughness: .43, metalness: .55 });
  rod(headphones, trim, [.04, .109, -.055], [.04, .109, .133], .024);
  mesh(headphones, new T.SphereGeometry(.027, 16, 10), trim, .04, .109, .135).scale.z = .40;

  const arcPoint = (angle, rx, ry) => [rx * Math.cos(angle), -.083 + ry * Math.sin(angle)];
  function band(surface, outer, inner, start, end, width) {
    const profile = new T.Shape();
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const angle = T.MathUtils.lerp(start, end, i / steps);
      const point = arcPoint(angle, ...outer);
      if (i === 0) profile.moveTo(...point);
      else profile.lineTo(...point);
    }
    for (let i = steps; i >= 0; i--) {
      const angle = T.MathUtils.lerp(start, end, i / steps);
      profile.lineTo(...arcPoint(angle, ...inner));
    }
    profile.closePath();
    const shell = new T.ExtrudeGeometry(profile, {
      depth: width - .006, bevelEnabled: true, bevelSize: .003, bevelThickness: .003, bevelSegments: 2,
    });
    mesh(headphones, shell, surface, 0, 0, .087 - (width - .006) / 2);
  }

  band(blue, [.210, .258], [.188, .236], 0, Math.PI, .075);
  band(leather, [.185, .232], [.161, .206], .32, Math.PI - .32, .079);
  for (const z of [.054, .120]) {
    const edge = Array.from({ length: 13 }, (_, i) => [...arcPoint(.34 + 2.46 * i / 12, .175, .215), z]);
    tube(headphones, seam, edge, .0017);
  }

  const shellProfile = [[0, -.037], [.093, -.037], [.108, -.031], [.114, -.020], [.114, .015],
    [.108, .034], [.096, .046], [.075, .053], [0, .055]];
  const cupShape = new T.LatheGeometry(shellProfile.map(point => new T.Vector2(...point)), 40)
    .rotateZ(-Math.PI / 2).scale(1, 1.13, .89);
  const ringShape = (radius, thickness) => new T.TorusGeometry(radius, thickness, 10, 38)
    .rotateY(Math.PI / 2).scale(1, 1.13, .89);
  const shellRim = ringShape(.108, .005);
  const cushionShape = ringShape(.077, .025);
  const stitchShape = ringShape(.089, .0018);
  const grilleMap = texture(160, 160, (ctx, w, h) => {
    ctx.fillStyle = '#374048';
    ctx.fillRect(0, 0, w, h);
    for (let y = 4; y < h; y += 9) {
      for (let x = 4 + ((y - 4) / 9 % 2) * 4; x < w; x += 9) {
        ctx.fillStyle = '#212527';
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#687477';
        ctx.fillRect(x - 1, y + 3, 2, 1);
      }
    }
  });
  const grille = new T.MeshStandardMaterial({ map: grilleMap, roughness: .72 });
  const inset = new T.MeshBasicMaterial({ color: '#242625' });

  for (const side of [-1, 1]) {
    const x = side * .190;
    const slider = roundedBox(headphones, alloy, .018, .102, .046, .005, x, -.119, .087);
    slider.rotation.z = side * .06;
    for (const z of [.053, .120]) {
      tube(headphones, trim, [[side * .195, -.131, z], [side * .207, -.154, z],
        [side * .227, -.196, z], [side * .236, -.225, .087 + (z - .087) * .75]], .010);
    }

    const cup = group(headphones, x, -.225, .087, side === 1 ? -.10 : Math.PI + .10);
    mesh(cup, cupShape, blue, 0, 0, 0);
    mesh(cup, shellRim, trim, .018, 0, 0);
    mesh(cup, cushionShape, leather, -.052, 0, 0);
    mesh(cup, stitchShape, seam, -.070, 0, 0);
    const innerFabric = mesh(cup, new T.CircleGeometry(.068, 32), inset, -.040, 0, 0);
    innerFabric.rotation.y = -Math.PI / 2;
    innerFabric.scale.set(.89, 1.13, 1);

    const outerGrille = mesh(cup, new T.CircleGeometry(.075, 36), grille, .0555, 0, 0);
    outerGrille.rotation.y = Math.PI / 2;
    outerGrille.scale.set(.89, 1.13, 1);
    outerGrille.castShadow = false;
    mesh(cup, ringShape(.076, .003), trim, .057, 0, 0);
    for (const z of [-.069, .069]) {
      cylinder(cup, alloy, .012, .012, .008, .045, .014, z, 12).rotation.z = Math.PI / 2;
    }
  }
  const cable = material('#262a29', .86);
  const lead = [[-.190, -.327, .086], [-.205, -.388, .087], [-.207, -.455, .095], [-.178, -.494, .102]];
  const coil = Array.from({ length: 65 }, (_, index) => {
    const t = index / 64;
    const angle = Math.PI * (.53 + 4.5 * t);
    return [
      -.162 + (.114 - .015 * t) * Math.cos(angle),
      -.606 - .028 * t + (.144 - .013 * t) * Math.sin(angle),
      .103 + .025 * t + .006 * Math.sin(angle * 2),
    ];
  });
  const tail = [[-.230, -.737, .137], [-.227, -.832, .145], [-.218, -.939, .152]];
  tube(headphones, cable, [...lead, ...coil, ...tail], .007);
  roundedBox(headphones, material('#4b4b42', .89), .047, .038, .071, .008, -.164, -.465, .111);
  rod(headphones, cable, [-.190, -.320, .085], [-.197, -.354, .087], .0125);

  const plug = group(headphones, ...tail.at(-1));
  const axis = new T.Vector3(...tail.at(-1)).sub(new T.Vector3(...tail.at(-2))).normalize();
  plug.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis);
  cylinder(plug, black, .0145, .009, .037, 0, .018, 0, 12);
  const brass = material('#c2ac77', .35);
  cylinder(plug, brass, .0066, .0066, .035, 0, .054, 0, 12);
  for (const y of [.049, .061]) cylinder(plug, dark, .007, .007, .003, 0, y, 0, 12);
  cylinder(plug, brass, .004, .0066, .008, 0, .073, 0, 10);
  return headphones;
}

function addMonstera(shelf, level) {
  const plant = group(shelf, .62, level, -.04);
  const ceramic = material('#dbd0b7', .48);
  const potProfile = [[0, .041], [.242, .041], [.260, .055], [.270, .139], [.312, .474], [.324, .494],
    [.324, .518], [.315, .530], [.287, .527], [.282, .511], [.285, .483], [.236, .075], [0, .075]];
  const saucer = [[0, .004], [.248, .004], [.334, .016], [.341, .040], [.332, .055], [.314, .056],
    [.294, .034], [0, .033]];
  for (const profile of [potProfile, saucer]) {
    mesh(plant, new T.LatheGeometry(profile.map(p => new T.Vector2(...p)), 36), ceramic, 0, 0, 0);
  }
  const soilMap = texture(160, 160, (ctx, width, height) => {
    ctx.fillStyle = '#44382e';
    ctx.fillRect(0, 0, width, height);
    const sample = random(619);
    const tones = ['#514137', '#342a22', '#695947', '#9d8d6e', '#27251e'];
    for (let i = 0; i < 680; i++) {
      ctx.fillStyle = tones[i % tones.length];
      const size = .4 + sample() * 3;
      ctx.fillRect(sample() * width, sample() * height, size * 1.3, size);
    }
  });
  cylinder(plant, new T.MeshStandardMaterial({ map: soilMap, roughness: .99 }), .276, .276, .019, 0, .473, 0, 28);
  const outline = new T.Shape();
  outline.moveTo(0, -.08);
  outline.bezierCurveTo(-.45, -.30, -.64, .14, -.43, .55);
  outline.lineTo(-.14, .41);
  outline.lineTo(-.47, .70);
  outline.quadraticCurveTo(-.43, .82, -.32, .91);
  outline.lineTo(-.09, .70);
  outline.lineTo(-.26, .98);
  outline.quadraticCurveTo(-.14, 1.13, 0, 1.27);
  outline.quadraticCurveTo(.21, 1.15, .31, .98);
  outline.lineTo(.10, .73);
  outline.lineTo(.39, .88);
  outline.quadraticCurveTo(.46, .79, .48, .66);
  outline.lineTo(.16, .49);
  outline.lineTo(.50, .52);
  outline.bezierCurveTo(.62, .15, .43, -.26, 0, -.08);
  const hole = new T.Path();
  hole.absellipse(-.15, .24, .064, .18, 0, 2 * Math.PI, true, .49);
  outline.holes.push(hole);
  const leaf = new T.ShapeGeometry(outline, 8);
  const { position, uv, normal } = leaf.attributes;
  const surfaceNormal = new T.Vector3();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    position.setZ(i, .16 * (1 - y * y) - .35 * x * x);
    uv.setXY(i, (x + .64) / 1.28, (y + .27) / 1.56);
    surfaceNormal.set(.70 * x, .32 * y, 1).normalize();
    normal.setXYZ(i, surfaceNormal.x, surfaceNormal.y, surfaceNormal.z);
  }
  const map = leafTexture();
  const foliage = ['#3b593a', '#50724a', '#58734a'].map(color => new T.MeshStandardMaterial({ color, map, roughness: .52, side: T.DoubleSide }));
  const leaves = [
    [-.59, 1.18, -.15, .24, -.31, .86, .59],
    [-.50, 1.32, -.03, -.23, .47, .37, .66],
    [.22, 1.29, -.02, -.35, -.1, -.28, .66],
    [.68, 1.21, -.08, -.48, -.23, -.82, .71],
    [.86, .87, .14, .35, -.36, -1.30, .77],
    [.64, .69, .41, .28, -.18, -2.05, .63],
    [-.06, .89, -.16, -.25, .17, .58, .49],
    [.28, .62, .25, .25, -.25, -.67, .31],
    [.02, .75, -.13, -.32, -.25, -.19, .34],
  ];
  leaves.forEach(([x, y, z, rx, ry, rz, size], i) => {
    tube(plant, green, [[x * .08, .47, z * .12], [x * .27, .49 + (y - .49) * .68, z * .30],
      [x * .61, y + .035, z * .60], [x, y, z]], size > .5 ? .014 : .009);
    const shape = mesh(plant, leaf, foliage[i % foliage.length], x, y, z);
    shape.scale.setScalar(size);
    shape.rotation.set(rx, ry, rz);
  });
  return plant;
}

function addShelfBody(shelf, height, surfaces) {
  const body = createProduct('shelf', height);
  body.traverse(object => {
    if (!object.isMesh) return;
    const part = object.material.name;
    object.material = part === 'shelfBack' ? surfaces.shelfBack : surfaces.shelf;
    const { position, normal, uv } = object.geometry.attributes;
    if (uv) return;

    // Lay out the grain along the shelf boards and up the vertical panels.
    const coordinates = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
      const x = .5 + position.getX(i) * 1.5;
      const y = position.getY(i);
      const z = .5 + position.getZ(i) * 3;
      const end = Math.abs(normal.getX(i)) > Math.abs(normal.getZ(i));
      if (part === 'shelfBoards') {
        const top = Math.abs(normal.getY(i)) > .5;
        coordinates[i * 2] = !top && end ? z : x;
        coordinates[i * 2 + 1] = top ? z : y;
      } else {
        coordinates[i * 2] = y;
        coordinates[i * 2 + 1] = end ? z : x;
      }
    }
    object.geometry.setAttribute('uv', new T.BufferAttribute(coordinates, 2));
  });
  const bounds = new T.Box3().setFromObject(body);
  shelf.add(body);
  return bounds;
}

export async function loadPackingMark() {
  const image = new Image();
  image.src = '/media/ui/yazhemoh-mark.svg';
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

function packingLabel(mark) {
  const map = texture(256, 176, (ctx, w, h) => {
    ctx.fillStyle = '#e9e2ce';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b1a28b';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    if (mark) {
      const height = 127;
      const width = height * mark.naturalWidth / mark.naturalHeight;
      ctx.drawImage(mark, (w - width) / 2, (h - height) / 2, width, height);
    } else {
      ctx.fillStyle = '#211d18';
      ctx.font = '800 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ЯЖЕМОХ', w / 2, 102);
    }
  });
  return new T.MeshStandardMaterial({ map, roughness: .95 });
}

function addPackingBox(parent, { x = 0, y = 0, z = 0, width, height, depth, yaw = 0, mark = 0, body, lid, label }) {
  const carton = group(parent, x, y, z, yaw);
  const lidHeight = Math.min(.053, height / 4);
  const lidDepth = depth + .016;
  roundedBox(carton, body, width, height - lidHeight, depth, .014, 0, (height - lidHeight) / 2, 0);
  roundedBox(carton, lid, width + .017, lidHeight, lidDepth, .012, 0, height - lidHeight / 2, 0);
  if (mark) {
    const face = mesh(carton, new T.PlaneGeometry(mark, mark * 176 / 256), label, 0, (height - lidHeight) * .47, depth / 2 + .001);
    face.castShadow = false;
  }
  return carton;
}

function spoolFlange() {
  const face = new T.Shape();
  face.absarc(0, 0, .39, 0, Math.PI * 2, false);
  const bore = new T.Path();
  bore.absarc(0, 0, .104, 0, Math.PI * 2, true);
  face.holes.push(bore);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const opening = new T.Path();
    opening.absellipse(.255 * Math.cos(angle), .255 * Math.sin(angle), .045, .064, 0, Math.PI * 2, true, angle);
    face.holes.push(opening);
  }
  return new T.ExtrudeGeometry(face, {
    depth: .021, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1, curveSegments: 7,
  }).rotateX(-Math.PI / 2);
}

function makeSpoolGeometry() {
  const profile = [
    [.112, .028], [.315, .028], [.337, .037], [.343, .05], [.343, .157],
    [.335, .178], [.313, .182], [.112, .182], [.112, .028],
  ].map(point => new T.Vector2(...point));
  const coil = new T.LatheGeometry(profile, 52);
  const uv = coil.attributes.uv;
  const positions = coil.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, (positions.getY(i) - .028) / (.182 - .028));
  }
  return {
    coil,
    flange: spoolFlange(),
    lip: new T.TorusGeometry(.386, .008, 6, 48).rotateX(-Math.PI / 2),
  };
}

function documentSpine({ title, detail, color, ink }) {
  const map = texture(128, 576, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    for (const y of [43, 58, h - 58, h - 43]) {
      ctx.beginPath();
      ctx.moveTo(15, y); ctx.lineTo(w - 15, y); ctx.stroke();
    }
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(title, 0, -16, h - 146);
    ctx.font = '25px sans-serif';
    ctx.fillText(detail, 0, 25, h - 148);
  });
  return new T.MeshStandardMaterial({ map, roughness: .82 });
}

function addBoundVolume(parent, { x, z, thickness, height, depth, tilt = 0, yaw = 0, color, ink, title, detail }, pages) {
  const book = group(parent, x, 0, z, yaw);
  book.rotation.z = tilt;
  const cover = material(color, .82);
  box(book, pages, thickness - .014, height - .024, depth - .017, 0, height / 2, -.006);
  for (const sign of [-1, 1]) {
    roundedBox(book, cover, .009, height, depth, .004, sign * (thickness - .009) / 2, height / 2, 0);
  }
  roundedBox(book, cover, thickness, height, .025, .008, 0, height / 2, depth / 2 - .0125);
  const spine = mesh(book, new T.PlaneGeometry(thickness - .009, height - .015),
    documentSpine({ title, detail, color, ink }), 0, height / 2, depth / 2 + .0007);
  spine.castShadow = false;
}

function addDocumentArchive(files, stack) {
  const edges = texture(112, 128, (ctx, w, h) => {
    ctx.fillStyle = '#efe4ca';
    ctx.fillRect(0, 0, w, h);
    const next = random(147);
    for (let x = 2; x < w; x += 3) {
      ctx.fillStyle = next() < .32 ? '#b9aa8c' : '#d8cbad';
      ctx.fillRect(x, 0, 1, h);
    }
  });
  const pages = new T.MeshStandardMaterial({ map: edges, roughness: .94 });
  const darkOak = material('#7b6147', .79);
  roundedBox(files, darkOak, .115, .52, .32, .014, -.265, .26, -.035);
  [
    { x: -.137, z: .014, thickness: .146, height: .72, depth: .47, color: '#3c4b57', ink: '#efcf8a', title: 'ДИССЕРТАЦИЯ', detail: 'И. ЧУБАТОВ · 2021' },
    { x: -.022, z: .041, thickness: .070, height: .62, depth: .40, yaw: .045, color: '#e2d4b5', ink: '#594135', title: 'АВТОРЕФЕРАТ', detail: 'НИУ МГСУ · 2021' },
    { x: .12, z: -.013, thickness: .090, height: .66, depth: .43, tilt: .14, color: '#6b5547', ink: '#f2e4bf', title: 'РАСЧЁТЫ', detail: 'РАБОЧИЕ МАТЕРИАЛЫ' },
  ].forEach(volume => addBoundVolume(files, volume, pages));

  for (let i = 0; i < 5; i++) {
    const sheet = box(stack, i === 0 ? pale : paper, .43 - i * .006, .013, .35, 0, .0065 + i * .0125, 0);
    sheet.rotation.y = (i - 2) * .043;
  }
  const cover = texture(400, 320, (ctx, w, h) => {
    ctx.fillStyle = '#eee5d0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#655649';
    ctx.font = 'bold 31px sans-serif';
    ctx.fillText('МАТЕРИАЛЫ', 25, 59);
    ctx.fillStyle = '#9f9381';
    for (const [i, width] of [315, 338, 290, 316, 248].entries()) ctx.fillRect(26, 108 + i * 23, width, 3);
  });
  const coverMesh = mesh(stack, new T.PlaneGeometry(.404, .346),
    new T.MeshStandardMaterial({ map: cover, roughness: .94 }), 0, .064, 0);
  coverMesh.rotation.set(-Math.PI / 2, 0, .086);
  coverMesh.castShadow = false;
  box(stack, material('#746352', .9), .05, .015, .039, -.15, .071, -.151).rotation.y = -.09;
}

function addShelving(scene, register, surfaces, mark) {
  const shelf = register(group(scene, 5.45, 0, .25, -.86), 'shelf', 'Стеллаж');
  const { cardboard, filament } = surfaces;
  const height = 3.97;
  // Heights of the horizontal surfaces, measured from the feet in the OBJ.
  const [bottom, middle, upper] = [30, 400, 770.787].map(level => height * level / 1140);
  const shelfBounds = addShelfBody(shelf, height, surfaces);

  function shelve(id, label, x, y, z, scale = 1) {
    const item = group(shelf, x, y, z);
    item.scale.setScalar(scale);
    return register(item, id, label, 'shelf');
  }

  const label = packingLabel(mark);
  const kraftLid = material('#ae8b61', .92);
  const darkLid = material('#49473c', .92);
  const olive = material('#656957', .91);
  const organizer = shelve('shelf-organizer', 'Фирменные коробки слева', -.55, bottom, .12, .96);
  addPackingBox(organizer, { width: .85, height: .36, depth: .62, yaw: -.045, body: cardboard, lid: kraftLid, label, mark: .32 });
  addPackingBox(organizer, { x: -.03, y: .36, z: -.032, width: .69, height: .23, depth: .52, yaw: .075, body: olive, lid: darkLid, label, mark: .22 });
  addPackingBox(organizer, { x: .06, y: .59, z: -.12, width: .43, height: .14, depth: .32, yaw: -.12, body: cardboard, lid: kraftLid, label });

  const lowerBoxes = shelve('shelf-lower-boxes', 'Фирменные коробки под раскроем', .37, bottom, .03);
  addPackingBox(lowerBoxes, { width: .80, height: .315, depth: .68, body: cardboard, lid: kraftLid, label, mark: .28 });
  addPackingBox(lowerBoxes, { x: -.018, y: .315, z: .025, width: .62, height: .18, depth: .48, yaw: .055, body: olive, lid: darkLid, label });
  const drawingScale = 1.29;
  const drawingMount = group(shelf, -.38, middle - .495 * drawingScale, .10);
  drawingMount.scale.setScalar(drawingScale);
  const drawing = register(addDrawingStand(drawingMount), 'shelf-drawing', 'Чертёж этажерки', 'shelf');

  const spoolRim = material('#41494a', .56);
  const spoolLip = material('#586262', .44);
  const spoolCore = new T.MeshStandardMaterial({ color: '#353b3a', roughness: .65, side: T.BackSide });
  const hub = new T.CylinderGeometry(.111, .111, .154, 30, 1, true);
  const reelGeometry = makeSpoolGeometry();
  const spoolSizes = [1, .95, .98, .90];
  for (const [i, color] of filament.entries()) {
    const scale = .8;
    const spool = shelve('shelf-spool-' + (i + 1), 'Катушка ' + (i + 1),
      .61 + i * .012, middle + i * .205 * scale, .07 + i * .013, scale);
    spool.rotation.y = .21 + i * .38;
    const reel = group(spool, 0, 0, 0);
    reel.scale.set(spoolSizes[i], 1, spoolSizes[i]);
    mesh(reel, reelGeometry.coil, color, 0, 0, 0);
    mesh(reel, hub, spoolCore, 0, .104, 0);
    for (const y of [.004, .18]) {
      mesh(reel, reelGeometry.flange, spoolRim, 0, y, 0);
      mesh(reel, reelGeometry.lip, spoolLip, 0, y + .014, 0);
    }
  }

  const files = shelve('shelf-files', 'Диссертация и автореферат', -.61, upper, .045, .93);
  const sheets = shelve('shelf-paper', 'Стопка научных материалов', -.065, upper, .165, .93);
  addDocumentArchive(files, sheets);

  const firefly = createProduct('lamp', .83);
  firefly.position.set(.595, upper, .035);
  shelf.add(firefly);
  register(firefly, 'firefly', 'Светлячок', 'shelf');
  const prototypeCollection = group(shelf, 0, 0, 0);
  const ringSample = register(addPrintSample(prototypeCollection, material('#8d5f57'), -.80, height, .24, .173, .267), 'shelf-print-large', 'Кольцевой макет', 'shelf');
  const lacedSample = register(addLacedPrototype(prototypeCollection, -.40, height, .24), 'shelf-print-small', 'Синий каркас со шнуровкой', 'shelf');
  const foldedSample = register(addFoldedPrototype(prototypeCollection, .032, height, .24), 'shelf-folded-sample', 'Складчатый макет', 'shelf');
  register(addHeadphones(shelf, upper - .065), 'headphones', 'Наушники', 'shelf');
  register(addMonstera(shelf, height), 'monstera', 'Монстера', 'shelf');
  return { shelf, firefly, shelfBounds, drawing, prototypeCollection, ringSample, lacedSample, foldedSample };
}

function addChair(scene, desk, fabric, frame) {
  const chair = group(scene, desk.position.x + .40, 0, desk.position.z + 1.84, -.14);
  const piping = material('#465041', .92);
  const piston = new T.MeshStandardMaterial({ color: '#989d99', metalness: .62, roughness: .34 });
  roundedBox(chair, black, 1.11, .087, .96, .027, 0, 1.073, .018);
  roundedBox(chair, fabric, 1.17, .21, 1.04, .098, 0, 1.182, 0);
  tube(chair, piping, [[-.459, 1.15, -.500], [0, 1.15, -.516], [.459, 1.15, -.500],
    [.581, 1.15, -.344], [.582, 1.15, .339], [.459, 1.15, .502], [0, 1.15, .518],
    [-.459, 1.15, .502], [-.582, 1.15, .339], [-.581, 1.15, -.344]], .009, true);

  const back = group(chair, 0, 1.79, .42);
  back.rotation.x = .13;
  const upholstery = new T.SphereGeometry(1, 30, 20);
  const vertices = upholstery.attributes.position;
  function backPoint(x, y, z) {
    return [.57 * x * (.90 + .09 * y), .61 * y, .113 * z - .061 * x * x + .037 * y * y];
  }
  for (let i = 0; i < vertices.count; i++) {
    vertices.setXYZ(i, ...backPoint(vertices.getX(i), vertices.getY(i), vertices.getZ(i)));
  }
  upholstery.computeVertexNormals();
  mesh(back, upholstery, fabric, 0, 0, 0);
  const seam = Array.from({ length: 24 }, (_, i) => {
    const angle = i / 24 * Math.PI * 2;
    return backPoint(.992 * Math.cos(angle), .992 * Math.sin(angle), .126);
  });
  tube(back, piping, seam, .008, true);
  roundedBox(chair, frame, .26, .54, .093, .032, 0, 1.29, .43).rotation.x = .19;
  roundedBox(chair, black, .34, .14, .38, .036, 0, .995, -.08);
  cylinder(chair, frame, .094, .117, .52, 0, .44, 0);
  cylinder(chair, piston, .054, .054, .32, 0, .826, 0);
  cylinder(chair, black, .135, .132, .17, 0, .201, 0);
  rod(chair, frame, [.14, 1.012, -.08], [.44, .972, -.13], .019);
  roundedBox(chair, black, .096, .034, .08, .014, .45, .972, -.13);
  for (const x of [-.51, .51]) {
    roundedBox(chair, frame, .089, .31, .087, .019, x, 1.29, .122);
    roundedBox(chair, black, .14, .074, .50, .029, x, 1.475, .024);
  }
  for (let i = 0; i < 5; i++) {
    const spoke = group(chair, 0, 0, 0, i * Math.PI * .4);
    roundedBox(spoke, frame, .118, .079, .53, .019, 0, .174, .323).rotation.x = .14;
    roundedBox(spoke, frame, .050, .107, .104, .015, 0, .105, .597);
    for (const x of [-.043, .043]) {
      cylinder(spoke, black, .068, .068, .047, x, .068, .604, 16).rotation.z = Math.PI / 2;
      cylinder(spoke, frame, .038, .038, .008, x * 1.58, .068, .604, 14).rotation.z = Math.PI / 2;
    }
  }
  return chair;
}

function addComputer(desk, register) {
  const tower = register(group(desk, 2.15, 0, -.52), 'computer', 'Системный блок', 'desk');
  box(tower, black, .57, .89, .90, 0, .47, 0);
  box(tower, dark, .54, .84, .035, 0, .47, .459);
  box(tower, material('#70658d'), .25, .019, .009, 0, .78, .479);
  for (let i = 0; i < 7; i++) box(tower, black, .34, .012, .008, 0, .62 - i * .037, .481);
  roundedBox(tower, material('#626761', .8), .38, .37, .018, .009, 0, .57, -.455);
  return tower;
}

function addDeskWiring(scene, desk, monitor, keyboard, tower) {
  const strip = group(desk, 2.24, .036, -.65, .11);
  roundedBox(strip, material('#6e6e61', .76), .454, .058, .126, .012, 0, 0, 0);
  for (const x of [-.125, .015, .145]) cylinder(strip, dark, .031, .031, .008, x, .030, 0, 16);
  const outlet = group(scene, 4.18, .235, backWall + .016);
  roundedBox(outlet, material('#aaa494', .76), .25, .147, .037, .014, 0, 0, 0);
  for (const x of [-.056, .056]) cylinder(outlet, dark, .041, .041, .008, x, 0, .022, 18).rotation.x = Math.PI / 2;

  const port = (object, at, size) => {
    roundedBox(object, black, ...size, .003, ...at);
    return () => desk.worldToLocal(object.localToWorld(new T.Vector3(...at))).toArray();
  };
  const video = port(monitor, [.16, .69, -.229], [.066, .037, .042]);
  const monitorPower = port(monitor, [-.09, .67, -.230], [.039, .030, .044]);
  const keyboardUSB = port(keyboard, [-.46, .044, -.270], [.044, .031, .044]);
  const towerVideo = port(tower, [-.102, .66, -.477], [.073, .039, .049]);
  const towerUSB = port(tower, [.087, .56, -.474], [.049, .030, .041]);
  const towerPower = port(tower, [.015, .25, -.471], [.066, .041, .038]);
  const stripMonitor = port(strip, [-.125, .045, 0], [.058, .045, .052]);
  const stripTower = port(strip, [.015, .046, 0], [.057, .044, .055]);
  const stripInput = port(strip, [-.23, 0, 0], [.051, .031, .029]);
  const wallPower = port(outlet, [-.056, 0, .047], [.055, .052, .065]);
  const offset = (endpoint, shifts) => endpoint().map((value, index) => value + shifts[index]);

  const cableHolder = group(desk, 0, 0, 0);
  const rubber = material('#272929', .80);
  const braid = material('#3b3d38', .93);
  const cables = [];
  const add = (radius, points, surface = rubber) => {
    cables.push({ radius, points, mesh: mesh(cableHolder, new T.BufferGeometry(), surface, 0, 0, 0) });
  };
  add(.013, () => [
    video(), offset(video, [.015, -.15, -.04]),
    [.50, worktop + .034, -.986], [.63, worktop + .027, -1.143], [.69, 1.79, -1.197],
    [1.00, 1.64, -1.10], [1.84, 1.58, -1.00], [2.03, .82, -1.08], towerVideo(),
  ]);
  add(.011, () => [
    monitorPower(), offset(monitorPower, [-.05, -.15, -.039]),
    [.14, worktop + .029, -1.058], [.36, worktop + .020, -1.163], [.43, 1.76, -1.196],
    [.83, 1.62, -1.085], [1.68, 1.57, -.98], [1.78, .42, -1.01], [1.96, .092, -.86], stripMonitor(),
  ]);
  add(.010, () => [
    keyboardUSB(), offset(keyboardUSB, [-.014, -.006, -.101]),
    [-.29, worktop + .032, -.08], [-.40, worktop + .029, -.28], [-.45, worktop + .025, -.52],
    [-.40, worktop + .022, -.76], [-.29, worktop + .018, -1.001],
    [-.15, worktop + .016, -1.155], [-.10, 1.78, -1.193],
    [.48, 1.60, -1.084], [1.60, 1.56, -1.01], [2.16, .79, -1.10], towerUSB(),
  ], braid);
  add(.015, () => [
    towerPower(), offset(towerPower, [.10, -.094, -.06]), [2.58, .055, -.913],
    [2.60, .047, -.73], [2.38, .062, -.65], stripTower(),
  ]);
  add(.015, () => [stripInput(), [1.89, .05, -.76], [1.98, .046, -1.01], [2.24, .06, -1.13],
    offset(wallPower, [0, -.15, .04]), wallPower()]);

  return function syncWiring() {
    for (const cable of cables) {
      const curve = new T.CatmullRomCurve3(cable.points().map(point => new T.Vector3(...point)));
      cable.mesh.geometry.dispose();
      cable.mesh.geometry = new T.TubeGeometry(curve, 40, cable.radius, 7, false);
    }
  };
}

function addPencil(parent, { base, direction, length, color, tipUp = true }) {
  const pencil = group(parent, ...base);
  const bodyGroup = group(pencil, 0, 0, 0);
  const radius = .0135;
  const axis = new T.Vector3(...direction).normalize();
  if (!tipUp) bodyGroup.position.addScaledVector(axis, length);
  bodyGroup.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tipUp ? axis : axis.negate());
  const lacquer = material(color, .59);
  const wood = material('#d6ac80', .88);
  const lead = material('#31302d', .76);
  const ferrule = new T.MeshStandardMaterial({ color: '#b8aa87', metalness: .44, roughness: .48 });
  const eraser = material('#b76658', .90);
  const tipLength = .052;
  const body = length - tipLength - .041;
  cylinder(bodyGroup, lacquer, radius, radius, body, 0, .041 + body / 2, 0, 6);
  cylinder(bodyGroup, ferrule, radius * 1.05, radius * 1.05, .025, 0, .032, 0, 12);
  for (const y of [.024, .039]) cylinder(bodyGroup, ferrule, radius * 1.12, radius * 1.12, .0025, 0, y, 0, 12);
  cylinder(bodyGroup, eraser, radius * .98, radius * .89, .020, 0, .011, 0, 12);
  cylinder(bodyGroup, wood, .0038, radius, .039, 0, length - .0325, 0, 6);
  cylinder(bodyGroup, lead, .0006, .0039, .013, 0, length - .0065, 0, 8);
  return pencil;
}

function addCoffee(desk, register) {
  const cup = register(group(desk, 2.78, worktop, .32, .23), 'coffee-cup', 'Кружка кофе', 'desk');
  const glaze = material('#e7e7df', .34);
  const profile = [
    [0, .002], [.127, .002], [.145, .007], [.151, .020], [.151, .292],
    [.150, .306], [.145, .311], [.138, .310], [.134, .303], [.134, .288],
    [.133, .048], [.128, .036], [.116, .029], [0, .029],
  ];
  mesh(cup, new T.LatheGeometry(profile.map(point => new T.Vector2(...point)), 48), glaze, 0, 0, 0);
  tube(cup, glaze, [
    [-.145, .261, 0], [-.194, .262, 0], [-.240, .231, 0], [-.263, .178, 0],
    [-.252, .120, 0], [-.208, .081, 0], [-.145, .076, 0],
  ], .018);
  const coffeeMap = texture(128, 128, (ctx, w, h) => {
    const coffee = ctx.createRadialGradient(w * .37, h * .40, w * .04, w / 2, h / 2, w * .5);
    coffee.addColorStop(0, '#603c26');
    coffee.addColorStop(.72, '#3c2013');
    coffee.addColorStop(.92, '#583019');
    coffee.addColorStop(.97, '#9d6537');
    coffee.addColorStop(1, '#663719');
    ctx.fillStyle = coffee;
    ctx.fillRect(0, 0, w, h);
  });
  const surface = mesh(cup, new T.CircleGeometry(.134, 44),
    new T.MeshStandardMaterial({ map: coffeeMap, roughness: .32 }), 0, .275, 0);
  surface.rotation.x = -Math.PI / 2;
  surface.castShadow = false;

  const steam = group(cup, 0, .302, 0);
  const steamMap = texture(80, 80, (ctx, w, h) => {
    const haze = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    haze.addColorStop(0, '#fff5edc0');
    haze.addColorStop(.45, '#fff5ed71');
    haze.addColorStop(1, '#fff5ed00');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
  });
  const wisps = Array.from({ length: 8 }, () => {
    const wisp = mesh(steam, new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({
      map: steamMap, transparent: true, depthWrite: false, toneMapped: false, opacity: 0,
    }), 0, 0, 0);
    wisp.castShadow = wisp.receiveShadow = false;
    return wisp;
  });
  const facing = new T.Quaternion();
  return { root: steam, update(seconds, camera) {
    steam.getWorldQuaternion(facing).invert().multiply(camera.quaternion);
    for (const [i, wisp] of wisps.entries()) {
      const t = (seconds * .48 + i / wisps.length) % 1;
      const taper = (1 - t) ** 1.18;
      const curl = t * Math.sin(t * 6 + seconds * .75);
      wisp.position.set(.041 * curl + .047 * t * t, .44 * t, .016 * Math.sin(i * 2.4 + t * 5));
      wisp.quaternion.copy(facing);
      wisp.rotateZ(.29 * Math.sin(i * 2 + t * 6));
      wisp.scale.set(.029 + .227 * taper, .091 + .069 * taper, 1);
      wisp.material.opacity = .34 * taper * T.MathUtils.smoothstep(t, 0, .13);
    }
  } };
}

function addSuspendedPendant(anchor, register) {
  // Add the suspension around the existing editable pendant offsets.
  const display = group(anchor, -.13, 1.10, -.035, .16);
  const displayOrigin = display.position.clone();
  const object = register(group(display, 0, .11, -.10), 'pendant', 'Кулон «Шухов»', 'desk');
  const height = .69;
  const eye = height / 2 + .044;
  const hangPoint = [-.043, .985, -.021];
  const nail = group(object, ...hangPoint);
  const iron = new T.MeshStandardMaterial({ color: '#665749', metalness: .58, roughness: .58 });
  tube(nail, iron, [[.012, -.014, -.108], [0, 0, 0], [.012, .012, .043], [.026, .020, .069]], .012);
  rod(nail, iron, [.024, .019, .064], [.029, .022, .074], .023);

  const sway = group(object, ...hangPoint);
  const suspension = group(sway, ...hangPoint.map(value => -value));
  const swivel = group(suspension, 0, eye, 0);
  const pendant = createProduct('pendant', height, { center: true });
  pendant.position.y = -eye;
  swivel.add(pendant);
  pendant.traverse(part => {
    if (!part.isMesh) return;
    part.material = part.material.clone();
    part.material.color.lerp(new T.Color('#c8bda9'), .17);
    part.material.metalness *= .53;
  });
  // The open lattice leaves gaps that a pointer ray can otherwise pass through.
  const hitArea = new T.Mesh(new T.CylinderGeometry(.16, .16, height, 12),
    new T.MeshBasicMaterial({ transparent: true }));
  hitArea.visible = false;
  hitArea.userData.pickOnly = true;
  pendant.add(hitArea);
  const ring = mesh(swivel, new T.TorusGeometry(.049, .009, 8, 20), material('#686a63', .34), 0, 0, 0);
  ring.rotation.y = .28;

  const cord = tube(suspension, material('#181717', .92), [
    [0, eye + .028, 0], [-.105, .53, .03], [-.159, .72, .015], [-.109, .91, -.012],
    hangPoint, [.053, .933, -.017], [.123, .764, -.041], [.088, .565, -.022],
  ], .0115, true);
  const vertices = cord.geometry.attributes.position;
  const rest = vertices.array.slice();
  vertices.setUsage(T.DynamicDrawUsage);
  cord.geometry.computeBoundingSphere();
  cord.geometry.boundingSphere.radius += .045;

  const bounds = new T.Box3();
  const displayWorld = new T.Vector3();
  function keepInFrontOfWall() {
    display.position.copy(displayOrigin);
    const wallClearance = backWall + .022;
    swivel.updateWorldMatrix(true, false);
    const overlap = wallClearance - bounds.setFromObject(swivel).min.z;
    if (overlap <= 0) return;
    display.getWorldPosition(displayWorld);
    displayWorld.z += overlap;
    display.position.copy(anchor.worldToLocal(displayWorld));
  }

  function update(seconds) {
    sway.rotation.set(.042 * Math.sin(seconds * 1.37), -.15 + .12 * Math.sin(seconds * .91),
      .066 * Math.sin(seconds * 1.16));
    swivel.rotation.z = .09 * Math.sin(seconds * 1.37 - .46);
    swivel.rotation.y = .10 * Math.sin(seconds * 1.74);
    for (let i = 0; i < rest.length; i += 3) {
      const along = T.MathUtils.clamp((rest[i + 1] - eye - .03) / .59, 0, 1);
      const bend = Math.sin(Math.PI * along) * .033;
      vertices.array[i] = rest[i] + bend * Math.sin(seconds * 1.56 + along * 2.3);
      vertices.array[i + 2] = rest[i + 2] + bend * .54 * Math.cos(seconds * 1.38 + along);
    }
    vertices.needsUpdate = true;
    keepInFrontOfWall();
  }
  return { object, update, keepInFrontOfWall };
}

export function buildWorkshop(scene, backdrop, mark) {
  const editables = [];
  function register(object, id, label, section = 'room', axis = 'y') {
    editables.push({ object, id, label, section, axis });
    return object;
  }
  const trim = material('#adb89a');
  const wallWidth = rightWall + 12.35;
  const wallCenter = rightWall - wallWidth / 2;
  const roomDepth = 16;
  const sideWallCenter = backWall + roomDepth / 2;
  const surfaces = workshopMaterials(wallWidth, roomDepth, ceilingHeight);
  const { floor, wall, sideWall, powderCoat, deskFrame } = surfaces;
  box(scene, floor, wallWidth, .10, roomDepth, wallCenter, -.05, sideWallCenter, [24, 1, 24]);
  box(scene, wall, wallWidth, ceilingHeight, .12, wallCenter, ceilingHeight / 2, backWall - .06, [24, 20, 1]);
  const window = addWindowWall(scene, sideWall, roomDepth, backdrop);
  const ceiling = box(scene, material('#e6e0d6', .96), wallWidth, .10, roomDepth, wallCenter, ceilingHeight + .05, sideWallCenter, [24, 1, 20]);
  ceiling.castShadow = false;
  box(scene, trim, wallWidth, .12, .055, wallCenter, .06, backWall + .0275);
  box(scene, trim, .055, .12, roomDepth, rightWall - .0275, .06, sideWallCenter);
  const desk = register(group(scene, .19, 0, -.67), 'desk', 'Рабочий стол');
  const board = register(addPinboard(scene, desk.position.x - 1.97), 'board', 'Пробковая доска', 'room', 'z');
  const poster = addWallSketch(scene, desk.position.x + .48);
  const wallSketch = register(poster.object, 'wall-sketch', 'Чертёж на стене', 'room', 'z');
  woodenWorktop(desk, surfaces.desk, 6.44, .17, 2.35);
  roundedBox(desk, deskFrame, 5.98, .13, .084, .010, 0, 1.72, .88);
  const fastener = material('#636360', .65);
  for (const x of [-2.99, 2.99]) {
    for (const z of [-.95, .94]) {
      roundedBox(desk, deskFrame, .10, 1.77, .10, .008, x, .915, z);
      roundedBox(desk, black, .108, .030, .108, .007, x, .015, z);
    }
    roundedBox(desk, deskFrame, .10, .08, 2.02, .008, x, .19, 0);
    for (const y of [.185, 1.655]) {
      cylinder(desk, fastener, .019, .019, .006, x, y, .991, 12).rotation.x = Math.PI / 2;
    }
  }
  const drawerStart = desk.children.length;
  const drawerBody = material('#302f2d', .88);
  const drawerFace = material('#3e3d39', .82);
  const drawerPull = material('#242624', .62);
  const pullEdge = material('#4b4a44', .71);
  roundedBox(desk, drawerBody, 1.12, 1.40, 1.93, .019, -2.28, .94, -.03);
  for (const x of [-2.69, -1.87]) {
    for (const z of [-.76, .71]) roundedBox(desk, drawerPull, .12, .24, .15, .018, x, .12, z);
  }
  for (let i = 0; i < 3; i++) {
    const y = .51 + i * .45;
    roundedBox(desk, drawerFace, 1.10, .42, .058, .012, -2.28, y, .98);
    roundedBox(desk, drawerPull, .223, .055, .018, .008, -2.28, y + .095, 1.012);
    roundedBox(desk, pullEdge, .18, .012, .013, .004, -2.28, y + .077, 1.023);
  }
  register(bundle(desk, desk.children.slice(drawerStart), -2.28, .24, -.03), 'drawer', 'Тумба с ящиками', 'desk');
  const carton = register(group(desk, -3.30, 0, -.62, -.13), 'floor-carton', 'Коробка у стола', 'desk');
  box(carton, surfaces.cardboard, .32, .86, .45, 0, .43, 0);
  const packingTape = material('#c59d65');
  box(carton, packingTape, .073, .005, .452, 0, .861, 0);
  box(carton, packingTape, .073, .15, .004, 0, .786, .226);
  box(carton, paper, .147, .106, .004, -.065, .62, .226);

  const printer = createA1();
  printer.root.position.set(-2.13, worktop, .12);
  printer.root.rotation.y = -.09;
  printer.root.scale.setScalar(.94);
  desk.add(printer.root);
  register(printer.root, 'printer', 'Принтер A1', 'desk');
  const monitor = register(addMonitor(desk), 'monitor', 'Монитор', 'desk');
  register(addDeskMat(desk, surfaces.deskMat), 'desk-mat', 'Коврик на столе', 'desk');
  const keyboard = register(addKeyboard(desk), 'keyboard', 'Клавиатура', 'desk');
  register(addMouse(desk), 'mouse', 'Мышь', 'desk');
  const chandelier = addChandelier(scene, desk);
  register(chandelier.object, 'chandelier', 'Люстра');
  const chandelierItem = editables[editables.length - 1];
  chandelierItem.maximumHeight = ceilingHeight - 1.0;
  chandelierItem.boundsObject = chandelier.shade;

  const pendantAnchor = register(group(desk, 2.30, worktop, .57, -.16), 'pendant-tray', 'Точка подвеса кулона', 'desk');
  const pendant = addSuspendedPendant(pendantAnchor, register);

  const folder = register(group(desk, 2.61, worktop, .36, -.08), 'desk-folder', 'Визитки мастерской', 'desk');
  box(folder, material('#706c59'), .86, .035, .50, 0, .018, 0);
  for (let i = 0; i < 3; i++) box(folder, paper, .79, .009, .446, .016 * i, .04 + i * .009, .015);
  const sheetMap = texture(540, 300, (ctx, w, h) => {
    ctx.fillStyle = '#eae1d2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#783f30';
    ctx.font = 'bold 53px sans-serif';
    ctx.fillText('ЯЖЕМОХ', 31, 81);
    technicalSketch(ctx, 404, 38, 61, 89, '#783f30');
    ctx.fillRect(31, 160, 447, 3);
    ctx.fillStyle = '#353b38';
    ctx.font = 'bold 33px sans-serif';
    ctx.fillText('Иван Чубатов', 31, 220);
    ctx.font = '24px sans-serif';
    ctx.fillText('@yazhemoh', 32, 267);
  });
  const contactSheet = mesh(folder, new T.PlaneGeometry(.774, .43), new T.MeshBasicMaterial({ map: sheetMap }), .032, .064, .015);
  contactSheet.name = 'contact-sheet';
  contactSheet.rotation.x = -Math.PI / 2;
  contactSheet.castShadow = false;
  contactSheet.geometry.computeBoundingBox();
  const pencilHolder = createProduct('pencil-holder', .35);
  pencilHolder.position.set(2.14, worktop, -.79);
  pencilHolder.rotation.y = .26;
  pencilHolder.traverse(object => { if (object.isMesh) object.receiveShadow = false; });
  desk.add(pencilHolder);
  register(pencilHolder, 'pencil-holder', 'Карандашница', 'desk');
  for (const pencil of [
    { base: [-.037, .126, -.044], direction: [-.24, 1, -.07], length: .43, color: '#c5833f' },
    { base: [-.021, .093, .009], direction: [.08, 1, .17], length: .37, color: '#b3a992', tipUp: false },
    { base: [.012, .125, -.034], direction: [.10, 1, -.19], length: .49, color: '#547785', tipUp: false },
    { base: [.032, .110, .027], direction: [.19, 1, .18], length: .40, color: '#8f4c43' },
    { base: [-.009, .112, .045], direction: [-.095, 1, .07], length: .34, color: '#c3a059' },
  ]) addPencil(pencilHolder, pencil);
  register(addPencil(desk, {
    base: [.88, worktop + .015, 1.017], direction: [1, 0, .11], length: .39, color: '#caa255',
  }), 'loose-pencil', 'Карандаш на столе', 'desk');

  const coffee = addCoffee(desk, register);
  const tower = addComputer(desk, register);
  const syncWiring = addDeskWiring(scene, desk, monitor, keyboard, tower);

  const { shelf, firefly, shelfBounds, drawing, prototypeCollection, ringSample, lacedSample, foldedSample } = addShelving(scene, register, surfaces, mark);
  const table = createProduct('table', 1.26);
  table.position.set(desk.position.x - 4.04, 0, desk.position.z + .48);
  scene.add(table);
  register(table, 'hyperline', 'Столик Hyperline');
  const chair = register(addChair(scene, desk, surfaces.chair, powderCoat), 'chair', 'Кресло');

  const cat = addWorkshopCat(chair);

  const contacts = addContactShadows(scene);
  contacts.add(desk, 0, 0, 7.1, 3.2, .25);
  for (const x of [-2.99, 2.99]) {
    for (const z of [-.95, .94]) contacts.add(desk, x, z, .44, .44, .62);
  }
  contacts.add(chair, 0, 0, 1.78, 1.78, .52);
  contacts.add(table, 0, 0, 1.10, .92, .56);
  const shelfBase = shelfBounds.getCenter(new T.Vector3());
  const shelfSize = shelfBounds.getSize(new T.Vector3());
  contacts.add(shelf, shelfBase.x, shelfBase.z, shelfSize.x + .49, shelfSize.z + .48, .58);

  const screenLight = new T.PointLight('#b5cbff', 1.25, 2.7);
  screenLight.position.set(0, .91, .45);
  monitor.add(screenLight);
  const lampLight = new T.PointLight('#91dee8', 1.75, 2.4);
  lampLight.position.set(0, .51, .17);
  firefly.add(lampLight);
  firefly.traverse(object => {
    if (object.material?.name !== 'fibre') return;
    object.material = object.material.clone();
    object.material.emissive.set('#45beda');
    object.material.emissiveIntensity = .82;
  });

  return {
    printer, pendant, cat, coffee, window, editables, ceiling, poster,
    exhibits: { about: board, engineering: monitor, contacts: folder, prototypes: prototypeCollection, generator: drawing, printer: printer.root },
    overviewObjects: [board, wallSketch, desk, shelf, table, chair, chandelier.shade],
    syncLayout() {
      chandelier.sync();
      contacts.sync();
      syncWiring();
      pendant.keepInFrontOfWall();
    },
    zones: [
      { id: 'desk', object: desk, frame: {
        center: [0, worktop - .085, 0], size: [6.44, .17, 2.35], direction: [-.055, .39, 1],
        narrowDirection: [-.055, .55, 1], fill: true, focus: [0, 2.58, -.15],
      } },
      { id: 'board', object: board, frame: { center: [0, 0, .046], size: [3.31, 1.78, .12], direction: [0, .045, 1] } },
      { id: 'shelf', object: shelf, frame: {
        center: shelfBounds.getCenter(new T.Vector3()).toArray(),
        size: shelfBounds.getSize(new T.Vector3()).toArray(),
        direction: [0, 0, 1], fill: true,
      } },
    ],
    targets: [
      { id: 'about', object: board },
      { id: 'engineering', object: monitor },
      { id: 'firefly', object: firefly, curved: true },
      { id: 'portfolio', object: table, curved: true },
      { id: 'contacts', object: folder },
      { id: 'pendant', object: pendant.object },
      { id: 'printer', object: printer.root },
      { id: 'generator', object: drawing },
      { id: 'prototypes', object: ringSample },
      { id: 'prototypes', object: lacedSample },
      { id: 'prototypes', object: foldedSample },
    ],
    lettering: [
      { id: 'about', key: 'board', object: board, title: catalogue.about.label, edge: [[-1.4, .89, .046], [1.4, .89, .046]], at: .68, views: [null, 'desk', 'board'] },
      { id: 'printer', object: printer.root, title: catalogue.printer.label, edge: [[-.62, .54, -.35], [-.62, 1.83, -.35]], views: [null, 'desk'] },
      { id: 'engineering', object: monitor, title: catalogue.engineering.label, edge: [[-1.33, 1.50, .24], [1.33, 1.50, .24]], at: .77, views: [null, 'desk'] },
      { id: 'pendant', object: pendant.object, title: catalogue.pendant.label, edge: [[-.14, -.25, 0], [-.14, .26, 0]], rotation: -Math.PI / 2, views: [null, 'desk'] },
      { id: 'contacts', key: 'projects', object: folder, title: catalogue.contacts.label, edge: [[-.42, .04, .25], [.42, .04, .25]], side: 1, views: [null, 'desk'] },
      { id: 'desk', object: desk, title: 'Рабочий стол', edge: [[-3.1, 1.77, 1.17], [3.1, 1.77, 1.17]], at: .56, side: 1, views: [null] },
      { id: 'portfolio', key: 'hyperline', object: table, title: catalogue.portfolio.label, rim: { radius: [.415, .651], elevation: 1.252, gap: 9 }, views: [null, 'desk'] },
      { id: 'cat', object: cat.object, title: 'Погладить кота', edge: [[-.3, -.14, -.44], [.3, -.14, -.44]], side: 1, rotation: 0, views: [null, 'desk'] },
      { id: 'shelf', object: shelf, title: 'Стеллаж', edge: [[-1.07, 1.9, .374], [-1.07, 3.96, .374]], at: .64, views: [null] },
      { id: 'firefly', object: firefly, title: catalogue.firefly.label, rim: { radius: [.404, .404], elevation: .787, gap: 10 }, views: [null, 'shelf'] },
      { id: 'prototypes', object: ringSample, title: catalogue.prototypes.label, edge: [[-.22, 0, .18], [.40, 0, .18]], side: 1, views: [null, 'shelf'] },
      { id: 'generator', object: drawing, title: catalogue.generator.label, edge: [[-.43, 0, .14], [.43, 0, .14]], side: 1, views: [null, 'shelf'] },
    ],
  };
}

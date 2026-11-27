import * as T from 'three';
import { random, texture } from './workshop-materials.js';

// Each section describes a center and two radii along the cat's spine.
function sculpt(sections, segments = 24, sides = 24) {
  const spline = columns => new T.CatmullRomCurve3(sections.map(section => new T.Vector3(...columns.map(index => section[index]))));
  const centers = spline([0, 1, 2]);
  const radii = spline([3, 4]);
  const positions = [];
  const uv = [];
  const indices = [];
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    const center = centers.getPoint(t);
    const radius = radii.getPoint(t);
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * Math.PI * 2;
      positions.push(center.x + radius.x * Math.cos(angle), center.y + radius.y * Math.sin(angle), center.z);
      uv.push(side / sides, t);
      if (ring === segments || side === sides) continue;
      const a = ring * (sides + 1) + side;
      const b = a + sides + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Join the normals across the UV seam.
  const normals = geometry.getAttribute('normal');
  const normal = new T.Vector3();
  const opposite = new T.Vector3();
  for (let ring = 0; ring <= segments; ring++) {
    const first = ring * (sides + 1);
    const last = first + sides;
    normal.fromBufferAttribute(normals, first).add(opposite.fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  return geometry;
}

function taperedTail(curve, segments = 24, sides = 10) {
  const geometry = new T.TubeGeometry(curve, segments, 1, sides, false);
  const positions = geometry.getAttribute('position');
  const point = new T.Vector3();
  for (let step = 0; step <= segments; step++) {
    const t = step / segments;
    const center = curve.getPointAt(t);
    const radius = .058 * (1 - .57 * t) * Math.sqrt(Math.min(1, (1 - t) * 12));
    for (let side = 0; side <= sides; side++) {
      const index = step * (sides + 1) + side;
      point.fromBufferAttribute(positions, index).sub(center).multiplyScalar(radius).add(center);
      positions.setXYZ(index, point.x, point.y, point.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function earSurface() {
  const geometry = new T.BufferGeometry();
  // The rim wraps around a recessed cup, rather than sitting on a flat triangle.
  const outline = [
    [-.067, .002, -.006], [-.059, .065, -.011], [-.041, .115, .004],
    [-.023, .135, .013], [-.006, .143, .019], [.014, .133, .024], [.043, .097, .024],
    [.066, .044, .022], [.071, .004, .013], [.008, -.016, .021],
  ];
  const position = [0, .051, .032];
  const color = [];
  const indices = [];
  const inner = new T.Color('#32303e');
  const rim = new T.Color('#3a3b48');
  const base = new T.Color('#242631');
  color.push(...inner.toArray());
  for (const [x, y, z] of outline) {
    position.push(x * .77, .052 + (y - .052) * .76, z + .006);
    color.push(...inner.clone().lerp(base, y * 4).toArray());
  }
  for (const [x, y, z] of outline) {
    position.push(x, y, z);
    color.push(...base.clone().lerp(rim, T.MathUtils.smoothstep(y, .018, .095)).toArray());
  }
  const back = position.length / 3;
  position.push(0, .050, .055);
  color.push(...base.toArray());
  outline.forEach((_, index) => {
    const next = (index + 1) % outline.length;
    const a = 1 + index;
    const b = 1 + next;
    const c = a + outline.length;
    const d = b + outline.length;
    indices.push(0, a, b, a, c, b, b, c, d, c, back, d);
  });
  geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(color, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function almondEye() {
  const outline = new T.Shape();
  outline.moveTo(-1, 0);
  outline.bezierCurveTo(-.96, 1.20, .79, 1.25, 1, .06);
  outline.bezierCurveTo(.87, -1.14, -.93, -1.16, -1, 0);
  const geometry = new T.ShapeGeometry(outline, 22);
  const points = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < points.count; i++) {
    // Set the UVs before sizing the lid to the skull.
    uv.setXY(i, (points.getX(i) + 1) / 2, (points.getY(i) + .92) / 1.84);
  }
  return geometry;
}

export function addWorkshopCat(chair) {
  const object = new T.Group();
  chair.add(object);
  object.name = 'workshop-cat';
  object.position.set(0, 1.285, -.09);
  object.rotation.y = .63;

  const rng = random(317);
  const furMap = texture(256, 256, (ctx, width, height) => {
    ctx.fillStyle = '#30343e';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 8200; i++) {
      const x = rng() * width;
      const y = rng() * height;
      ctx.strokeStyle = rng() > .51 ? '#8b9bb20c' : '#19202e15';
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1 + rng() * 1.4, y + 2.5 + rng() * 2.8);
      ctx.stroke();
    }
  });
  const paint = (color, roughness = .82) => new T.MeshStandardMaterial({ color, roughness });
  const fur = new T.MeshStandardMaterial({
    map: furMap, roughness: .82,
    emissive: '#344456', emissiveIntensity: .22,
  });
  const muzzle = paint('#373943');
  muzzle.emissive.set('#3f4658');
  muzzle.emissiveIntensity = .21;
  const nose = paint('#262632', .57);
  const mouth = paint('#161925');
  const whisker = paint('#686978');
  const toes = paint('#373943');
  const sphere = new T.SphereGeometry(1, 24, 16);
  const eyeMap = texture(96, 96, (ctx, width, height) => {
    ctx.fillStyle = '#18252d';
    ctx.fillRect(0, 0, width, height);
    const x = width / 2;
    const y = height / 2;
    ctx.save();
    ctx.translate(x, y);
    const iris = ctx.createRadialGradient(0, 0, 7, 0, 0, 37);
    iris.addColorStop(0, '#14746e');
    iris.addColorStop(.68, '#24bca9');
    iris.addColorStop(.91, '#4adac5');
    iris.addColorStop(1, '#176f6a');
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(0, 0, 37, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5c982';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 35, 0, Math.PI * 1.03, Math.PI * 1.76);
    ctx.stroke();
    const pupil = ctx.createLinearGradient(0, -30, 0, 31);
    pupil.addColorStop(0, '#111c23');
    pupil.addColorStop(.61, '#13202a');
    pupil.addColorStop(1, '#163640');
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.ellipse(2, -2, 29, 31, -.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fffff9f5';
    ctx.beginPath();
    ctx.ellipse(x - 11, y - 13, 6.4, 6.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 11, y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  const eyeGeometry = almondEye();
  const eyeSurface = new T.MeshStandardMaterial({
    map: eyeMap, emissiveMap: eyeMap, emissive: '#ffffff', emissiveIntensity: .48,
    roughness: .6, side: T.DoubleSide,
  });
  const eyelidClosure = { value: 0 };
  eyeSurface.onBeforeCompile = shader => {
    shader.uniforms.eyelidClosure = eyelidClosure;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>', 'uniform float eyelidClosure;\n#include <map_pars_fragment>')
      .replace('#include <map_fragment>', `
        float lidCurve = pow(abs(vMapUv.x - 0.5) * 2.0, 2.0) * 0.13;
        float lidY = mix(1.12, 0.13, eyelidClosure) + lidCurve;
        if (vMapUv.y > lidY) discard;
        #include <map_fragment>
      `);
  };
  const lidCrease = new T.MeshStandardMaterial({
    color: '#242831', roughness: .9, emissive: '#48556c', emissiveIntensity: .34,
  });
  const lidGeometry = new T.TubeGeometry(new T.QuadraticBezierCurve3(
    new T.Vector3(-.036, -.013, -.0025),
    new T.Vector3(0, .0005, -.003),
    new T.Vector3(.036, -.013, -.0025),
  ), 12, .0024, 5);
  const earGeometry = earSurface();
  const earFur = new T.MeshStandardMaterial({
    vertexColors: true, roughness: .86, side: T.DoubleSide, emissive: '#3b465a', emissiveIntensity: .24,
  });

  fur.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float edge = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);
      outgoingLight += vec3(0.054, 0.074, 0.110) * smoothstep(0.69, 0.98, edge) * 0.55;
      #include <opaque_fragment>
    `);
  };

  function part(parent, surface, x, y, z, sx, sy, sz) {
    const mesh = new T.Mesh(sphere, surface);
    parent.add(mesh);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    return mesh;
  }

  function joint(parent, x, y, z) {
    const group = new T.Group();
    parent.add(group);
    group.position.set(x, y, z);
    return group;
  }

  function skin(parent, profile) {
    const mesh = new T.Mesh(sculpt(profile), fur);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const torso = skin(object, [
    [.027, .161, -.31, .02, .035],
    [.020, .181, -.26, .149, .141],
    [-.017, .206, -.176, .228, .204],
    [-.059, .196, -.035, .263, .202],
    [-.098, .186, .14, .263, .189],
    [-.103, .180, .29, .221, .173],
    [-.092, .146, .383, .146, .135],
    [-.077, .139, .421, .005, .005],
  ]);
  // The center of mass stays over the crouched hindquarters, with the forepaws on the seat.
  torso.scale.set(.88, .89, .80);
  torso.position.z = -.041;
  const thigh = part(object, fur, -.207, .107, .124, .107, .109, .155);
  thigh.rotation.y = -.32;
  const paws = [
    { x: .147, z: -.359, angle: -.11 },
    { x: -.110, z: -.312, angle: .09 },
  ].map(({ x, z, angle }) => {
    const paw = joint(object, x, .034, z);
    paw.rotation.y = angle;
    const foreleg = part(paw, fur, 0, .034, .081, .064, .062, .119);
    foreleg.rotation.x = -.19;
    part(paw, fur, 0, 0, -.009, .064, .042, .077);
    for (const toe of [-1, 0, 1]) {
      part(paw, toes, toe * .032, 0, -.058 + Math.abs(toe) * .009, .025, .027, .029);
    }
    return paw;
  });

  const tail = joint(object, -.151, .113, .157);
  const tailCurve = new T.CatmullRomCurve3([
    [0, .017, .021], [-.072, -.013, .032], [-.146, -.011, -.018],
    [-.194, .014, -.091], [-.208, .072, -.166], [-.190, .142, -.216],
    [-.157, .165, -.246],
  ].map(point => new T.Vector3(...point)));
  const tailSegments = 24;
  const tailSides = 10;
  const tailMesh = new T.Mesh(taperedTail(tailCurve, tailSegments, tailSides), fur);
  tailMesh.castShadow = true;
  tail.add(tailMesh);
  const tailPositions = tailMesh.geometry.getAttribute('position');
  const tailRest = tailPositions.array.slice();
  tailMesh.geometry.computeBoundingSphere();
  tailMesh.geometry.boundingSphere.radius += .12;

  function swayTail(time, pleasure) {
    const swing = .008 + .084 * pleasure;
    for (let ring = 0; ring <= tailSegments; ring++) {
      const t = ring / tailSegments;
      const wave = time * 3.7 - t * 2.3;
      const bend = t * t * swing;
      const across = bend * Math.sin(wave);
      const lift = bend * .48 * Math.cos(wave);
      for (let side = 0; side <= tailSides; side++) {
        const vertex = ring * (tailSides + 1) + side;
        const offset = vertex * 3;
        const x = tailRest[offset];
        const y = tailRest[offset + 1];
        const z = tailRest[offset + 2];
        tailPositions.setXYZ(vertex, x + across, y + lift, z - across * .2);
      }
    }
    tailPositions.needsUpdate = true;
    tailMesh.geometry.computeVertexNormals();
  }

  const neck = joint(object, .025, .22, -.235);
  part(neck, fur, 0, .01, .022, .152, .158, .131);
  const head = joint(neck, .020, .093, -.024);
  head.rotation.y = .28;
  head.scale.set(1.22, 1.16, 1.08);
  skin(head, [
    [0, -.055, -.179, .018, .019],
    [0, -.030, -.150, .089, .073],
    [0, .004, -.109, .138, .106],
    [0, .035, -.057, .151, .116],
    [0, .039, .023, .158, .127],
    [0, .030, .091, .124, .107],
    [0, .022, .126, .005, .008],
  ]);

  const ears = [];
  const eyes = [];
  for (const side of [-1, 1]) {
    const ear = joint(head, side * .088, .080, -.010);
    ear.rotation.y = side * .20;
    ear.scale.set(1.04, 1.29, 1.12);
    const shell = new T.Mesh(earGeometry, earFur);
    shell.castShadow = true;
    ear.add(shell);
    ears.push(ear);

    const eye = joint(head, side * .078, .046, -.164);
    eye.rotation.y = side * -.42;
    eye.rotation.z = side * .08;
    const shape = new T.Mesh(eyeGeometry, eyeSurface);
    shape.scale.set(.066, .074, 1);
    eye.add(shape);
    const closedLid = new T.Mesh(lidGeometry, lidCrease);
    closedLid.scale.x = 1.60;
    closedLid.position.z = -.010;
    closedLid.visible = false;
    eye.add(closedLid);
    eyes.push({ shape, closedLid });
    part(head, muzzle, side * .030, -.058, -.152, .041, .025, .030);
    const smile = new T.QuadraticBezierCurve3(
      new T.Vector3(0, -.064, -.186),
      new T.Vector3(side * .014, -.081, -.181),
      new T.Vector3(side * .033, -.071, -.176),
    );
    head.add(new T.Mesh(new T.TubeGeometry(smile, 9, .002, 5), mouth));
    for (let i = 0; i < 3; i++) {
      const whiskerCurve = new T.QuadraticBezierCurve3(
        new T.Vector3(side * .067, -.054 - i * .011, -.176),
        new T.Vector3(side * .138, -.038 - i * .018, -.191),
        new T.Vector3(side * (.199 - i * .011), -.045 - i * .027, -.160),
      );
      head.add(new T.Mesh(new T.TubeGeometry(whiskerCurve, 7, .0011, 4), whisker));
    }
  }
  part(head, nose, 0, -.050, -.184, .018, .011, .009);
  part(head, muzzle, 0, -.081, -.149, .044, .022, .024);
  ears.forEach((ear, index) => { ear.rotation.z = index === 0 ? .23 : -.24; });

  let time = 0;
  let pleasure = 0;
  let remaining = 0;
  let strokeTime = 0;
  function pet() {
    if (remaining <= 0 && pleasure < .15) strokeTime = 0;
    remaining = 1.45;
  }
  function update(dt, motion) {
    if (!motion && remaining <= 0 && pleasure === 0) return false;
    remaining = Math.max(0, remaining - dt);
    const target = remaining > 0 ? 1 : 0;
    pleasure = motion ? T.MathUtils.damp(pleasure, target, 7, dt) : target;
    if (pleasure < .002) pleasure = 0;
    if (motion) {
      time += dt;
      strokeTime += dt;
    }
    const nuzzle = motion ? Math.sin(Math.min(1, strokeTime / .86) * Math.PI) * pleasure : 0;
    const breath = motion ? Math.sin(time * 2.35) : 0;
    torso.scale.y = .89 + breath * .018;
    torso.rotation.z = -.028 * pleasure;
    neck.rotation.x = -.12 * pleasure - .09 * nuzzle;
    neck.position.y = .22 + .021 * pleasure + .006 * breath;
    head.rotation.x = .02 - .13 * pleasure - .077 * nuzzle;
    head.rotation.z = .085 * pleasure + .09 * nuzzle;
    head.rotation.y = .28 + .07 * pleasure + (motion ? Math.sin(time * .7) * .035 : 0);
    const blinkTime = (time % 5.7) - 4.2;
    const blink = motion ? Math.max(0, 1 - Math.abs(blinkTime) / (blinkTime < 0 ? .075 : .16)) : 0;
    const closure = Math.max(blink, pleasure);
    eyelidClosure.value = closure;
    eyeSurface.emissiveIntensity = .48 * (1 - T.MathUtils.smoothstep(closure, .48, .84));
    for (const { shape, closedLid } of eyes) {
      shape.visible = closure < .84;
      closedLid.visible = closure >= .72;
    }
    const flick = motion ? Math.sin(Math.min(1, strokeTime / .48) * Math.PI * 2) * pleasure : 0;
    ears[0].rotation.y = -.20 - .21 * flick;
    ears[1].rotation.z = -.24 + .13 * flick;
    paws.forEach((paw, index) => {
      const press = motion ? Math.max(0, Math.sin(strokeTime * 4 - index * Math.PI)) * pleasure : 0;
      paw.position.y = .034 + .014 * press;
      paw.rotation.x = -.09 * press;
    });
    if (motion) {
      tail.rotation.y = Math.sin(time * 2.4) * (.008 + .045 * pleasure);
      swayTail(time, pleasure);
    }
    return true;
  }
  return { object, pet, update };
}

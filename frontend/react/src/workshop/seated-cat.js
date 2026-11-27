import * as T from 'three';

export function addSeatedCat(chair) {
  const object = new T.Group();
  object.name = 'workshop-cat';
  object.position.set(.025, 1.286, -.145);
  object.rotation.y = .55;
  chair.add(object);

  const material = (color, roughness = .86) => new T.MeshStandardMaterial({ color, roughness });
  const coat = material('#484a4d');
  const claw = material('#aaa29d', .66);
  const softFur = material('#55575b');
  const innerEar = material('#68555e');
  const nose = material('#5c4149', .56);
  const mouth = material('#29252e');
  const whiskers = material('#a69d99');
  const eyelid = material('#100f15');
  const iris = material('#aca773', .42);
  const pupil = material('#181e25', .28);
  const glint = new T.MeshBasicMaterial({ color: '#fff9e7' });
  const sphere = new T.SphereGeometry(1, 36, 28);

  function ball(parent, surface, position, scale) {
    const mesh = new T.Mesh(sphere, surface);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function joint(parent, x, y, z) {
    const group = new T.Group();
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  }

  function line(parent, surface, points, radius) {
    const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
    const mesh = new T.Mesh(new T.TubeGeometry(curve, 18, radius, 8), surface);
    parent.add(mesh);
    return mesh;
  }

  const body = joint(object, 0, .23, .06);
  const torso = ball(body, coat, [0, 0, 0], [.232, .233, .204]);
  torso.geometry = sphere.clone();
  const torsoPoints = torso.geometry.getAttribute('position');
  for (let i = 0; i < torsoPoints.count; i++) {
    const y = torsoPoints.getY(i);
    const haunch = 1 + .34 * Math.exp(-((y + .48) ** 2) / .16);
    torsoPoints.setX(i, torsoPoints.getX(i) * haunch);
    torsoPoints.setZ(i, torsoPoints.getZ(i) * (1 + .12 * (1 - y) / 2));
  }
  torso.geometry.computeVertexNormals();
  ball(body, softFur, [0, .053, -.116], [.151, .184, .071]);

  // A single surface runs from shoulder to rounded paw.
  const legGeometry = sphere.clone();
  const legPoints = legGeometry.getAttribute('position');
  for (let i = 0; i < legPoints.count; i++) {
    const y = legPoints.getY(i);
    const foot = Math.exp(-((y + .72) ** 2) / .12);
    legPoints.setX(i, legPoints.getX(i) * (1 + .37 * foot));
    legPoints.setZ(i, legPoints.getZ(i) * (1 + .42 * foot) - .72 * foot + .28 * Math.max(0, y));
  }
  legGeometry.computeVertexNormals();
  const clawGeometry = new T.ConeGeometry(.0052, .016, 10);

  const head = joint(object, 0, .468, -.064);
  ball(head, coat, [0, 0, 0], [.212, .167, .158]);
  ball(head, softFur, [0, -.079, -.097], [.135, .071, .054]);

  const earGeometry = sphere.clone();
  const earPoints = earGeometry.getAttribute('position');
  for (let i = 0; i < earPoints.count; i++) {
    const y = earPoints.getY(i);
    const height = (y + 1) / 2;
    const width = 1.13 - .67 * height;
    earPoints.setXYZ(i, earPoints.getX(i) * width, y, earPoints.getZ(i) * (1 - .48 * height));
  }
  earGeometry.computeVertexNormals();
  const eyes = [];
  const ears = [];
  for (const side of [-1, 1]) {
    const leg = ball(object, coat, [side * .077, .151, -.106], [.068, .151, .070]);
    leg.geometry = legGeometry;
    for (const offset of [-1, 0, 1]) {
      const tip = new T.Mesh(clawGeometry, claw);
      tip.position.set(side * .077 + offset * .020, .046, -.233 + Math.abs(offset) * .005);
      tip.rotation.x = -1.86;
      object.add(tip);
    }

    const ear = joint(head, side * .122, .104, .010);
    ear.rotation.set(-.12, side * -.16, side * -.34);
    const shell = ball(ear, coat, [0, 0, 0], [.104, .138, .051]);
    shell.geometry = earGeometry;
    const inset = ball(ear, innerEar, [0, .024, -.031], [.064, .085, .018]);
    inset.geometry = earGeometry;
    inset.castShadow = false;
    ears.push(ear);

    const eye = joint(head, side * .086, .015, -.136);
    eye.rotation.y = side * -.30;
    ball(eye, iris, [0, 0, 0], [.053, .061, .032]);
    ball(eye, pupil, [side * -.003, .002, -.021], [.040, .051, .018]);
    ball(eye, glint, [-.014, .022, -.037], [.010, .012, .004]);
    ball(eye, glint, [.014, -.015, -.037], [.004, .005, .003]);
    const closed = joint(head, eye.position.x, eye.position.y, eye.position.z);
    closed.rotation.copy(eye.rotation);
    line(closed, eyelid, [[-.047, .002, -.023], [-.025, -.009, -.037], [0, -.013, -.042],
      [.025, -.009, -.037], [.047, .002, -.023]], .0038);
    closed.visible = false;
    eyes.push({ eye, closed });

    ball(head, softFur, [side * .032, -.053, -.146], [.045, .033, .027]);
    line(head, mouth, [[0, -.061, -.179], [side * .011, -.078, -.170], [side * .028, -.076, -.166]], .0025);
    const fan = [
      { start: -.054, middle: -.035, end: -.025, length: .229 },
      { start: -.066, middle: -.066, end: -.072, length: .248 },
      { start: -.077, middle: -.093, end: -.118, length: .211 },
    ];
    for (const { start, middle, end, length } of fan) {
      line(head, whiskers, [
        [side * .067, start, -.166],
        [side * length * .62, middle, -.173],
        [side * length, end + side * .004, -.156],
      ], .0016);
    }
  }
  ball(head, nose, [0, -.046, -.175], [.022, .013, .011]);
  const openMouth = ball(head, mouth, [0, -.078, -.174], [.027, .013, .011]);
  openMouth.visible = false;

  const tail = joint(object, -.128, .063, .144);
  const tailTip = [-.098, -.010, -.356];
  const tailMesh = line(tail, coat, [[0, 0, 0], [-.105, -.005, -.012], [-.166, -.010, -.096],
    [-.177, -.012, -.199], [-.151, -.013, -.292], tailTip], .032);
  tailMesh.castShadow = true;
  const tailCap = ball(tail, coat, tailTip, [.014, .0116, .014]);
  const tailPoints = tailMesh.geometry.getAttribute('position');
  const tailUv = tailMesh.geometry.getAttribute('uv');
  const { tubularSegments, radialSegments } = tailMesh.geometry.parameters;
  const center = new T.Vector3();
  const vertex = new T.Vector3();
  for (let ring = 0; ring <= tubularSegments; ring++) {
    const start = ring * (radialSegments + 1);
    center.fromBufferAttribute(tailPoints, start)
      .add(vertex.fromBufferAttribute(tailPoints, start + radialSegments / 2))
      .multiplyScalar(.5);
    const along = ring / tubularSegments;
    const bulge = .64 * Math.sin(Math.PI * along) ** 1.3;
    const taper = 1 + bulge - .5625 * T.MathUtils.smoothstep(along, .60, 1);
    for (let side = 0; side <= radialSegments; side++) {
      const index = start + side;
      vertex.fromBufferAttribute(tailPoints, index).sub(center).multiplyScalar(taper).add(center);
      tailPoints.setXYZ(index, vertex.x, center.y + (vertex.y - center.y) * .83, vertex.z);
    }
  }
  tailMesh.geometry.computeVertexNormals();
  const tailRest = tailPoints.array.slice();
  let previousLift = 0;

  function liftTailTip(lift) {
    if (lift === previousLift) return;
    previousLift = lift;
    for (let i = 0; i < tailPoints.count; i++) {
      const bend = T.MathUtils.smoothstep(tailUv.getX(i), .64, 1);
      tailPoints.setY(i, tailRest[i * 3 + 1] + bend * lift);
    }
    tailPoints.needsUpdate = true;
    tailMesh.geometry.computeVertexNormals();
    tailMesh.geometry.computeBoundingSphere();
    tailCap.position.y = tailTip[1] + lift;
  }

  let elapsed = 0;
  let remaining = 0;
  let attention = 0;
  const yawnDuration = 1.65;
  let nextYawn = 14;
  let yawnElapsed = yawnDuration;

  function pet() { remaining = .95; }

  function update(dt, motion) {
    if (!motion && remaining <= 0 && !attention && !openMouth.visible) return false;
    if (motion) {
      elapsed += dt;
      if (yawnElapsed < yawnDuration) {
        yawnElapsed = Math.min(yawnDuration, yawnElapsed + dt);
      } else {
        nextYawn -= dt;
        if (nextYawn <= 0 && remaining <= 0) {
          yawnElapsed = 0;
          nextYawn = 32 + Math.random() * 24;
        }
      }
    }
    const yawn = motion
      ? T.MathUtils.smoothstep(yawnElapsed, 0, .58) * (1 - T.MathUtils.smoothstep(yawnElapsed, .83, yawnDuration))
      : 0;
    openMouth.visible = yawn > .025;
    openMouth.scale.y = .032 * yawn;
    openMouth.position.y = -.078 - .012 * yawn;
    remaining = Math.max(0, remaining - dt);
    const target = remaining > 0 ? 1 : 0;
    attention = motion ? T.MathUtils.damp(attention, target, 6, dt) : target;
    if (attention < .002) attention = 0;
    const breath = motion ? Math.sin(elapsed * 2.4) : 0;
    body.scale.y = 1 + breath * .018;
    head.position.y = .468 + breath * .004 + attention * .016 + yawn * .017;
    head.rotation.x = -.15 * yawn;
    head.rotation.y = motion ? Math.sin(elapsed * .76) * .075 : 0;
    head.rotation.z = -.105 * attention;
    const blink = motion ? Math.max(0, 1 - Math.abs(elapsed % 5.6 - 4.3) / .16) : 0;
    const closure = Math.max(blink, attention, Math.min(1, yawn * 1.3));
    for (const { eye, closed } of eyes) {
      eye.scale.y = 1 - .91 * closure;
      eye.visible = closure < .78;
      closed.visible = closure >= .78;
    }
    ears[0].rotation.z = .34 + (motion ? Math.sin(elapsed * 2.1) * .055 * attention : 0);
    const tipLift = motion ? attention * (.056 + .013 * Math.sin(elapsed * 5)) : 0;
    liftTailTip(tipLift);
    return true;
  }

  return { object, pet, update };
}

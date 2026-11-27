import * as T from 'three';
import { SoftwareRenderer } from './software-renderer.js';
import { buildWorkshop, loadPackingMark } from './workshop-room.js';
import { exhibitNavigation, researchMonitorLayout } from './exhibit-navigation.js';
import { loadRoomModels } from './product-models.js';
import { createLayoutEditor } from './layout-editor.js';
import { moscowSeason } from './workshop-calendar.js';
import { loadEveningBackdrop } from './workshop-city.js';
import { createObjectHalos } from './object-halos.js';
import { createCameraSettings } from './camera-settings.js';
import { createCameraEffects } from './camera-effects.js';
import { createWorkshopLettering } from './workshop-lettering.js';
import { createLetteringEditor } from './lettering-editor.js';
let cat, printer,printing=!matchMedia('(prefers-reduced-motion: reduce)').matches,printSeconds=15,lastPrintFrame=0;
let pendant, pendantSeconds = 0;
let coffee, steamSeconds = .4;
let software=false, dirty=true;
function makeRenderer() {
  try { return new T.WebGLRenderer({antialias:true, powerPreference:'high-performance'}); }
  catch { software=true; return new SoftwareRenderer(); }
}
const $=s=>document.querySelector(s), reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowRoom = matchMedia('(max-width: 620px)');
const roomBackground = '#24242a';
let renderer,scene,camera,cityWindow,current=null;
const pickMeshes = [], zones = new Map();
const pointer = new T.Vector2(), raycaster = new T.Raycaster();
const cameraTarget = new T.Vector3();
const overviewTarget = new T.Vector3(.25, 2.77, -.46);
const overviewCamera = new T.PerspectiveCamera(38, 1, .1, 80);
overviewCamera.position.set(-5.72, 6.42, 10.48);
overviewCamera.lookAt(overviewTarget);
overviewCamera.updateMatrixWorld();
const brand = $('.brand');
const workshopPage = $('#workshop');
// Author tools stay out of the visitors' way. Open the site with ?edit to arrange the room.
const authorMode = new URLSearchParams(location.search).has('edit');
workshopPage.classList.toggle('author-mode', authorMode);
const exhibitSurfaces = {
  generator: { host: $('#shelf-generator-display'), name: 'shelf-generator-sheet', fitX: .88, fitY: .83 },
  about: { host: $('#author-board-display'), name: 'author-cork', fitX: .82, fitY: .81 },
  engineering: { host: $('#research-screen'), name: 'research-display', fitX: .88, fitY: .80 },
  contacts: { host: $('#contact-card-display'), name: 'contact-sheet', fitX: .86, fitY: .72 },
};
const roomUp = new T.Vector3(0, 1, 0);

function focusedSurface() {
  return researchMonitorLayout.matches ? exhibitSurfaces[current] : undefined;
}
const zoneView = $('#zone-view'), zoneBack = $('#zone-back');
const roomSwitch = $('#room-switch');
const halos = createObjectHalos($('#object-halos'));
const letteringLayer = $('#object-lettering');
const lettering = createWorkshopLettering(letteringLayer, activateRoomObject);
const letteringEditor = createLetteringEditor(workshopPage, letteringLayer, lettering.attachmentFor, () => {
  cameraSettings?.close();
  setHelpOpen(false);
  highlightAction();
});
const printerToggle = $('#printer-toggle');
let roomZone = null, cameraMove = null, layoutEditor;
let overlayDirty = true;
let overviewObjects, poster;
let paintedSeason;
let cameraSettings, cameraEffects, courtyardMaterial;
function syncExhibit() {
  const id = exhibitNavigation.getSnapshot()?.id ?? null;
  if (id === current) return;
  const previous = focusedSurface();
  current = id;
  const surface = focusedSurface();
  if (camera && (previous?.mesh || surface?.mesh)) {
    if (previous?.mesh) restoreSurface(previous);
    if (surface?.deferPreview) {
      surface.deferPreview = false;
      showSurface(surface, surface.preview);
    }
    workshopPage.classList.toggle('surface-focused', Boolean(surface));
    surface?.host.toggleAttribute('data-approaching', !reduce && !software);
    const pose = surface ? surfacePose(surface, innerWidth, innerHeight) : roomPose(innerWidth, innerHeight);
    const card = exhibitSurfaces.contacts;
    const approachingCard = surface === card;
    const cardCenter = approachingCard ? pose.target : previous === card ? card.mesh.localToWorld(new T.Vector3()) : null;
    moveCamera(pose, cardCenter, approachingCard);
  }
  setHelpOpen(false);
  highlightAction();
  overlayDirty = dirty = true;
  renderer?.invalidate?.();
}
exhibitNavigation.subscribe(syncExhibit);
const focusPoint = new T.Vector3();

function attach(object, id) {
  object.traverse(child => {
    if (child.isMesh) child.userData.action = id;
  });
}

function createRoom(backdrop, mark) {
  scene = new T.Scene();
  scene.background = new T.Color(roomBackground);
  scene.fog = new T.Fog(roomBackground, 22, 45);
  camera = new T.PerspectiveCamera(38, innerWidth / innerHeight, .1, 80);
  renderer = makeRenderer();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  // Camera moves reuse the map. Printing and furniture edits invalidate it.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  $('#scene').append(renderer.domElement);

  const workshop = buildWorkshop(scene, backdrop, mark);
  for (const [id, surface] of Object.entries(exhibitSurfaces)) {
    surface.mesh = workshop.exhibits[id].getObjectByName(surface.name);
    surface.idleMap = surface.mesh.material.map;
    surface.pins = surface.mesh.getObjectByName('author-pin-hardware');
  }
  exhibitNavigation.setSceneExhibits(workshop.exhibits);
  ({ printer, pendant, cat, coffee, window: cityWindow, overviewObjects, poster } = workshop);
  courtyardMaterial = scene.getObjectByName('courtyard').material;
  if (!software) cameraEffects = createCameraEffects(renderer, scene);
  const ambient = new T.HemisphereLight('#ddd9e4', '#9e8474', .68);
  const windowLight = new T.DirectionalLight('#a9c7fc', .37);
  windowLight.position.copy(cityWindow.lightPosition);
  windowLight.target.position.set(.7, 2.47, -.85);
  scene.add(ambient, windowLight, windowLight.target);
  for (const zone of workshop.zones) {
    const button = $(`[data-zone="${zone.id}"]`);
    zones.set(zone.id, { ...zone, button });
    attach(zone.object, zone.id);
    halos.add(zone.id, zone.object, { frame: zone.frame });
    button.onclick = () => setRoomZone(zone.id);
  }
  for (const { id, object, curved } of workshop.targets) {
    attach(object, id);
    halos.add(id, object, { curved });
  }
  for (const inscription of workshop.lettering) lettering.add(inscription);
  attach(cat.object, 'cat');
  scene.traverse(object => {
    if (object.isMesh && (!object.material.transparent || object.userData.pickOnly)) pickMeshes.push(object);
  });
  $('#zone-list').hidden = false;
  $('#lettering-start').hidden = !authorMode;
  printerToggle.onclick = togglePrinting;
  updatePrintState();
  printerToggle.hidden = false;
  if (software) renderer.setDynamicRoots(printer.root, pendant.object, cityWindow.particles, cat.object, coffee.root);
  layoutEditor = createLayoutEditor({
    scene, camera, canvas: renderer.domElement, items: workshop.editables, ceiling: workshop.ceiling,
    getPose: currentRoomPose,
    onResize() {
      if (layoutEditor?.active) {
        letteringEditor.close();
        cameraSettings?.close();
      }
      setHelpOpen(false);
      resize();
    },
    onChange() {
      workshop.syncLayout();
      renderer.shadowMap.needsUpdate = true;
      renderer.invalidate?.();
      dirty = true;
    },
  });

  cameraSettings = createCameraSettings({
    software,
    onChange(settings, previous) {
      updateCameraAppearance(settings);
      if (settings.zoom !== previous.zoom || settings.smoothing !== previous.smoothing) resize();
    },
    onOpen() {
      letteringEditor.close();
      setHelpOpen(false);
      highlightAction();
    },
  });
  resize();
  document.fonts.ready.then(() => { overlayDirty = dirty = true; });
  renderer.domElement.addEventListener('pointermove', hover);
  renderer.domElement.addEventListener('pointerleave', () => highlightAction());
  renderer.domElement.addEventListener('click', pick);
  startSeasonalCourtyard();
  animate();
}

function resize() {
  if (!renderer) return;
  updateRoomNavigation();
  const { clientWidth: width, clientHeight: height } = $('#scene');
  finishCameraMove();
  const focused = focusedSurface();
  workshopPage.classList.toggle('surface-focused', Boolean(focused));
  const pose = focused ? surfacePose(focused, width, height)
    : layoutEditor?.active ? layoutEditor.pose(width, height) : roomPose(width, height);
  applyRoomPose(pose, width, height);
  for (const surface of Object.values(exhibitSurfaces)) {
    if (surface !== focused) restoreSurface(surface);
    if (researchMonitorLayout.matches) {
      const projection = surface === focused ? camera : new T.PerspectiveCamera(36, width / height, camera.near, camera.far);
      if (surface !== focused) {
        const framed = surfacePose(surface, width, height);
        projection.position.copy(framed.position);
        projection.up.copy(framed.up);
        projection.lookAt(framed.target);
      }
      positionSurface(surface, width, height, projection);
    }
    showSurface(surface, surface.active || availablePreview(surface));
  }
  if (cameraEffects) cameraEffects.resize(width, height, cameraSettings.settings.smoothing);
  else renderer.setSize(width, height);
  renderer.invalidate?.();
  dirty = true;

}

function fitOverview(width, height) {
  const bounds = new T.Box2();
  const point = new T.Vector3();
  const projected = new T.Vector2();
  scene.updateMatrixWorld();
  for (const object of overviewObjects) {
    object.traverseVisible(mesh => {
      if (!mesh.isMesh) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const { min, max } = mesh.geometry.boundingBox;
      for (const x of [min.x, max.x]) {
        for (const y of [min.y, max.y]) {
          for (const z of [min.z, max.z]) {
            point.set(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(overviewCamera.matrixWorldInverse);
            if (point.z >= -overviewCamera.near) continue;
            point.applyMatrix4(overviewCamera.projectionMatrix);
            bounds.expandByPoint(projected.set(point.x, -point.y));
          }
        }
      }
    });
  }

  const margin = width <= 620 ? 14 : 26;
  const top = Math.max($('header').offsetTop + $('.top-actions').offsetHeight + 14, brand.offsetHeight + margin + 12);
  const bottom = $('footer').offsetTop - 14;
  const size = bounds.getSize(new T.Vector2());
  const center = bounds.getCenter(new T.Vector2());
  const scale = bounds.isEmpty() ? height / 2
    : Math.min(Math.max(1, width - 2 * margin) / size.x, Math.max(1, bottom - top) / size.y);
  // Fit the projected objects without moving the viewpoint. Positive offsets move the image left and up.
  return {
    fov: overviewCamera.fov,
    position: overviewCamera.position,
    target: overviewTarget,
    zoom: 2 * scale / height,
    offsetX: center.x * scale,
    offsetY: center.y * scale + (height - top - bottom) / 2,
  };
}

function activeRoomZone() {
  return roomZone ?? (narrowRoom.matches ? 'desk' : null);
}

function roomPose(width, height) {
  const zone = zones.get(activeRoomZone());
  const narrowShelf = narrowRoom.matches && zone?.id === 'shelf';
  const lowerEdge = narrowShelf ? roomSwitch.getBoundingClientRect().top : $('footer').offsetTop;
  const pose = zone ? fitZone(zone.object, zone.frame, width, height, lowerEdge) : fitOverview(width, height);
  // Include the models standing above the top shelf with the default camera zoom.
  if (zone?.id === 'shelf') pose.zoom = narrowShelf ? .8 : .74;
  if (narrowRoom.matches && zone?.id === 'desk') {
    pose.zoom = .85;
    pose.offsetX = -width * .035;
  }
  pose.zoom = (pose.zoom ?? 1) * (cameraSettings?.settings.zoom ?? 100) / 100;
  return pose;
}

function fitZone(object, { center, size, direction, narrowDirection = direction, fill, focus }, width, height, lowerEdge) {
  const aspect = width / height;
  const tangent = fill
    ? T.MathUtils.clamp(.37 / aspect, Math.tan(T.MathUtils.degToRad(20)), 1.2)
    : Math.tan(T.MathUtils.degToRad(aspect < .9 ? 27 : 20));
  const fov = T.MathUtils.radToDeg(2 * Math.atan(tangent));
  const top = fill ? $('header').getBoundingClientRect().bottom + 8 : height * .125;
  const bottom = fill ? lowerEdge - 8 : height * .875;
  const usableWidth = fill ? Math.max(1, width - 24) : width * .88;
  const vertical = tangent * Math.max(1, bottom - top) / height;
  const horizontal = tangent * usableWidth / height;
  const target = object.localToWorld(new T.Vector3(...center));
  const outward = new T.Vector3(...(narrowRoom.matches ? narrowDirection : direction)).normalize();
  if (fill) outward.transformDirection(object.matrixWorld);
  const right = new T.Vector3().crossVectors(camera.up, outward).normalize();
  const up = new T.Vector3().crossVectors(outward, right);
  const corners = [];
  let distance = 0;
  // Fit the eight corners of the zone in the usable part of the viewport.
  for (const x of [-.5, .5]) {
    for (const y of [-.5, .5]) {
      for (const z of [-.5, .5]) {
        const point = new T.Vector3(center[0] + size[0] * x, center[1] + size[1] * y, center[2] + size[2] * z);
        object.localToWorld(point).sub(target);
        corners.push(point);
        const fit = Math.max(Math.abs(point.dot(right)) / horizontal, Math.abs(point.dot(up)) / vertical);
        distance = Math.max(distance, point.dot(outward) + fit);
      }
    }
  }
  const availableCenter = (top + bottom) / 2;
  let offsetY = height / 2 - availableCenter;
  if (focus) {
    // Fill the width with the tabletop, then use the space above it for the equipment.
    const screenY = point => height / 2 * (1 - point.dot(up) / (tangent * (distance - point.dot(outward))));
    const projected = corners.map(screenY);
    const focusPoint = object.localToWorld(new T.Vector3(...focus)).sub(target);
    offsetY = T.MathUtils.clamp(
      screenY(focusPoint) - availableCenter, Math.max(...projected) - bottom, Math.min(...projected) - top,
    );
  }
  // Adjust the framing without tilting the camera away from the shelf face.
  return {
    fov, target, position: target.clone().addScaledVector(outward, distance), offsetY,
  };
}

function currentRoomPose() {
  return {
    position: camera.position.clone(), target: cameraTarget.clone(), up: camera.up.clone(), fov: camera.fov, zoom: camera.zoom,
    offsetX: camera.view?.enabled ? camera.view.offsetX : 0,
    offsetY: camera.view?.enabled ? camera.view.offsetY : 0,
  };
}

function applyRoomPose({ position, target, up = roomUp, orientation, fov, zoom = 1, offsetX = 0, offsetY = 0 }, width = innerWidth, height = innerHeight) {
  camera.aspect = width / height;
  camera.position.copy(position);
  cameraTarget.copy(target);
  camera.up.copy(up);
  if (orientation) camera.quaternion.copy(orientation);
  else camera.lookAt(cameraTarget);
  camera.fov = fov;
  camera.zoom = zoom;
  if (offsetX || offsetY) camera.setViewOffset(width, height, offsetX, offsetY, width, height);
  else camera.clearViewOffset();
}

function surfacePose({ mesh, fitX, fitY }, width, height) {
  const bounds = mesh.geometry.boundingBox;
  const target = mesh.localToWorld(new T.Vector3(0, 0, bounds.max.z));
  const outward = new T.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  const up = new T.Vector3(0, 1, 0).transformDirection(mesh.matrixWorld);
  const fov = 36;
  const tangent = Math.tan(T.MathUtils.degToRad(fov / 2));
  const scale = mesh.getWorldScale(new T.Vector3());
  const distance = Math.max(bounds.max.x * scale.x / (width / height * fitX), bounds.max.y * scale.y / fitY) / tangent;
  return { fov, up, target, position: target.clone().addScaledVector(outward, distance) };
}

function positionSurface({ mesh, host }, width, height, projection = camera) {
  const { min, max } = mesh.geometry.boundingBox;
  projection.updateMatrixWorld();
  const a = mesh.localToWorld(new T.Vector3(min.x, max.y, max.z)).project(projection);
  const b = mesh.localToWorld(new T.Vector3(max.x, min.y, max.z)).project(projection);
  host.style.setProperty('--monitor-x', `${(a.x + 1) * width / 2}px`);
  host.style.setProperty('--monitor-y', `${(1 - a.y) * height / 2}px`);
  host.style.setProperty('--monitor-width', `${(b.x - a.x) * width / 2}px`);
  host.style.setProperty('--monitor-height', `${(a.y - b.y) * height / 2}px`);
  host.removeAttribute('data-approaching');
}

function updateDisplayTexture(texture, canvas) {
  if (!texture) {
    texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
  } else {
    texture.image = canvas;
    texture.needsUpdate = true;
  }
  return texture;
}

function availablePreview(surface) {
  return researchMonitorLayout.matches && !surface.deferPreview ? surface.preview : null;
}

function showSurface(surface, texture) {
  const material = surface.mesh.material;
  const map = texture || surface.idleMap;
  if (material.map !== map) {
    material.map = map;
    material.toneMapped = !texture;
    material.needsUpdate = true;
  }
  if (surface.pins) {
    const positions = !texture ? null : texture === surface.active ? surface.activePins : surface.previewPins;
    surface.pins.visible = Boolean(positions?.length);
    if (positions?.length) {
      const { min, max } = surface.mesh.geometry.boundingBox;
      for (const [index, pin] of surface.pins.children.entries()) {
        const point = positions[index];
        pin.visible = Boolean(point);
        if (point) {
          pin.position.set(T.MathUtils.lerp(min.x, max.x, point.x), T.MathUtils.lerp(max.y, min.y, point.y), 0);
        }
      }
    }
  }
  renderer.invalidate?.();
  dirty = true;
}

export function setSurfacePreview(id, canvas, pinPositions) {
  const surface = exhibitSurfaces[id];
  surface.preview = updateDisplayTexture(surface.preview, canvas);
  surface.previewPins = pinPositions;
  if (surface.mesh && availablePreview(surface) && !surface.active) {
    showSurface(surface, surface.preview);
  }
}

export function setSurfaceImage(id, canvas, pinPositions) {
  const surface = exhibitSurfaces[id];
  if (!surface.mesh || surface !== focusedSurface()) return;
  surface.active = updateDisplayTexture(surface.active, canvas);
  surface.activePins = pinPositions;
  showSurface(surface, surface.active);
  surface.host.setAttribute('data-textured', '');
}

function restoreSurface(surface) {
  if (!surface.active) return;
  showSurface(surface, availablePreview(surface));
  surface.active.dispose();
  surface.active = null;
  surface.host.removeAttribute('data-textured');
}

export function surfaceControlAt(screen, clientX, clientY) {
  const surface = focusedSurface();
  if (!surface?.active) return null;
  pointer.set(clientX / innerWidth * 2 - 1, 1 - clientY / innerHeight * 2);
  raycaster.setFromCamera(pointer, camera);
  const uv = raycaster.intersectObject(surface.mesh, false)[0]?.uv;
  if (!uv) return null;
  const bounds = screen.getBoundingClientRect();
  const target = document.elementFromPoint(bounds.x + uv.x * bounds.width, bounds.y + (1 - uv.y) * bounds.height);
  const control = target?.closest('button, a');
  return screen.contains(control) ? control : null;
}

function updateRoomNavigation() {
  const id = activeRoomZone();
  const showPendant = id !== 'shelf' || layoutEditor?.active === true;
  if (pendant.object.visible !== showPendant) {
    pendant.object.visible = showPendant;
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
  }
  const zone = zones.get(id);
  const canSwitch = narrowRoom.matches && (id === 'desk' || id === 'shelf');
  const switchHadFocus = document.activeElement === roomSwitch;
  workshopPage.classList.toggle('zone-focused', Boolean(zone));
  zoneView.hidden = !zone;
  zoneView.classList.toggle('compact', canSwitch);
  zoneBack.hidden = canSwitch;
  $('#zone-back-label').textContent = narrowRoom.matches ? 'К столу' : 'К комнате';

  roomSwitch.hidden = !canSwitch || Boolean(layoutEditor?.active);
  if (canSwitch) {
    const facingDesk = id === 'shelf';
    roomSwitch.dataset.target = facingDesk ? 'desk' : 'shelf';
    $('#room-switch-arrow').textContent = facingDesk ? '←' : '→';
    $('#room-switch-label').textContent = facingDesk ? 'К столу' : 'К стеллажу';
  }
  if (switchHadFocus && !canSwitch) (zone ? zoneBack : $('#help')).focus({ preventScroll: true });
}

function setRoomZone(id) {
  if (!camera) return;
  const previous = activeRoomZone();
  roomZone = narrowRoom.matches && id === 'desk' ? null : id;
  const next = activeRoomZone();
  if (next === previous && $('#help-panel').hidden) return;
  updateRoomNavigation();
  highlightAction();
  setHelpOpen(false);
  const focus = next ? (roomSwitch.hidden ? zoneBack : roomSwitch) : $('#help');
  focus.focus({ preventScroll: true });
  if (next === previous) return;

  moveCamera(roomPose(innerWidth, innerHeight));
}

function moveCamera(pose, cardCenter = null, approachingCard = false) {
  if (reduce || software) {
    finishCameraMove();
    applyRoomPose(pose);
    const surface = focusedSurface();
    if (surface) positionSurface(surface, innerWidth, innerHeight);
    overlayDirty = true;
    renderer.invalidate?.();
    dirty = true;
  } else {
    const from = currentRoomPose();
    cameraMove = {
      start: performance.now(), end: pose, from, duration: cardCenter ? 1050 : 580,
    };
    if (cardCenter) {
      const startRotation = camera.quaternion.clone();
      const endRotation = new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().lookAt(pose.position, pose.target, pose.up ?? roomUp),
      );
      // Camera-local offsets keep the card in view as the camera tilts over the desk.
      cameraMove.card = {
        center: cardCenter,
        approaching: approachingCard,
        startRotation,
        endRotation,
        from: from.position.clone().sub(cardCenter).applyQuaternion(startRotation.clone().invert()),
        to: pose.position.clone().sub(cardCenter).applyQuaternion(endRotation.clone().invert()),
      };
    }
    workshopPage.classList.add('camera-moving');
  }
}

function finishCameraMove() {
  cameraMove = null;
  overlayDirty = true;
  workshopPage.classList.remove('camera-moving');
}

function updateCameraMove(time) {
  if (!cameraMove) return;
  const { start, from, end, duration, card } = cameraMove;
  const progress = T.MathUtils.clamp((time - start) / duration, 0, 1);
  const fraction = T.MathUtils.smoothstep(progress, 0, 1);
  const lerp = T.MathUtils.lerp;
  let position = from.position.clone().lerp(end.position, fraction);
  let orientation;
  if (card) {
    orientation = card.startRotation.clone().slerp(card.endRotation, fraction);
    // Move closer before most of the tilt so the camera stays below the ceiling.
    const travel = card.approaching ? 1 - (1 - fraction) ** 2 : fraction ** 2;
    position = card.from.clone().lerp(card.to, travel).applyQuaternion(orientation).add(card.center);
  }
  applyRoomPose({
    position,
    orientation,
    target: from.target.clone().lerp(end.target, fraction),
    up: from.up.clone().lerp(end.up ?? roomUp, fraction).normalize(),
    fov: lerp(from.fov, end.fov, fraction),
    zoom: lerp(from.zoom, end.zoom ?? 1, fraction),
    offsetX: lerp(from.offsetX, end.offsetX ?? 0, fraction),
    offsetY: lerp(from.offsetY, end.offsetY ?? 0, fraction),
  });
  if (progress === 1) {
    finishCameraMove();
    const surface = focusedSurface();
    if (surface) positionSurface(surface, innerWidth, innerHeight);
  }
}

function cameraFocus(settings) {
  if (!settings.blur) return 1;
  if (focusedSurface()) return camera.position.distanceTo(cameraTarget);
  const { object, frame } = zones.get(activeRoomZone() ?? 'desk');
  camera.updateMatrixWorld();
  object.localToWorld(focusPoint.fromArray(frame.focus ?? frame.center));
  const distance = -focusPoint.applyMatrix4(camera.matrixWorldInverse).z;
  return Math.max(camera.near, distance * settings.focus / 100);
}

function updateCameraAppearance(settings) {
  const factor = 2 ** settings.exposure;
  renderer.toneMappingExposure = 1.16 * factor;
  workshopPage.style.setProperty('--camera-grain', settings.grain * .0015);
  if (software) {
    const tone = settings.exposure || settings.shadows
      ? `brightness(${factor ** .52}) contrast(${1 - settings.shadows * .0012})` : '';
    renderer.domElement.style.filter = tone;
  } else {
    courtyardMaterial.color.setScalar(factor);
  }
  dirty = true;
}

function updateSceneOverlay() {
  if (!overlayDirty || cameraMove) return;
  camera.updateMatrixWorld();
  const id = activeRoomZone();
  if (!id) positionBrand();
  halos.update(camera, innerWidth, innerHeight, id);
  lettering.update(camera, innerWidth, innerHeight, id);
  letteringEditor.update(id, narrowRoom.matches);
  overlayDirty = false;
}

function positionBrand() {
  const [left, right] = poster.topEdge.map(point => poster.object.localToWorld(point.clone()).project(camera));
  const posterTop = (.5 - Math.max(left.y, right.y) * .5) * innerHeight;
  const halfWidth = brand.offsetWidth / 2;
  const x = T.MathUtils.clamp(((left.x + right.x) * .25 + .5) * innerWidth, halfWidth + 12, innerWidth - halfWidth - 12);
  const y = posterTop - 22;
  brand.style.setProperty('--brand-x', `${x}px`);
  brand.style.setProperty('--brand-y', `${Math.max(brand.offsetHeight + 9, y)}px`);
}

function intersect(event) {
  if (cameraMove) return;
  pointer.set(event.clientX / innerWidth * 2 - 1, -event.clientY / innerHeight * 2 + 1);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickMeshes, false).find(({ object }) => {
    if (!object.visible && !object.userData.pickOnly) return false;
    for (let parent = object.parent; parent; parent = parent.parent) {
      if (!parent.visible) return false;
    }
    return true;
  });
  const action = hit?.object.userData.action;
  return action && action !== activeRoomZone() ? hit.object : undefined;
}

function highlightAction(object) {
  if (renderer && !layoutEditor?.active) renderer.domElement.style.cursor = object ? 'pointer' : 'default';
  halos.highlight(object);
}

// The room index points at an exhibit before the visitor opens it.
export function hintRoomObject(id) {
  if (!renderer || layoutEditor?.active || letteringEditor.active) return;
  halos.highlightId(current ? null : id);
}

function hover(event) {
  if (current || layoutEditor?.active || letteringEditor.active) return;
  const hit = intersect(event);
  if (event.pointerType === 'touch') {
    if (hit?.userData.action === 'cat' && event.buttons) cat.pet();
  } else if (hit?.userData.action === 'cat') {
    if (event.movementX || event.movementY) cat.pet();
    renderer.domElement.style.cursor = 'grab';
    halos.highlight();
  } else {
    highlightAction(hit);
  }
}

function activateRoomObject(id) {
  if (letteringEditor.active) return;
  if (id === 'cat') cat.pet();
  else if (zones.has(id)) setRoomZone(id);
  else if (id) exhibitNavigation.open(id);
}

function pick(event) {
  if (current || layoutEditor?.active || letteringEditor.active) return;
  activateRoomObject(intersect(event)?.userData.action);
}

zoneBack.onclick = () => setRoomZone(null);
roomSwitch.onclick = () => setRoomZone(activeRoomZone() === 'shelf' ? null : 'shelf');
addEventListener('keydown', event => {
  if (event.defaultPrevented || event.key !== 'Escape' || current) return;
  if (letteringEditor.active) letteringEditor.close(true);
  else if (!$('#help-panel').hidden) {
    setHelpOpen(false);
    $('#help').focus();
  } else if (roomZone && !layoutEditor?.active) setRoomZone(null);
});
function updatePrintState() {
  printerToggle.setAttribute('aria-pressed', String(printing));
  printerToggle.querySelector('.printer-toggle-state').textContent = printing ? 'Вкл.' : 'Выкл.';
}
function togglePrinting() {
  printing = !printing;
  updatePrintState();
  printer?.update(printSeconds, !printing);
  dirty = true;
}
let lastFrame = 0;
let loadingSeconds = 0;
const startupSurfaceWait = 4.5;
let sceneLoading = $('#scene-loading');

function canRevealScene() {
  if (!researchMonitorLayout.matches || loadingSeconds >= startupSurfaceWait) return true;
  const allPreviewsReady = Object.values(exhibitSurfaces).every(surface =>
    surface.preview || surface.host.querySelector('[data-capture-error]:not([data-scene])'),
  );
  const focused = focusedSurface();
  return allPreviewsReady && (!focused || focused.active || focused.host.querySelector('[data-scene][data-capture-error]'));
}

function revealScene() {
  const loading = sceneLoading;
  if (researchMonitorLayout.matches) {
    for (const surface of Object.values(exhibitSurfaces)) {
      // A late preview must not replace the fallback in the already visible room.
      if (!surface.preview && surface !== focusedSurface()) surface.deferPreview = true;
    }
  }
  sceneLoading = null;
  loading.classList.add('is-ready');
  setTimeout(() => loading.remove(), 350);
}

function animate(time = 0) {
 requestAnimationFrame(animate);
 if (document.hidden || (current && !dirty && !cameraMove && !sceneLoading)) { lastPrintFrame = time; return; }
 const dt = Math.max(0, Math.min(.25, (time - lastPrintFrame) / 1000));
 lastPrintFrame = time;
 if (sceneLoading) loadingSeconds += dt;
 updateCameraMove(time);
 const reveal = sceneLoading && canRevealScene();
 const canPrint = printing && !current && !layoutEditor?.active;
 const zone = activeRoomZone();
 const canSway = !reduce && !current && !layoutEditor?.active && (!zone || zone === 'desk');
 if (canSway) steamSeconds += dt;
 if(canPrint)printSeconds+=dt;
 if (canSway) pendantSeconds += dt;
 const catMoved = !current && !layoutEditor?.active && cat.update(dt, !reduce);
 const sceneTick=!software||dirty||reveal||time-lastFrame>140;
 if (sceneTick) {
   if (canPrint) printer.update(printSeconds);
   if (canSway) pendant.update(pendantSeconds);
   if (canPrint || canSway || catMoved) renderer.shadowMap.needsUpdate = true;
   const movingOutside = !reduce && !current && !layoutEditor?.active && cityWindow.update(time, camera);
   if (!software || dirty || reveal || canPrint || canSway || catMoved || movingOutside) {
     coffee.update(steamSeconds, camera);
     if (cameraEffects && !layoutEditor?.active) {
       const settings = cameraSettings.settings;
       cameraEffects.render(camera, settings, cameraFocus(settings));
     } else renderer.render(scene, camera);
     if (layoutEditor?.active) layoutEditor.projectSelection();
     else updateSceneOverlay();
     if (reveal) revealScene();
     dirty = false;
   }
   lastFrame = time;
 }
}

function updateCourtyard() {
  const season = moscowSeason();
  if (paintedSeason === season) return;
  paintedSeason = season;
  cityWindow.paint(season);
  dirty = true;
  renderer.invalidate?.();
}

function startSeasonalCourtyard() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateCourtyard();
  });
  window.setInterval(updateCourtyard, 60000);
  updateCourtyard();
}
function setHelpOpen(open) {
  $('#help-panel').hidden = !open;
  $('#help').setAttribute('aria-expanded', String(open));
}
const viewMenu = $('.view-settings');
const viewToggle = $('.view-settings-toggle');
const setViewMenu = open => viewToggle.setAttribute('aria-expanded', String(open));
viewToggle.addEventListener('click', () => {
  const opening = viewToggle.getAttribute('aria-expanded') === 'false';
  setViewMenu(opening);
  if (opening) viewMenu.querySelector('#view-tools button:not([hidden])')?.focus();
});
document.addEventListener('click', event => {
  if (!viewMenu.contains(event.target) || event.target.closest('#view-tools button')) setViewMenu(false);
  if (!event.target.closest('#help, #help-panel') && !$('#help-panel').hidden) setHelpOpen(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || viewToggle.getAttribute('aria-expanded') !== 'true') return;
  event.preventDefault();
  setViewMenu(false);
  viewToggle.focus();
}, true);
$('#help').onclick = () => setHelpOpen($('#help-panel').hidden);
$('#help-backdrop').onclick = $('#help-close').onclick = () => {
  setHelpOpen(false);
  $('#help').focus();
};
syncExhibit();
addEventListener('resize',resize);
researchMonitorLayout.addEventListener('change', resize);
Promise.all([loadRoomModels(), loadEveningBackdrop(), loadPackingMark()])
  .then(([, backdrop, mark]) => createRoom(backdrop, mark))
  .catch(error => {
    console.error(error);
    sceneLoading?.remove();
    sceneLoading = null;
    $('#scene-error').hidden = false;
    for (const { host } of Object.values(exhibitSurfaces)) host.removeAttribute('data-approaching');
    exhibitNavigation.setSceneExhibits(null);
  });

import * as T from 'three';
import { SoftwareRenderer } from './software-renderer.js';
import { buildWorkshop } from './workshop-room.js?v=37';
import { createWorkshopDetails } from './workshop-details.js';
import { loadRoomModels } from './product-models.js';
import { createLayoutEditor } from './layout-editor.js?v=36';
import { moscowSeason } from './workshop-calendar.js';
import { loadEveningBackdrop } from './workshop-city.js';
import { createObjectHalos } from './object-halos.js?v=21';
import { createCameraSettings } from './camera-settings.js';
import { createCameraEffects } from './camera-effects.js';
import { createWorkshopLettering } from './workshop-lettering.js?v=34';
import { createLetteringEditor } from './lettering-editor.js?v=36';
let printer,printing=!matchMedia('(prefers-reduced-motion: reduce)').matches,printSeconds=15,lastPrintFrame=0;
let pendant, pendantSeconds = 0;
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
const zoneView = $('#zone-view'), zoneBack = $('#zone-back'), zoneTitle = $('#zone-title');
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
const details = createWorkshopDetails(id => {
  current=id;
  setHelpOpen(false);
  highlightAction();
  dirty=true;
});
const focusPoint = new T.Vector3();

function attach(object, id) {
  object.traverse(child => {
    if (child.isMesh) child.userData.action = id;
  });
}

function createRoom(backdrop) {
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

  const workshop = buildWorkshop(scene, backdrop);
  details.setExhibits(workshop.exhibits);
  ({ printer, pendant, window: cityWindow, overviewObjects, poster } = workshop);
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
  scene.traverse(object => {
    if (object.isMesh && (!object.material.transparent || object.userData.pickOnly)) pickMeshes.push(object);
  });
  $('#zone-list').hidden = false;
  $('#lettering-start').hidden = false;
  printerToggle.onclick = togglePrinting;
  updatePrintState();
  if (software) renderer.setDynamicRoots(printer.root, pendant.object, cityWindow.particles);
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
  window.addEventListener('yazhemoh:exhibit-closed', () => {
    current = null;
    highlightAction();
    overlayDirty = dirty = true;
    renderer?.invalidate?.();
    requestAnimationFrame(() => {
      if (renderer?.domElement?.matches(':hover')) {
        const rect = renderer.domElement.getBoundingClientRect();
        highlightAction(intersect({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
      }
    });
  });
  renderer.domElement.addEventListener('pointermove', hover);
  renderer.domElement.addEventListener('pointerleave', () => highlightAction());
  renderer.domElement.addEventListener('click', pick);
  $('#loading').style.opacity = 0;
  setTimeout(() => $('#loading')?.remove(), 600);
  startSeasonalCourtyard();
  animate();
}

function resize() {
  if (!renderer) return;
  updateRoomNavigation();
  const { clientWidth: width, clientHeight: height } = $('#scene');
  finishCameraMove();
  applyRoomPose(layoutEditor?.active ? layoutEditor.pose(width, height) : roomPose(width, height), width, height);
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
    position: camera.position.clone(), target: cameraTarget.clone(), fov: camera.fov, zoom: camera.zoom,
    offsetX: camera.view?.enabled ? camera.view.offsetX : 0,
    offsetY: camera.view?.enabled ? camera.view.offsetY : 0,
  };
}

function applyRoomPose({ position, target, fov, zoom = 1, offsetX = 0, offsetY = 0 }, width = innerWidth, height = innerHeight) {
  camera.aspect = width / height;
  camera.position.copy(position);
  cameraTarget.copy(target);
  camera.lookAt(cameraTarget);
  camera.fov = fov;
  camera.zoom = zoom;
  if (offsetX || offsetY) camera.setViewOffset(width, height, offsetX, offsetY, width, height);
  else camera.clearViewOffset();
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
  $('#zone-back-label').textContent = narrowRoom.matches ? 'К столу' : 'Общий вид';
  const name = zone?.button.textContent ?? '';
  if (zoneTitle.textContent !== name) zoneTitle.textContent = name;

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

  const pose = roomPose(innerWidth, innerHeight);
  if (reduce || software) {
    applyRoomPose(pose);
    overlayDirty = true;
    renderer.invalidate?.();
    dirty = true;
  } else {
    cameraMove = {
      start: performance.now(), end: pose, from: currentRoomPose(),
    };
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
  const { start, from, end } = cameraMove;
  const progress = T.MathUtils.clamp((time - start) / 580, 0, 1);
  const fraction = T.MathUtils.smoothstep(progress, 0, 1);
  const lerp = T.MathUtils.lerp;
  applyRoomPose({
    position: from.position.clone().lerp(end.position, fraction),
    target: from.target.clone().lerp(end.target, fraction),
    fov: lerp(from.fov, end.fov, fraction),
    zoom: lerp(from.zoom, end.zoom ?? 1, fraction),
    offsetX: lerp(from.offsetX, end.offsetX ?? 0, fraction),
    offsetY: lerp(from.offsetY, end.offsetY ?? 0, fraction),
  });
  if (progress === 1) finishCameraMove();
}

function cameraFocus(settings) {
  if (!settings.blur) return 1;
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

function hover(event) {
  if (event.pointerType !== 'touch' && !current && !layoutEditor?.active && !letteringEditor.active) {
    highlightAction(intersect(event));
  }
}

function activateRoomObject(id) {
  if (letteringEditor.active) return;
  if (zones.has(id)) setRoomZone(id);
  else if (id) details.open(id);
}

function pick(event) {
  if (!layoutEditor?.active) activateRoomObject(intersect(event)?.userData.action);
}

zoneBack.onclick = () => setRoomZone(null);
roomSwitch.onclick = () => setRoomZone(activeRoomZone() === 'shelf' ? null : 'shelf');
addEventListener('keydown', event => {
  if (event.key !== 'Escape' || $('#detail').open) return;
  if (letteringEditor.active) letteringEditor.close(true);
  else if (roomZone && !layoutEditor?.active) setRoomZone(null);
});
function updatePrintState() {
  printerToggle.setAttribute('aria-pressed', String(printing));

}
function togglePrinting() {
  printing = !printing;
  updatePrintState();
  printer?.update(printSeconds, !printing);
  dirty = true;
}
let lastFrame=0;
function animate(time=0){requestAnimationFrame(animate);if(document.hidden || current){lastPrintFrame=time;return;}const dt=Math.max(0,Math.min(.25,(time-lastPrintFrame)/1000));lastPrintFrame=time;
 updateCameraMove(time);
 const canPrint = printing && !current && !layoutEditor?.active;
 const zone = activeRoomZone();
 const canSway = !reduce && !current && !layoutEditor?.active && (!zone || zone === 'desk');
 if(canPrint)printSeconds+=dt;
 if (canSway) pendantSeconds += dt;
 const sceneTick=!software||dirty||time-lastFrame>140;
 if (sceneTick) {
   if (canPrint) printer.update(printSeconds);
   if (canSway) pendant.update(pendantSeconds);
   if (canPrint || canSway) renderer.shadowMap.needsUpdate = true;
   const movingOutside = !reduce && !current && !layoutEditor?.active && cityWindow.update(time, camera);
   if (!software || dirty || canPrint || canSway || movingOutside) {
     if (cameraEffects && !layoutEditor?.active) {
       const settings = cameraSettings.settings;
       cameraEffects.render(camera, settings, cameraFocus(settings));
     } else renderer.render(scene, camera);
     if (layoutEditor?.active) layoutEditor.projectSelection();
     else updateSceneOverlay();
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
$('#help').onclick = () => setHelpOpen($('#help-panel').hidden);
$('#help-close').onclick = () => { setHelpOpen(false); $('#help').focus(); };
addEventListener('resize',resize);
details.route();
try {
  const [, backdrop] = await Promise.all([loadRoomModels(), loadEveningBackdrop()]);
  createRoom(backdrop);
} catch (error) {
  console.error(error);
  $('#loading')?.remove();
  $('#scene-error').hidden = false;
  details.setExhibits(null);
}


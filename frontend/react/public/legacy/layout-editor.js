import * as T from 'three';
import { workshopLayout } from './workshop-layout.js?v=36';

const storageKey = 'yazhemoh-layout-v1';
const sections = { room: 'Комната', desk: 'Рабочее место', shelf: 'На стеллаже' };
const directions = { angle: [-.45, .46, 1], top: [0, 1, .001], front: [0, .12, 1] };
const axes = ['x', 'y', 'z'];
const extent = 16;
const minimumScale = .25;
const maximumScale = 2;
const clamp = T.MathUtils.clamp;

function snapshot({ object, axis, baseScale }) {
  return [...object.position.toArray(), object.rotation[axis], object.scale.x / baseScale.x];
}

function apply(item, values) {
  const { object, axis, baseScale, maximumHeight = 7.7 } = item;
  object.position.set(clamp(values[0], -extent, extent), clamp(values[1], 0, maximumHeight), clamp(values[2], -extent, extent));
  object.rotation[axis] = T.MathUtils.euclideanModulo(values[3] + Math.PI, Math.PI * 2) - Math.PI;
  if (values.length === 5) object.scale.copy(baseScale).multiplyScalar(clamp(values[4], minimumScale, maximumScale));
}

function applyLayout(byId, layout) {
  for (const [id, values] of Object.entries(layout)) {
    const item = byId.get(id);
    if (item && Array.isArray(values) && [4, 5].includes(values.length) && values.every(Number.isFinite)) apply(item, values);
  }
}

function differs(a, b) {
  return a.some((value, index) => Math.abs(value - b[index]) > 1e-5);
}

function corners(bounds, visit) {
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) visit(new T.Vector3(x, y, z));
    }
  }
}

export function createLayoutEditor({ scene, camera, canvas, items, ceiling, getPose, onResize, onChange }) {
  items = items.map(item => ({ ...item, baseScale: item.object.scale.clone() }));
  const workshop = document.querySelector('#workshop');
  const panel = document.querySelector('#layout-panel');
  const selection = document.querySelector('#layout-selection');
  const toggle = document.querySelector('#layout-toggle');
  const choices = panel.querySelector('#layout-item');
  const view = panel.querySelector('#layout-view');
  const focus = panel.querySelector('#layout-focus');
  const origin = panel.querySelector('#layout-origin');
  const undoButton = panel.querySelector('#layout-undo');
  const redoButton = panel.querySelector('#layout-redo');
  const status = panel.querySelector('#layout-status');
  const coordinates = [...panel.querySelectorAll('[data-coordinate]')];
  const angle = panel.querySelector('#layout-angle');
  const scale = panel.querySelector('#layout-scale');
  const scaleValue = panel.querySelector('#layout-scale-value');
  scale.min = minimumScale * 100;
  scale.max = maximumScale * 100;
  const byObject = new Map(items.map(item => [item.object, item]));
  const byId = new Map(items.map(item => [item.id, item]));
  applyLayout(byId, workshopLayout);
  const defaults = new Map(items.map(item => [item, snapshot(item)]));
  const history = [];
  const future = [];
  const meshes = [];
  const raycaster = new T.Raycaster();
  let active = false, selected = byId.get('desk'), focused = false, framing, drag;
  let entryPose, entryHeight, scaling;

  scene.traverse(object => {
    if (object.isMesh && !object.material.transparent) meshes.push(object);
  });
  for (const [section, label] of Object.entries(sections)) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const item of items.filter(entry => entry.section === section)) group.append(new Option(item.label, item.id));
    choices.append(group);
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      applyLayout(byId, saved);
      status.textContent = 'Изменения сохраняются в браузере';
    } catch {
      status.textContent = 'Не удалось прочитать сохранённую расстановку';
    }
  }

  function persist() {
    const edits = Object.fromEntries(items.map(item => [item, snapshot(item)])
      .filter(([item, values]) => differs(values, defaults.get(item)))
      .map(([item, values]) => [item.id, values]));
    try {
      localStorage.setItem(storageKey, JSON.stringify(edits));
      status.textContent = 'Сохранено в браузере';
    } catch {
      status.textContent = 'Расстановка действует до закрытия страницы';
    }
  }

  function updateScale() {
    const percent = Math.round(100 * selected.object.scale.x / selected.baseScale.x);
    scale.value = percent;
    scaleValue.textContent = percent + '%';
    scale.setAttribute('aria-valuetext', scaleValue.textContent);
  }

  function updateFields() {
    const { object, axis } = selected;
    for (const field of coordinates) field.value = Number(object.position[field.dataset.coordinate].toFixed(2));
    coordinates.find(field => field.dataset.coordinate === 'y').max = selected.maximumHeight ?? 7.7;
    angle.value = Number(T.MathUtils.radToDeg(object.rotation[axis]).toFixed(1));
    updateScale();
    origin.textContent = byObject.get(object.parent)?.label ?? 'Комната';
    selection.querySelector('span').textContent = selected.label;
    undoButton.disabled = !history.length;
    redoButton.disabled = !future.length;
  }

  function focusObject() {
    framing = new T.Box3().setFromObject(selected.boundsObject ?? selected.object);
    framing.expandByScalar(.22);
    onResize();
  }

  function select(item) {
    if (item === selected) return;
    finishScale();
    selected = item;
    choices.value = item.id;
    updateFields();
    if (focused) focusObject();
    else onChange();
  }

  function finishEdit(item, before) {
    const after = snapshot(item);
    if (differs(before, after)) {
      history.push({ item, before, after });
      if (history.length > 80) history.shift();
      future.length = 0;
      persist();
    }
    updateFields();
    onChange();
  }

  function finishScale() {
    if (!scaling) return;
    const { item, before } = scaling;
    scaling = undefined;
    finishEdit(item, before);
  }

  function edit(updates) {
    finishScale();
    const before = snapshot(selected);
    const after = before.map((value, index) => updates[index] ?? value);
    apply(selected, after);
    finishEdit(selected, before);
  }

  function moveInHistory(source, destination, field) {
    finishScale();
    const entry = source.pop();
    if (!entry) return;
    destination.push(entry);
    apply(entry.item, entry[field]);
    select(entry.item);
    persist();
    updateFields();
    onChange();
  }

  function setActive(value) {
    if (drag) endDrag(true);
    finishScale();
    if (value) {
      entryPose = getPose();
      entryHeight = Math.max(1, canvas.clientHeight);
    }
    active = value;
    focused = false;
    framing = undefined;
    focus.textContent = 'К предмету';
    view.value = 'current';
    panel.hidden = !active;
    ceiling.visible = !active;
    selection.hidden = true;
    workshop.classList.toggle('layout-editing', active);
    toggle.setAttribute('aria-expanded', String(active));
    toggle.textContent = active ? 'Готово' : 'Расстановка';
    canvas.tabIndex = active ? 0 : -1;
    canvas.style.cursor = active ? 'grab' : 'default';
    if (active) canvas.setAttribute('aria-label', 'Мастерская. Стрелки перемещают предмет, Q и E поворачивают');
    else canvas.removeAttribute('aria-label');
    onResize();
    (active ? choices : toggle).focus({ preventScroll: true });
  }

  function pose(width, height) {
    const keepView = view.value === 'current';
    if (keepView && !framing) return { ...entryPose, zoom: entryPose.zoom * entryHeight / height };
    const bounds = framing ?? new T.Box3(new T.Vector3(-5.4, 0, -2.75), new T.Vector3(7.1, 6.3, 3.25));
    const target = bounds.getCenter(new T.Vector3());
    const outward = keepView
      ? entryPose.position.clone().sub(entryPose.target).normalize()
      : new T.Vector3(...directions[view.value]).normalize();
    const right = new T.Vector3().crossVectors(camera.up, outward).normalize();
    const up = new T.Vector3().crossVectors(outward, right);
    const fov = 44;
    const vertical = Math.tan(T.MathUtils.degToRad(fov / 2)) * .79;
    const horizontal = vertical * width / height * 1.13;
    let distance = 2.5;
    corners(bounds, point => {
      point.sub(target);
      distance = Math.max(distance, point.dot(outward) + Math.max(Math.abs(point.dot(right)) / horizontal, Math.abs(point.dot(up)) / vertical));
    });
    return { position: target.clone().addScaledVector(outward, distance), target, fov };
  }

  function projectSelection() {
    if (!active) return;
    const bounds = new T.Box3().setFromObject(selected.boundsObject ?? selected.object);
    const min = new T.Vector2(Infinity, Infinity), max = new T.Vector2(-Infinity, -Infinity);
    corners(bounds, point => {
      point.project(camera);
      const screen = new T.Vector2(point.x * .5 + .5, .5 - point.y * .5);
      min.min(screen);
      max.max(screen);
    });
    selection.hidden = min.x > 1 || min.y > 1 || max.x < 0 || max.y < 0;
    if (selection.hidden) return;
    const left = clamp(min.x, 0, 1), top = clamp(min.y, 0, 1);
    selection.style.left = `${left * 100}%`;
    selection.style.top = `${top * 100}%`;
    selection.style.width = `${(clamp(max.x, 0, 1) - left) * 100}%`;
    selection.style.height = `${(clamp(max.y, 0, 1) - top) * 100}%`;
  }

  function pointRay(event) {
    const viewport = canvas.getBoundingClientRect();
    const x = (event.clientX - viewport.left) / viewport.width * 2 - 1;
    const y = 1 - (event.clientY - viewport.top) / viewport.height * 2;
    raycaster.setFromCamera(new T.Vector2(x, y), camera);
  }

  function editableHit() {
    const hit = raycaster.intersectObjects(meshes, false).find(({ object }) => object.visible);
    if (!hit) return null;
    for (let node = hit.object; node; node = node.parent) {
      if (byObject.has(node)) return { item: byObject.get(node), point: hit.point };
    }
    return null;
  }

  canvas.addEventListener('pointerdown', event => {
    if (!active || drag || event.button !== 0) return;
    pointRay(event);
    const hit = editableHit();
    if (!hit) return;
    const { item, point } = hit;
    const { object, axis } = item;
    const normal = new T.Vector3(0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0).transformDirection(object.parent.matrixWorld);
    const plane = new T.Plane().setFromNormalAndCoplanarPoint(normal, point);
    const reframe = focused && item !== selected;
    finishScale();
    select(item);
    canvas.focus({ preventScroll: true });
    if (reframe || Math.abs(raycaster.ray.direction.dot(normal)) < .065) return;
    drag = { item, plane, point: object.parent.worldToLocal(point.clone()), before: snapshot(item), pointerId: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', event => {
    if (!active || !drag || event.pointerId !== drag.pointerId) return;
    pointRay(event);
    const hit = raycaster.ray.intersectPlane(drag.plane, new T.Vector3());
    if (!hit) return;
    const { item, before } = drag;
    const delta = item.object.parent.worldToLocal(hit).sub(drag.point);
    const values = before.slice();
    for (const key of axes.filter(key => key !== item.axis)) values[axes.indexOf(key)] += delta[key];
    apply(item, values);
    updateFields();
    onChange();
  });

  function endDrag(commit) {
    if (!drag) return;
    const { item, before, pointerId } = drag;
    drag = undefined;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    canvas.style.cursor = 'grab';
    if (!commit) apply(item, before);
    finishEdit(item, before);
  }

  canvas.addEventListener('pointerup', event => { if (event.pointerId === drag?.pointerId) endDrag(true); });
  canvas.addEventListener('pointercancel', event => { if (event.pointerId === drag?.pointerId) endDrag(false); });
  canvas.addEventListener('lostpointercapture', event => { if (event.pointerId === drag?.pointerId) endDrag(false); });
  canvas.addEventListener('keydown', event => {
    if (!active || drag) return;
    const step = event.shiftKey ? .25 : .05;
    const vertical = selected.axis === 'y' ? 2 : 1;
    const up = selected.axis === 'y' ? -step : step;
    const actions = { ArrowLeft: [0, -step], ArrowRight: [0, step], ArrowUp: [vertical, up], ArrowDown: [vertical, -up], KeyQ: [3, -Math.PI / 12], KeyE: [3, Math.PI / 12] };
    const action = actions[event.code];
    if (!action) return;
    event.preventDefault();
    const [index, delta] = action;
    edit({ [index]: snapshot(selected)[index] + delta });
  });

  toggle.addEventListener('click', () => setActive(!active));
  choices.addEventListener('change', () => select(byId.get(choices.value)));
  view.addEventListener('change', onResize);
  focus.addEventListener('click', () => {
    focused = !focused;
    focus.textContent = focused ? 'Назад к виду' : 'К предмету';
    if (focused) focusObject();
    else {
      framing = undefined;
      onResize();
    }
  });
  for (const field of coordinates) field.addEventListener('change', () => {
    if (Number.isFinite(field.valueAsNumber)) edit({ [axes.indexOf(field.dataset.coordinate)]: field.valueAsNumber });
    else updateFields();
  });
  angle.addEventListener('change', () => {
    if (Number.isFinite(angle.valueAsNumber)) edit({ 3: T.MathUtils.degToRad(angle.valueAsNumber) });
    else updateFields();
  });
  scale.addEventListener('input', () => {
    scaling ??= { item: selected, before: snapshot(selected) };
    selected.object.scale.copy(selected.baseScale).multiplyScalar(scale.valueAsNumber / 100);
    updateScale();
    onChange();
  });
  scale.addEventListener('change', finishScale);
  scale.addEventListener('blur', finishScale);
  for (const control of panel.querySelectorAll('[data-turn]')) control.addEventListener('click', () => {
    edit({ 3: selected.object.rotation[selected.axis] + T.MathUtils.degToRad(Number(control.dataset.turn)) });
  });
  undoButton.addEventListener('click', () => moveInHistory(history, future, 'before'));
  redoButton.addEventListener('click', () => moveInHistory(future, history, 'after'));
  panel.querySelector('#layout-revert').addEventListener('click', () => edit(defaults.get(selected)));
  document.addEventListener('keydown', event => {
    if (!active || document.querySelector('#detail').open) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (drag) endDrag(false);
      else setActive(false);
    } else if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && event.target === canvas) {
      event.preventDefault();
      if (event.shiftKey) moveInHistory(future, history, 'after');
      else moveInHistory(history, future, 'before');
    }
  });

  load();
  choices.value = selected.id;
  updateFields();
  toggle.hidden = false;
  onChange();
  return { get active() { return active; }, pose, projectSelection };
}

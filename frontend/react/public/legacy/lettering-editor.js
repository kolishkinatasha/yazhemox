import { workshopLetteringLayout } from './workshop-lettering-layout.js?v=36';

const storageKey = 'yazhemoh-lettering-v1';
const arrowSteps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const zero = [0, 0];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isOffset = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

function readPositions() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if ([1, 2].includes(saved?.version) && saved.positions && typeof saved.positions === 'object') {
      return Object.fromEntries(Object.entries(saved.positions)
        .filter(([, offsets]) => offsets && typeof offsets === 'object' && !Array.isArray(offsets))
        .map(([frame, offsets]) => [frame, Object.fromEntries(Object.entries(offsets).filter(([key, offset]) => {
          if (isOffset(offset?.edge)) return true;
          if (!isOffset(offset)) return false;
          const previous = workshopLetteringLayout[frame]?.[key]?.previous;
          return !previous?.every((value, index) => Math.abs(value - offset[index]) < .001);
        }))]));
    }
  } catch {
    // A missing or unreadable profile leaves labels at their scene positions.
  }
  return {};
}

export function createLetteringEditor(workshop, layer, attachmentFor, onOpen) {
  const tools = workshop.querySelector('#lettering-tools');
  const status = tools.querySelector('#lettering-status');
  const save = tools.querySelector('#lettering-save');
  const launch = workshop.querySelector('#lettering-start');
  const applied = new WeakMap();
  const modified = new Map();
  let positions = readPositions();
  let active = false, view, drag;

  function offsetFor(button) {
    const key = button.dataset.label;
    const saved = positions[view]?.[key];
    if (isOffset(saved)) return saved;
    const { angle, span } = attachmentFor(button);
    const [along, across] = saved?.edge ?? workshopLetteringLayout[view]?.[key]?.edge ?? zero;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    return [span * (along * cosine - across * sine), span * (along * sine + across * cosine)];
  }

  function place(button, [x, y]) {
    const [oldX, oldY] = applied.get(button) ?? zero;
    const bounds = button.getBoundingClientRect();
    const next = [
      clamp(x, 2 - bounds.left + oldX, layer.clientWidth - 2 - bounds.right + oldX),
      clamp(y, 2 - bounds.top + oldY, layer.clientHeight - 2 - bounds.bottom + oldY),
    ];
    if (next[0] || next[1]) button.style.translate = `${next[0]}px ${next[1]}px`;
    else button.style.removeProperty('translate');
    applied.set(button, next);
    return next;
  }

  function report(message) {
    const changed = modified.size > 0;
    status.textContent = message ?? (changed ? 'Есть несохранённые изменения.' : 'Перетащите подписи или используйте стрелки.');
    save.disabled = !changed;
  }

  function move(button, x, y) {
    const previous = applied.get(button) ?? zero;
    const next = place(button, [x, y]);
    if (next[0] === previous[0] && next[1] === previous[1]) return;
    const { angle, span } = attachmentFor(button);
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const key = button.dataset.label;
    (positions[view] ??= {})[key] = { edge: [
      (next[0] * cosine + next[1] * sine) / span,
      (next[1] * cosine - next[0] * sine) / span,
    ] };
    if (!modified.has(view)) modified.set(view, new Set());
    modified.get(view).add(key);
    report();
  }

  function finishDrag() {
    if (!drag) return;
    const { button, pointerId } = drag;
    drag = null;
    button.classList.remove('is-dragged');
    if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
  }

  function applyView() {
    for (const button of layer.querySelectorAll('.object-lettering:not([hidden])')) {
      place(button, offsetFor(button));
    }
  }

  function update(zone, narrow) {
    finishDrag();
    view = `${narrow ? 'narrow' : 'wide'}-${zone ?? 'overview'}`;
    applyView();
  }

  function close(returnFocus = false) {
    if (!active) return;
    finishDrag();
    active = false;
    tools.hidden = true;
    workshop.classList.remove('lettering-editing');
    if (returnFocus) workshop.querySelector('#help').focus({ preventScroll: true });
  }

  launch.addEventListener('click', () => {
    active = true;
    onOpen();
    workshop.classList.add('lettering-editing');
    tools.hidden = false;
    report();
    (layer.querySelector('.object-lettering:not([hidden])') ?? tools.querySelector('#lettering-done'))
      .focus({ preventScroll: true });
  });
  tools.querySelector('#lettering-done').addEventListener('click', () => close(true));

  function mergeSavedPositions() {
    const saved = readPositions();
    for (const [frame, keys] of modified) {
      const offsets = saved[frame] ??= {};
      for (const key of keys) offsets[key] = positions[frame][key];
    }
    return saved;
  }

  const serialize = positions => JSON.stringify({ version: 2, positions }, null, 2);
  save.addEventListener('click', () => {
    try {
      const saved = mergeSavedPositions();
      localStorage.setItem(storageKey, serialize(saved));
      positions = saved;
      modified.clear();
      applyView();
      report('Расстановка сохранена в этом браузере.');
    } catch {
      report('Браузер не сохранил позиции. Можно скачать JSON.');
    }
  });
  tools.querySelector('#lettering-export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([serialize(mergeSavedPositions())], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yazhemoh-lettering.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  layer.addEventListener('pointerdown', event => {
    const button = event.target.closest('.object-lettering');
    if (!active || !button || drag || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    button.focus({ preventScroll: true });
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-dragged');
    const [x, y] = applied.get(button) ?? zero;
    drag = { button, pointerId: event.pointerId, x: x - event.clientX, y: y - event.clientY };
  });
  layer.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) return;
    move(drag.button, event.clientX + drag.x, event.clientY + drag.y);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    layer.addEventListener(name, event => {
      if (drag?.pointerId === event.pointerId) finishDrag();
    });
  }
  layer.addEventListener('keydown', event => {
    const step = arrowSteps[event.key];
    if (!active || !step || !event.target.matches('.object-lettering')) return;
    event.preventDefault();
    const [x, y] = applied.get(event.target) ?? zero;
    const distance = event.shiftKey ? 10 : 2;
    move(event.target, x + step[0] * distance, y + step[1] * distance);
  });

  return { get active() { return active; }, update, close };
}

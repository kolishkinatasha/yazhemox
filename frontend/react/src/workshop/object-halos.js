import * as T from 'three';

function corners({ min, max }) {
  const result = [];
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) result.push(new T.Vector3(x, y, z));
    }
  }
  return result;
}

function outline(points) {
  points.sort((a, b) => a.x - b.x || a.y - b.y);
  function half(order) {
    const edge = [];
    for (const point of order) {
      while (edge.length >= 2) {
        const a = edge[edge.length - 2], b = edge[edge.length - 1];
        if ((b.x - a.x) * (point.y - a.y) > (b.y - a.y) * (point.x - a.x)) break;
        edge.pop();
      }
      edge.push(point);
    }
    edge.pop();
    return edge;
  }
  return [...half(points), ...half(points.reverse())];
}

function curvedPieces(object) {
  object.updateWorldMatrix(true, true);
  const local = object.matrixWorld.clone().invert();
  const transform = new T.Matrix4();
  const bounds = new T.Box3();
  const vertices = [];
  object.traverse(child => {
    if (!child.isMesh || child.material.transparent) return;
    transform.multiplyMatrices(local, child.matrixWorld);
    const { position } = child.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      const vertex = new T.Vector3().fromBufferAttribute(position, i).applyMatrix4(transform);
      vertices.push(vertex);
      bounds.expandByPoint(vertex);
    }
  });

  // Keep the narrow middle of the models instead of glowing around their bounding boxes.
  const count = 14;
  const strips = Array.from({ length: count }, () => []);
  const height = bounds.max.y - bounds.min.y;
  if (!height) return [];
  for (const vertex of vertices) {
    const index = Math.min(count - 1, Math.floor(count * (vertex.y - bounds.min.y) / height));
    strips[index].push({ x: vertex.x, y: vertex.z, vertex });
  }
  const sections = strips.filter(strip => strip.length).map(strip => {
    const bottom = strip.reduce((a, b) => a.vertex.y < b.vertex.y ? a : b);
    const top = strip.reduce((a, b) => a.vertex.y > b.vertex.y ? a : b);
    return [...outline(strip), bottom, top].map(({ vertex }) => vertex);
  });
  return sections.slice(1).map((section, index) => ({ object, points: sections[index].concat(section) }));
}

function piecesFor(object, { frame, curved }) {
  if (frame) {
    const box = new T.Box3().setFromCenterAndSize(new T.Vector3(...frame.center), new T.Vector3(...frame.size));
    return [{ object, points: corners(box) }];
  }
  if (curved) return curvedPieces(object);
  const pieces = [];
  object.traverse(child => {
    if (!child.isMesh || child.material.transparent) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    pieces.push({ object: child, points: corners(child.geometry.boundingBox) });
  });
  return pieces;
}

export function createObjectHalos(layer) {
  const halos = [];
  const byObject = new WeakMap();
  const point = new T.Vector3();
  const printerMask = layer.querySelector('#desk-halo-printer');
  let hovered = [];
  let hinted = [];

  function add(id, object, { frame, curved } = {}) {
    const path = document.createElementNS(layer.namespaceURI, 'path');
    path.classList.add('object-halo');
    if (id === 'desk') path.setAttribute('mask', 'url(#desk-halo-mask)');
    layer.append(path);
    byObject.set(object, path);
    halos.push({ id, path, pieces: piecesFor(object, { frame, curved }) });
  }

  function setHovered(paths) {
    if (paths.length === hovered.length && paths.every((path, index) => path === hovered[index])) return;
    for (const path of hovered) path.classList.remove('is-hovered');
    for (const path of paths) path.classList.add('is-hovered');
    hovered = paths;
  }

  function highlight(object) {
    let path;
    for (let parent = object; parent && !path; parent = parent.parent) {
      path = byObject.get(parent);
    }
    setHovered(path ? [path] : []);
  }

  // The room index uses a brighter outline, and one exhibit can own several objects.
  function highlightId(id) {
    for (const path of hinted) path.classList.remove('is-hinted');
    hinted = id ? halos.filter(halo => halo.id === id).map(halo => halo.path) : [];
    for (const path of hinted) path.classList.add('is-hinted');
  }

  function update(camera, width, height, roomZone) {
    for (const { id, path, pieces } of halos) {
      if (id === roomZone) {
        path.removeAttribute('d');
        continue;
      }
      const parts = [];
      for (const { object, points } of pieces) {
        if (!object.visible) continue;
        const visible = [];
        for (const corner of points) {
          point.copy(corner).applyMatrix4(object.matrixWorld).project(camera);
          if (point.z < -1 || point.z > 1) continue;
          visible.push({ x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 });
        }
        if (visible.length < 3) continue;
        const edge = outline(visible);
        if (edge.length >= 3) parts.push('M' + edge.map(({ x, y }) => x.toFixed(1) + ',' + y.toFixed(1)).join('L') + 'Z');
      }
      const silhouette = parts.join('');
      path.setAttribute('d', silhouette);
      if (id === 'printer') printerMask.setAttribute('d', silhouette);
    }
  }

  return { add, highlight, highlightId, update };
}

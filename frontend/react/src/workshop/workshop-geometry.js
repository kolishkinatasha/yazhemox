import * as T from 'three';

export function roundedBoxGeometry(width, height, depth, radius, bevelSegments = 2) {
  const half = new T.Vector3(width, height, depth).multiplyScalar(.5);
  radius = Math.min(radius, Math.min(half.x, half.y, half.z) * .98);
  const inner = half.clone().addScalar(-radius);
  const segments = 2 * bevelSegments + 1;
  const geometry = new T.BoxGeometry(2, 2, 2, segments, segments, segments);
  const { position, normal, uv } = geometry.attributes;
  const point = new T.Vector3(), nearest = new T.Vector3(), direction = new T.Vector3();
  const min = inner.clone().negate();

  function bevelCoordinate(value, extent) {
    const step = Math.round((value + 1) * segments / 2);
    return step <= bevelSegments
      ? -extent + radius * step / bevelSegments
      : extent - radius * (segments - step) / bevelSegments;
  }

  for (let i = 0; i < position.count; i++) {
    const uExtent = normal.getX(i) ? half.z : half.x;
    const vExtent = normal.getY(i) ? half.z : half.y;
    uv.setXY(i,
      .5 + bevelCoordinate(uv.getX(i) * 2 - 1, uExtent) / (2 * uExtent),
      .5 + bevelCoordinate(uv.getY(i) * 2 - 1, vExtent) / (2 * vExtent),
    );
    point.set(
      bevelCoordinate(position.getX(i), half.x),
      bevelCoordinate(position.getY(i), half.y),
      bevelCoordinate(position.getZ(i), half.z),
    );
    nearest.copy(point).clamp(min, inner);
    direction.subVectors(point, nearest).normalize();
    point.copy(nearest).addScaledVector(direction, radius);
    position.setXYZ(i, point.x, point.y, point.z);
    normal.setXYZ(i, direction.x, direction.y, direction.z);
  }
  return geometry;
}

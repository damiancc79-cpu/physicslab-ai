export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const cloneVec3 = (value: Vec3): Vec3 => ({ x: value.x, y: value.y, z: value.z });

export const addScaled = (target: Vec3, value: Vec3, scale: number): Vec3 => {
  target.x += value.x * scale;
  target.y += value.y * scale;
  target.z += value.z * scale;
  return target;
};

export const subtract = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const length = (value: Vec3): number =>
  Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);

export const normalize = (value: Vec3): Vec3 => {
  const magnitude = length(value) || 1;
  return { x: value.x / magnitude, y: value.y / magnitude, z: value.z / magnitude };
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const clampMagnitude = (value: Vec3, maxLength: number): Vec3 => {
  const magnitude = length(value);
  if (magnitude <= maxLength || magnitude === 0) return value;

  const scale = maxLength / magnitude;
  value.x *= scale;
  value.y *= scale;
  value.z *= scale;
  return value;
};

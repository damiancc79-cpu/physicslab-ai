import { validateScenePreset, type ScenePreset } from '../scene/ScenePresetSchema';

const STORAGE_KEY = 'physicslab-ai.user-presets.v1';
const MAX_USER_PRESETS = 18;

export interface SavedUserPreset {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  scene: ScenePreset;
  thumbnail: string;
}

export const loadUserPresets = (): SavedUserPreset[] => {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedUserPreset).slice(0, MAX_USER_PRESETS);
  } catch {
    return [];
  }
};

export const saveUserPreset = (
  library: SavedUserPreset[],
  scene: ScenePreset,
  label: string,
  now = new Date(),
): SavedUserPreset[] => {
  const validation = validateScenePreset(scene);
  if (!validation.ok || !validation.scene) return library;

  const timestamp = now.toISOString();
  const saved: SavedUserPreset = {
    id: `preset-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    label: cleanLabel(label, scene.presetName),
    createdAt: timestamp,
    updatedAt: timestamp,
    scene: validation.scene,
    thumbnail: createPresetThumbnail(validation.scene),
  };
  const nextLibrary = [saved, ...library].slice(0, MAX_USER_PRESETS);
  persistUserPresets(nextLibrary);
  return nextLibrary;
};

export const deleteUserPreset = (library: SavedUserPreset[], presetId: string): SavedUserPreset[] => {
  const nextLibrary = library.filter((preset) => preset.id !== presetId);
  persistUserPresets(nextLibrary);
  return nextLibrary;
};

export const createPresetThumbnail = (scene: ScenePreset): string => {
  const palette = paletteFor(scene.presetType);
  const primaryMetric = getPrimaryMetric(scene);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">
  <rect width="160" height="96" rx="10" fill="${palette.background}"/>
  <path d="M0 68 C32 48 44 88 74 66 C104 44 118 62 160 36 L160 96 L0 96 Z" fill="${palette.accent}" opacity="0.42"/>
  <circle cx="122" cy="28" r="18" fill="${palette.highlight}" opacity="0.7"/>
  <g fill="none" stroke="${palette.line}" stroke-width="2" opacity="0.8">
    ${shapeFor(scene.presetType)}
  </g>
  <text x="12" y="20" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">${escapeXml(scene.presetName.slice(0, 22))}</text>
  <text x="12" y="82" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="10">${escapeXml(primaryMetric)}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const persistUserPresets = (library: SavedUserPreset[]): void => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    // Preset persistence is a local convenience; the active scene remains usable in memory.
  }
};

const cleanLabel = (label: string, fallback: string): string => {
  const trimmed = label.trim().slice(0, 48);
  return trimmed || fallback;
};

const getPrimaryMetric = (scene: ScenePreset): string => {
  if (scene.presetId === 'particle-fluid') return `${scene.parameters.particleCount ?? 0} particles`;
  if (scene.presetId === 'gravity-sandbox') return `${scene.parameters.bodyCount ?? 0} bodies`;
  if (scene.presetId === 'cloth-sheet') {
    return `${scene.parameters.segmentsX ?? 0}x${scene.parameters.segmentsY ?? 0} cloth`;
  }
  return `${scene.parameters.resolution ?? 0}^3 lattice`;
};

const paletteFor = (presetType: ScenePreset['presetType']) => {
  switch (presetType) {
    case 'softBody':
      return { background: '#082f49', accent: '#0891b2', highlight: '#67e8f9', line: '#bae6fd' };
    case 'fluid':
      return { background: '#0f172a', accent: '#2563eb', highlight: '#38bdf8', line: '#bfdbfe' };
    case 'gravity':
      return { background: '#18181b', accent: '#a21caf', highlight: '#f0abfc', line: '#f5d0fe' };
    case 'cloth':
      return { background: '#111827', accent: '#1d4ed8', highlight: '#facc15', line: '#dbeafe' };
  }
};

const shapeFor = (presetType: ScenePreset['presetType']): string => {
  switch (presetType) {
    case 'softBody':
      return '<rect x="48" y="34" width="48" height="34" rx="7"/><path d="M48 44 L96 58 M58 34 L86 68"/>';
    case 'fluid':
      return '<path d="M40 54 C54 34 76 76 92 46 C104 26 122 52 132 42"/><circle cx="54" cy="62" r="3"/><circle cx="88" cy="66" r="3"/>';
    case 'gravity':
      return '<circle cx="78" cy="52" r="24"/><circle cx="78" cy="52" r="4"/><path d="M54 42 C74 20 110 28 124 48"/>';
    case 'cloth':
      return '<path d="M46 30 L116 36 L112 70 L42 62 Z"/><path d="M58 32 L54 64 M72 34 L70 66 M88 34 L88 68 M104 36 L102 70 M44 46 L114 52 M42 58 L112 64"/>';
  }
};

const isSavedUserPreset = (value: unknown): value is SavedUserPreset => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as SavedUserPreset;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.thumbnail === 'string' &&
    validateScenePreset(candidate.scene).ok
  );
};

const getStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

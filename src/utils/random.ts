export const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

export const randomSigned = (magnitude = 1): number => (Math.random() * 2 - 1) * magnitude;

export type Fish = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  tailPhase: number;
};

type Rng = () => number;

export const mulberry32 = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createFishSchool = ({
  count,
  width,
  height,
  rng,
}: {
  count: number;
  width: number;
  height: number;
  rng: Rng;
}): Fish[] => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeCount = clamp(Math.floor(count), 0, 120);

  return Array.from({ length: safeCount }, () => {
    const size = 10 + rng() * 26;
    const speed = (18 + rng() * 42) / size;
    const direction = rng() < 0.5 ? -1 : 1;
    const angle = (rng() - 0.5) * 0.45;
    return {
      x: rng() * safeWidth,
      y: rng() * safeHeight,
      vx: Math.cos(angle) * speed * direction,
      vy: Math.sin(angle) * speed,
      size,
      hue: 185 + rng() * 40,
      alpha: 0.14 + rng() * 0.22,
      tailPhase: rng() * Math.PI * 2,
    };
  });
};

export const stepFishSchool = ({
  fish,
  dtSeconds,
  width,
  height,
  rng,
}: {
  fish: Fish[];
  dtSeconds: number;
  width: number;
  height: number;
  rng: Rng;
}): Fish[] => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const dt = clamp(dtSeconds, 0, 0.05);

  return fish.map((item) => {
    const vx = item.vx;
    let vy = item.vy;
    let x = item.x + vx * dt * 60;
    let y = item.y + vy * dt * 60;

    if (rng() < 0.02) {
      vy += (rng() - 0.5) * 0.06;
      vy = clamp(vy, -0.65, 0.65);
    }

    y += (Math.sin(item.tailPhase + x * 0.015) * 0.14) / item.size;

    const margin = item.size * 1.2;
    if (x < -margin) x = safeWidth + margin;
    if (x > safeWidth + margin) x = -margin;
    if (y < -margin) y = safeHeight + margin;
    if (y > safeHeight + margin) y = -margin;

    return {
      ...item,
      x,
      y,
      vx,
      vy,
      tailPhase: item.tailPhase + dt * 2.2,
    };
  });
};

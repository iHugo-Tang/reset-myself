'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  createFishSchool,
  mulberry32,
  stepFishSchool,
  type Fish,
} from './fishSimulation';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const drawFish = (ctx: CanvasRenderingContext2D, fish: Fish) => {
  const direction = fish.vx >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.scale(direction, 1);

  const bodyLength = fish.size * 1.35;
  const bodyHeight = fish.size * 0.8;
  const tailWidth = fish.size * 0.75;

  const gradient = ctx.createLinearGradient(-bodyLength * 0.4, 0, bodyLength, 0);
  gradient.addColorStop(0, `hsla(${fish.hue}, 80%, 62%, ${fish.alpha * 0.85})`);
  gradient.addColorStop(1, `hsla(${fish.hue + 18}, 70%, 54%, ${fish.alpha})`);
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.ellipse(0, 0, bodyLength * 0.5, bodyHeight * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const tailWave = Math.sin(fish.tailPhase) * (fish.size * 0.22);
  ctx.beginPath();
  ctx.moveTo(-bodyLength * 0.5, 0);
  ctx.lineTo(-bodyLength * 0.5 - tailWidth, bodyHeight * 0.35 + tailWave);
  ctx.lineTo(-bodyLength * 0.5 - tailWidth, -bodyHeight * 0.35 - tailWave);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(7, 11, 16, ${fish.alpha * 0.9})`;
  ctx.beginPath();
  ctx.arc(bodyLength * 0.22, -bodyHeight * 0.08, fish.size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

export const FishBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rng = useMemo(() => mulberry32(1337), []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let fish: Fish[] = [];
    let frameId = 0;
    let lastFrameTime = performance.now();
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      fish = createFishSchool({
        count: Math.round((width * height) / 75000) + 8,
        width,
        height,
        rng,
      });
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const tick = (now: number) => {
      const dtSeconds = Math.max(0, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, 'rgba(5, 12, 20, 0.65)');
      bg.addColorStop(1, 'rgba(1, 3, 7, 0.85)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      fish = stepFishSchool({ fish, dtSeconds, width, height, rng });
      for (const item of fish) drawFish(ctx, item);

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(frameId);
    };
  }, [rng]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
};


'use client';

import {
  type CSSProperties,
  type HTMLAttributes,
  type PropsWithChildren,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import './ElectricBorder.css';

type ElectricBorderProps = PropsWithChildren<
  {
    color?: CSSProperties['color'];
    speed?: number;
    chaos?: number;
    thickness?: number;
    mode?: 'full' | 'lite' | 'off';
  } & HTMLAttributes<HTMLDivElement>
>;

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(Boolean(media.matches));
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reduced;
};

const getSaveDataEnabled = () => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return Boolean(nav.connection?.saveData);
};

const ElectricBorder = ({
  children,
  color = '#5227FF',
  speed = 1,
  chaos = 1,
  thickness = 2,
  mode = 'full',
  className,
  style,
  ...rest
}: ElectricBorderProps) => {
  const rawId = useId().replace(/[:]/g, '');
  const filterId = `turbulent-displace-${rawId}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const strokeRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const saveData = getSaveDataEnabled();
  const resolvedMode =
    mode === 'off' ? 'off' : prefersReducedMotion || saveData ? 'lite' : mode;

  const updateAnim = () => {
    if (resolvedMode !== 'full') return;
    const svg = svgRef.current;
    const host = rootRef.current;
    if (!svg || !host) return;

    if (strokeRef.current) {
      strokeRef.current.style.filter = `url(#${filterId})`;
    }

    const width = Math.max(1, Math.round(host.clientWidth || host.getBoundingClientRect().width || 0));
    const height = Math.max(1, Math.round(host.clientHeight || host.getBoundingClientRect().height || 0));

    const dyAnims = Array.from(svg.querySelectorAll<SVGAnimateElement>('feOffset > animate[attributeName="dy"]'));
    if (dyAnims.length >= 2) {
      dyAnims[0].setAttribute('values', `${height}; 0`);
      dyAnims[1].setAttribute('values', `0; -${height}`);
    }

    const dxAnims = Array.from(svg.querySelectorAll<SVGAnimateElement>('feOffset > animate[attributeName="dx"]'));
    if (dxAnims.length >= 2) {
      dxAnims[0].setAttribute('values', `${width}; 0`);
      dxAnims[1].setAttribute('values', `0; -${width}`);
    }

    const baseDur = 6;
    const dur = Math.max(0.001, baseDur / (speed || 1));
    [...dyAnims, ...dxAnims].forEach(a => a.setAttribute('dur', `${dur}s`));

    const disp = svg.querySelector('feDisplacementMap');
    if (disp) disp.setAttribute('scale', String(30 * (chaos || 1)));

    const filterEl = svg.querySelector(`#${filterId}`);
    if (filterEl) {
      filterEl.setAttribute('x', '-200%');
      filterEl.setAttribute('y', '-200%');
      filterEl.setAttribute('width', '500%');
      filterEl.setAttribute('height', '500%');
    }

    requestAnimationFrame(() => {
      [...dyAnims, ...dxAnims].forEach(a => {
        if (typeof a.beginElement === 'function') {
          try {
            a.beginElement();
          } catch {
            console.warn('ElectricBorder: beginElement failed, this may be due to a browser limitation.');
          }
        }
      });
    });
  };

  useEffect(() => {
    if (resolvedMode !== 'full') return;
    updateAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedMode, speed, chaos]);

  useEffect(() => {
    if (resolvedMode === 'full') return;
    if (strokeRef.current) strokeRef.current.style.filter = 'none';
  }, [resolvedMode]);

  useLayoutEffect(() => {
    if (resolvedMode !== 'full') return;
    if (!rootRef.current) return;
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateAnim());
      ro.observe(rootRef.current);
      updateAnim();
      return () => ro.disconnect();
    }

    const onResize = () => updateAnim();
    window.addEventListener('resize', onResize, { passive: true });
    updateAnim();
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedMode]);

  const vars = {
    ['--electric-border-color']: color,
    ['--eb-border-width']: `${thickness}px`,
  } as CSSProperties;

  if (resolvedMode === 'off') {
    return (
      <div
        {...rest}
        ref={rootRef}
        className={className}
        style={{ ...vars, ...style }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      {...rest}
      ref={rootRef}
      className={`electric-border ${resolvedMode === 'lite' ? 'eb-lite' : ''} ${className ?? ''}`}
      style={{ ...vars, ...style }}
    >
      {resolvedMode === 'full' ? (
        <svg ref={svgRef} className="eb-svg" aria-hidden focusable="false">
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
              <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
                <animate attributeName="dy" values="700; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
              </feOffset>

              <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
              <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
                <animate attributeName="dy" values="0; -700" dur="6s" repeatCount="indefinite" calcMode="linear" />
              </feOffset>

              <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="2" />
              <feOffset in="noise1" dx="0" dy="0" result="offsetNoise3">
                <animate attributeName="dx" values="490; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
              </feOffset>

              <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="2" />
              <feOffset in="noise2" dx="0" dy="0" result="offsetNoise4">
                <animate attributeName="dx" values="0; -490" dur="6s" repeatCount="indefinite" calcMode="linear" />
              </feOffset>

              <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
              <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
              <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="combinedNoise"
                scale="30"
                xChannelSelector="R"
                yChannelSelector="B"
              />
            </filter>
          </defs>
        </svg>
      ) : null}

      <div className="eb-layers">
        <div ref={strokeRef} className="eb-stroke" />
        {resolvedMode === 'full' ? (
          <>
            <div className="eb-glow-1" />
            <div className="eb-glow-2" />
          </>
        ) : null}
        <div className="eb-background-glow" />
      </div>

      <div className="eb-content">{children}</div>
    </div>
  );
};

export default ElectricBorder;

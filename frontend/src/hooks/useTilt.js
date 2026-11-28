import { useCallback, useRef } from 'react';

const tiltEnabled = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Subtle 3D tilt toward the pointer. Spread the returned props onto an element
 * that also has the `tilt-3d` class (see index.css), which reads the CSS
 * variables set here. Disabled on touch devices and for reduced motion.
 *
 * @param {number} maxDeg maximum rotation in degrees
 */
export default function useTilt(maxDeg = 4) {
  const frame = useRef(0);

  const onPointerMove = useCallback(
    (e) => {
      if (!tiltEnabled()) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const y = (e.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-x', `${((0.5 - y) * 2 * maxDeg).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${((x - 0.5) * 2 * maxDeg).toFixed(2)}deg`);
        el.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
        el.dataset.tilting = 'true';
      });
    },
    [maxDeg]
  );

  const onPointerLeave = useCallback((e) => {
    const el = e.currentTarget;
    cancelAnimationFrame(frame.current);
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
    delete el.dataset.tilting;
  }, []);

  return { onPointerMove, onPointerLeave };
}

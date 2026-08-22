import { useRef, useCallback } from 'react';

/**
 * AnimatedBackground — Interactive dot-grid with cursor-tracking spotlight.
 * Inspired by Linear/Vercel. Uses useRef + CSS variables for 60fps
 * performance (no React re-renders on mousemove).
 */
export default function AnimatedBackground() {
  const containerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    containerRef.current.style.setProperty('--x', `${e.clientX}px`);
    containerRef.current.style.setProperty('--y', `${e.clientY}px`);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="animated-bg"
      style={{ '--x': '-1000px', '--y': '-1000px' }}
    />
  );
}

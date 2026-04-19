import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';

export function useGsapCounter(
  ref: RefObject<HTMLElement | null>,
  value: number,
  options?: { duration?: number; ease?: string }
): void {
  const lastDone = useRef<number | null>(null);
  const duration = options?.duration ?? 0.55;
  const ease = options?.ease ?? 'power2.out';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = lastDone.current === null ? 0 : lastDone.current;
    const obj = { n: start };

    const tween = gsap.to(obj, {
      n: value,
      duration,
      ease,
      onUpdate: () => {
        el.textContent = Math.round(obj.n).toLocaleString();
      },
      onComplete: () => {
        lastDone.current = value;
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, ref, duration, ease]);
}

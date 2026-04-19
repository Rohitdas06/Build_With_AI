import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';

export type HoverLiftOptions = {
  y?: number;
  scale?: number;
  durationIn?: number;
  durationOut?: number;
};

/**
 * Subtle lift + scale on hover (cards, tiles, icon buttons).
 */
export function useGsapHoverLift(ref: RefObject<HTMLElement | null>, options?: HoverLiftOptions): void {
  const y = options?.y ?? -3;
  const scale = options?.scale ?? 1.02;
  const durationIn = options?.durationIn ?? 0.22;
  const durationOut = options?.durationOut ?? 0.32;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onEnter = () => {
      gsap.to(el, { y, scale, duration: durationIn, ease: 'power2.out', overwrite: 'auto' });
    };
    const onLeave = () => {
      gsap.to(el, { y: 0, scale: 1, duration: durationOut, ease: 'power2.out', overwrite: 'auto' });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [ref, y, scale, durationIn, durationOut]);
}

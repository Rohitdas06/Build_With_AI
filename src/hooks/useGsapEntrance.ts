import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';

export type GsapEntranceOptions = {
  from?: gsap.TweenVars;
  duration?: number;
  ease?: string;
  delay?: number;
  staggerChildren?: boolean;
  childStagger?: number;
};

const defaultFrom: gsap.TweenVars = { autoAlpha: 0, y: 16 };

/**
 * One-shot (or keyed) entrance. Pass `deps` e.g. `[]` for mount-only, or `[incidentId]` to replay when identity changes.
 */
export function useGsapEntrance(
  ref: RefObject<HTMLElement | null>,
  deps: ReadonlyArray<unknown>,
  options?: GsapEntranceOptions
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from = { ...defaultFrom, ...options?.from };
    const duration = options?.duration ?? 0.45;
    const ease = options?.ease ?? 'power2.out';
    const delay = options?.delay ?? 0;

    const ctx = gsap.context(() => {
      if (options?.staggerChildren) {
        const kids = gsap.utils.toArray<HTMLElement>(el.children);
        if (kids.length === 0) return;
        gsap.from(kids, {
          ...from,
          duration,
          ease,
          delay,
          stagger: options.childStagger ?? 0.06,
        });
      } else {
        gsap.from(el, { ...from, duration, ease, delay });
      }
    }, el);

    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps array is the explicit trigger list
  }, [ref, ...deps]);
}

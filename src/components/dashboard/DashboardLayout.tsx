import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { cn } from '../../lib/utils';

export function DashboardLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  const scanLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scanLayerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.to(el, {
        backgroundPosition: '100% 100%',
        duration: 32,
        ease: 'none',
        repeat: -1,
        yoyo: true,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col relative overflow-hidden',
        'bg-[#080c14] text-slate-200 selection:bg-cyan-500/25',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34, 211, 238, 0.15), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(239, 68, 68, 0.08), transparent 50%)',
        }}
      />
      <div
        ref={scanLayerRef}
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(105deg, transparent, transparent 40px, rgba(34,211,238,0.08) 40px, rgba(34,211,238,0.08) 41px)',
          backgroundSize: '200% 200%',
          backgroundPosition: '0% 0%',
        }}
      />
      <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}

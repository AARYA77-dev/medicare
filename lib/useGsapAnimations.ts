/**
 * Reusable GSAP animation hooks for Medicare app.
 * Registers ScrollTrigger plugin once globally.
 */
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register plugins once (safe to call multiple times)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Fade + slide up on mount for a container ref */
export function useFadeSlideUp(
  selector: string,
  options?: {
    stagger?: number;
    duration?: number;
    delay?: number;
    y?: number;
  }
) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const targets = el.querySelectorAll(selector);
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: options?.y ?? 30 },
        {
          opacity: 1,
          y: 0,
          duration: options?.duration ?? 0.6,
          stagger: options?.stagger ?? 0.08,
          delay: options?.delay ?? 0,
          ease: "power3.out",
        }
      );
    }, el);

    return () => ctx.revert();
  }, [selector, options?.stagger, options?.duration, options?.delay, options?.y]);

  return containerRef;
}

/** Staggered scroll-triggered reveal for cards */
export function useScrollReveal(selector: string, stagger = 0.1) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>(selector);
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 50, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          stagger,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [selector, stagger]);

  return containerRef;
}

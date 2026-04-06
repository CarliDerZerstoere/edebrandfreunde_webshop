"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * PageTransition — Apple-style dissolve.
 *
 * On route change, <main> fades out with a subtle upward drift,
 * then the new content fades in with a soft downward settle.
 *
 * Timing:
 *   Phase 1  opacity 1→0, y 0→-6   200ms  ease-in   (old content exits)
 *   Gap                              50ms             (Next.js swaps tree)
 *   Phase 2  opacity 0→1, y 8→0    350ms  ease-out   (new content arrives)
 *   Cleanup  strip inline styles    after Phase 2
 *
 * Renders no DOM — manipulates <main> directly.
 */
export function PageTransition() {
	const pathname = usePathname();
	const prevPathname = useRef<string | null>(null);
	const tlRef = useRef<gsap.core.Timeline | null>(null);
	const ctxRef = useRef<gsap.Context | null>(null);
	const prefersReduced = useReducedMotion();

	useEffect(() => {
		if (prevPathname.current === null) {
			prevPathname.current = pathname;
			return;
		}
		if (prevPathname.current === pathname) return;
		prevPathname.current = pathname;

		const main = document.querySelector("main") as HTMLElement | null;
		if (!main) return;

		// Kill in-flight animation
		tlRef.current?.kill();
		ctxRef.current?.revert();

		// Reduced motion: instant swap, no animation
		// eslint-disable-next-line react-hooks/exhaustive-deps
		if (prefersReduced) return;

		const ctx = gsap.context(() => {
			const tl = gsap.timeline({
				onComplete: () => {
					gsap.set(main, { clearProps: "opacity,y,transform" });
				},
			});
			tlRef.current = tl;

			// Phase 1: fade out + subtle upward drift
			tl.to(main, {
				opacity: 0,
				y: -6,
				duration: 0.2,
				ease: "power2.in",
			})
			// Phase 2: fade in + soft downward settle
			.fromTo(main,
				{ opacity: 0, y: 8 },
				{
					opacity: 1,
					y: 0,
					duration: 0.35,
					ease: "power2.out",
				},
				"+=0.05",
			);
		});

		ctxRef.current = ctx;

		return () => {
			tlRef.current?.kill();
			ctx.revert();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname]);

	useEffect(() => {
		return () => {
			tlRef.current?.kill();
			ctxRef.current?.revert();
		};
	}, []);

	return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * PageTransition — claude.ai-style dissolve effect.
 *
 * On route change this component finds the nearest <main> element and applies
 * a short fade-out + translateY exit, then lets the new content fade in.
 *
 * Architecture: sibling component (never wraps children) so it is fully
 * compatible with Next.js Partial Prerendering and Suspense boundaries.
 *
 * Timing:
 *   fade-out  150ms  ease-in     (old content leaves)
 *   gap        50ms              (brief pause while Next.js swaps the tree)
 *   fade-in   300ms  ease-out    (new content arrives with a subtle lift)
 *
 * Respects prefers-reduced-motion — does nothing when motion is reduced.
 */
export function PageTransition() {
	const pathname = usePathname();
	const prevPathname = useRef<string | null>(null);
	const rafRef = useRef<number>(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		// Skip on the very first render (no previous path yet).
		if (prevPathname.current === null) {
			prevPathname.current = pathname;
			return;
		}

		// No change — nothing to do.
		if (prevPathname.current === pathname) return;
		prevPathname.current = pathname;

		// Respect reduced motion.
		if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}

		const main = document.querySelector("main");
		if (!main) return;

		// Cancel any in-flight transition.
		cancelAnimationFrame(rafRef.current);
		if (timerRef.current !== null) clearTimeout(timerRef.current);

		// --- Phase 1: fade out ---
		// Force the element into a known starting state first.
		(main as HTMLElement).style.transition = "none";
		(main as HTMLElement).style.opacity = "1";
		(main as HTMLElement).style.transform = "translateY(0)";

		// Next tick: apply the exit transition.
		rafRef.current = requestAnimationFrame(() => {
			(main as HTMLElement).style.transition =
				"opacity 150ms cubic-bezier(0.4, 0, 1, 1), transform 150ms cubic-bezier(0.4, 0, 1, 1)";
			(main as HTMLElement).style.opacity = "0";
			(main as HTMLElement).style.transform = "translateY(-6px)";

			// --- Phase 2: brief gap, then fade in ---
			timerRef.current = setTimeout(() => {
				// Reset to the entering state without a transition so the
				// starting position is set before we animate in.
				(main as HTMLElement).style.transition = "none";
				(main as HTMLElement).style.opacity = "0";
				(main as HTMLElement).style.transform = "translateY(8px)";

				rafRef.current = requestAnimationFrame(() => {
					(main as HTMLElement).style.transition =
						"opacity 300ms cubic-bezier(0, 0, 0.2, 1), transform 300ms cubic-bezier(0, 0, 0.2, 1)";
					(main as HTMLElement).style.opacity = "1";
					(main as HTMLElement).style.transform = "translateY(0)";

					// Clean up inline styles once the animation finishes.
					timerRef.current = setTimeout(() => {
						(main as HTMLElement).style.transition = "";
						(main as HTMLElement).style.opacity = "";
						(main as HTMLElement).style.transform = "";
					}, 320);
				});
			}, 200); // 150ms exit + 50ms pause
		});

		return () => {
			cancelAnimationFrame(rafRef.current);
			if (timerRef.current !== null) clearTimeout(timerRef.current);
		};
	}, [pathname]);

	// This component renders no DOM nodes — it only manipulates the <main> element.
	return null;
}

"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Thin copper progress bar at the bottom edge of the sticky navbar.
 * Width scales from 0% to 100% based on document scroll position.
 */
export function ScrollProgress() {
	const barRef = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();

	useEffect(() => {
		const bar = barRef.current;
		if (!bar || prefersReduced) return;

		// Calculate progress manually for accuracy
		const updateProgress = () => {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			const progress = docHeight > 0 ? scrollTop / docHeight : 0;
			bar.style.transform = `scaleX(${progress})`;
		};

		window.addEventListener("scroll", updateProgress, { passive: true });
		updateProgress();

		return () => window.removeEventListener("scroll", updateProgress);
	}, [prefersReduced]);

	if (prefersReduced) return null;

	return (
		<div
			ref={barRef}
			className="pointer-events-none fixed left-0 z-[101] h-[2px] w-full origin-left"
			style={{
				background: "var(--copper)",
				transform: "scaleX(0)",
				top: "64px",
			}}
			aria-hidden="true"
		/>
	);
}

"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface MagneticWrapperProps {
	children: ReactNode;
	/** Magnetic pull strength, 0–1. Default 0.35. */
	strength?: number;
	className?: string;
}

/**
 * Makes any child element magnetically attract toward the cursor on hover.
 * Only activates on devices with a fine pointer (mouse); touch devices are
 * unaffected. Respects `prefers-reduced-motion`.
 */
export function MagneticWrapper({ children, strength = 0.35, className }: MagneticWrapperProps) {
	const ref = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();

	useEffect(() => {
		const el = ref.current;
		if (!el || prefersReduced) return;

		// Only activate on devices with a fine pointer (mouse)
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

		let xTo: gsap.QuickToFunc;
		let yTo: gsap.QuickToFunc;

		const ctx = gsap.context(() => {
			xTo = gsap.quickTo(el, "x", { duration: 0.3, ease: "power3" });
			yTo = gsap.quickTo(el, "y", { duration: 0.3, ease: "power3" });
		});

		const handleMove = (e: MouseEvent) => {
			const rect = el.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			xTo((e.clientX - centerX) * strength);
			yTo((e.clientY - centerY) * strength);
		};

		const handleLeave = () => {
			gsap.to(el, { x: 0, y: 0, ease: "elastic.out(1, 0.4)", duration: 0.7 });
		};

		el.addEventListener("mousemove", handleMove);
		el.addEventListener("mouseleave", handleLeave);

		return () => {
			el.removeEventListener("mousemove", handleMove);
			el.removeEventListener("mouseleave", handleLeave);
			ctx.revert();
		};
	}, [strength, prefersReduced]);

	return (
		<div ref={ref} className={className} style={{ display: "inline-block" }}>
			{children}
		</div>
	);
}

"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface TiltCardProps {
	children: ReactNode;
	className?: string;
	/** Maximum rotation in degrees. Default 8. */
	maxRotation?: number;
}

/**
 * Wraps product cards with a 3D tilt effect driven by mouse position.
 *
 * Only activates on devices with a fine pointer (mouse) so touch users
 * see no behaviour change. The element snaps back elastically on
 * mouse leave. Respects `prefers-reduced-motion`.
 */
export function TiltCard({ children, className, maxRotation = 8 }: TiltCardProps) {
	const ref = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();

	useEffect(() => {
		const el = ref.current;
		if (!el || prefersReduced) return;
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

		const handleMove = (e: MouseEvent) => {
			const rect = el.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -maxRotation;
			const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * maxRotation;

			gsap.to(el, {
				rotateX,
				rotateY,
				transformPerspective: 800,
				ease: "power2.out",
				duration: 0.35,
			});
		};

		const handleLeave = () => {
			gsap.to(el, {
				rotateX: 0,
				rotateY: 0,
				ease: "elastic.out(1, 0.4)",
				duration: 0.7,
			});
		};

		el.addEventListener("mousemove", handleMove);
		el.addEventListener("mouseleave", handleLeave);

		return () => {
			el.removeEventListener("mousemove", handleMove);
			el.removeEventListener("mouseleave", handleLeave);
			gsap.set(el, { clearProps: "rotateX,rotateY,transformPerspective" });
		};
	}, [maxRotation, prefersReduced]);

	return (
		<div ref={ref} className={className} style={{ transformStyle: "preserve-3d" }}>
			{children}
		</div>
	);
}

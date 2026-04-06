"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface QualityItem {
	title: string;
	description: string;
	n: number;
}

interface QualityCounterProps {
	qualities: QualityItem[];
}

/**
 * Renders the Quality section cards with:
 * - Intersection-observer triggered entrance animations (staggered)
 * - Animated number counter that counts up from 0 when scrolled into view
 * - Full `prefers-reduced-motion` support
 */
export function QualityCounter({ qualities }: QualityCounterProps) {
	// Lazy initialiser so the first render on client already reflects the OS pref.
	const prefersReduced = useReducedMotion();
	const [visible, setVisible] = useState<boolean>(prefersReduced);
	const sectionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (prefersReduced) return;

		const el = sectionRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.08 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [prefersReduced]);

	return (
		<div
			ref={sectionRef}
			className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"
		>
			{qualities.map((q, cardIndex) => (
				<QualityCard
					key={q.title}
					quality={q}
					cardIndex={cardIndex}
					visible={visible}
					prefersReduced={prefersReduced}
				/>
			))}
		</div>
	);
}

/* ---- Individual card ---- */
function QualityCard({
	quality,
	cardIndex,
	visible,
	prefersReduced,
}: {
	quality: QualityItem;
	cardIndex: number;
	visible: boolean;
	prefersReduced: boolean;
}) {
	const targetNumber = quality.n + 1;
	const [displayNumber, setDisplayNumber] = useState<number>(
		prefersReduced ? targetNumber : 0,
	);
	const animationRef = useRef<number | null>(null);

	// Counter animation — driven by `visible` flag set by the parent IntersectionObserver.
	// When prefersReduced is true, displayNumber is already initialised to targetNumber
	// via the lazy useState initialiser, so we skip animation entirely.
	useEffect(() => {
		if (prefersReduced || !visible) return;

		// Stagger start based on card index
		const startDelay = cardIndex * 140 + 200;
		const duration = 1100;

		const timeoutId = setTimeout(() => {
			const start = performance.now();

			const tick = (now: number) => {
				const elapsed = now - start;
				const progress = Math.min(elapsed / duration, 1);
				// Ease-out cubic
				const eased = 1 - Math.pow(1 - progress, 3);
				setDisplayNumber(Math.round(eased * targetNumber));
				if (progress < 1) {
					animationRef.current = requestAnimationFrame(tick);
				}
			};

			animationRef.current = requestAnimationFrame(tick);
		}, startDelay);

		return () => {
			clearTimeout(timeoutId);
			if (animationRef.current !== null) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [visible, prefersReduced, targetNumber, cardIndex]);

	const easing = "cubic-bezier(0.25, 0.1, 0.25, 1)";
	const baseDelay = cardIndex * 120 + 80;

	const cardStyle: React.CSSProperties = prefersReduced
		? {}
		: {
				opacity: visible ? 1 : 0,
				transform: visible ? "translateY(0)" : "translateY(20px)",
				transition: `opacity 900ms ${easing} ${baseDelay}ms, transform 900ms ${easing} ${baseDelay}ms`,
			};

	return (
		<div
			className="group relative overflow-hidden bg-card p-6 transition-shadow duration-300 hover:shadow-md sm:p-8"
			style={cardStyle}
		>
			{/* Hover accent line at top */}
			<div
				className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				aria-hidden="true"
			/>

			{/* Animated number */}
			<p
				className="font-display text-4xl font-light text-accent/60 tabular-nums transition-colors duration-300 group-hover:text-accent/90 sm:text-5xl"
				aria-label={`Punkt ${targetNumber}`}
			>
				{String(displayNumber).padStart(2, "0")}
			</p>

			<h3 className="mt-3 text-sm font-semibold uppercase tracking-wider text-foreground">
				{quality.title}
			</h3>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{quality.description}</p>
		</div>
	);
}

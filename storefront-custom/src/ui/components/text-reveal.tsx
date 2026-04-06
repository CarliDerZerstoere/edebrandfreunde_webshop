"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// ScrollTrigger and SplitText must be imported to ensure plugin registration
void ScrollTrigger;

interface TextRevealProps {
	children: ReactNode;
	/** HTML tag to render as. Default "h2". */
	as?: "h1" | "h2" | "h3" | "p" | "span";
	className?: string;
	/** Stagger between each word in seconds. Default 0.06. */
	stagger?: number;
	/** Animation duration in seconds. Default 0.8. */
	duration?: number;
	/** Delay before the animation starts (scroll-triggered mode). Default 0. */
	delay?: number;
	/** Animate immediately without waiting for scroll (use for hero headings). */
	immediate?: boolean;
	/** Additional delay in seconds when using immediate mode. Default 0. */
	immediateDelay?: number;
}

/**
 * Reveals heading text word-by-word using GSAP SplitText.
 *
 * Each word is clipped inside its own mask so the slide-up stays sharp
 * with no overflow visible. Supports both scroll-triggered and immediate
 * (hero) modes. Respects `prefers-reduced-motion`.
 */
export function TextReveal({
	children,
	as: Tag = "h2",
	className,
	stagger = 0.06,
	duration = 0.8,
	delay = 0,
	immediate = false,
	immediateDelay = 0,
}: TextRevealProps) {
	const ref = useRef<HTMLElement>(null);
	const prefersReduced = useReducedMotion();

	useEffect(() => {
		const el = ref.current;
		if (!el || prefersReduced) return;

		const ctx = gsap.context(() => {
			const split = SplitText.create(el, {
				type: "words",
				mask: "words",
			});

			const animProps: gsap.TweenVars = {
				yPercent: 0,
				duration,
				ease: "power4.out",
				stagger,
				onComplete: () => split.revert(),
			};

			gsap.set(split.words, { yPercent: 105 });

			if (immediate) {
				gsap.to(split.words, { ...animProps, delay: immediateDelay });
			} else {
				gsap.to(split.words, {
					...animProps,
					delay,
					scrollTrigger: {
						trigger: el,
						start: "top 82%",
						once: true,
					},
				});
			}
		});

		return () => ctx.revert();
	}, [prefersReduced, stagger, duration, delay, immediate, immediateDelay]);

	return (
		// @ts-expect-error — dynamic tag assignment; Tag is a controlled union type
		<Tag ref={ref} className={className}>
			{children}
		</Tag>
	);
}

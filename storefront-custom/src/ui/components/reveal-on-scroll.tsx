"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger as _ST } from "@/lib/gsap";
// ScrollTrigger must be imported to register the plugin — used by gsap.fromTo scrollTrigger config
void _ST;
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Animation variant:
 *   "fade-up"    — opacity + translateY (default)
 *   "fade-scale" — opacity + scale 0.95→1 + translateY (cinematic headings)
 *   "fade-blur"  — opacity + blur 6px→0 (body text coming into focus)
 *   "scrub-up"   — scroll-proportional fade+slide (Awwwards signature)
 *   "clip-wipe"  — clipPath wipe from left to right (hard edge reveal)
 */
export type RevealVariant = "fade-up" | "fade-scale" | "fade-blur" | "scrub-up" | "clip-wipe";

interface RevealOnScrollProps {
	children: React.ReactNode;
	/** Delay in seconds before the animation starts once in view */
	delay?: number;
	/** Animation duration in milliseconds */
	duration?: number;
	/** Distance in pixels the element slides up from */
	slideDistance?: number;
	/** Extra className on the wrapper */
	className?: string;
	/** Semantic tag to render as */
	as?: "div" | "section" | "article" | "aside" | "span";
	/** Animation variant */
	variant?: RevealVariant;
}

/**
 * GSAP ScrollTrigger-powered reveal animation.
 *
 * Fades and slides (and optionally scales/blurs) content into view
 * as it enters the viewport. Uses power4.out easing for a premium
 * cinematic deceleration.
 *
 * Fully respects `prefers-reduced-motion`.
 */
export function RevealOnScroll({
	children,
	delay = 0,
	duration = 1000,
	slideDistance = 28,
	className = "",
	as: Tag = "div",
	variant = "fade-up",
}: RevealOnScrollProps) {
	const ref = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();

	useEffect(() => {
		if (prefersReduced) return;

		const el = ref.current;
		if (!el) return;

		// Set initial hidden state immediately to prevent FOUC
		gsap.set(el, getFromVars(variant, slideDistance));

		const ctx = gsap.context(() => {
			if (variant === "scrub-up") {
				// Scroll-proportional animation — driven by scroll position
				gsap.fromTo(el, getFromVars(variant, slideDistance), {
					...getToVars(variant),
					ease: "none",
					scrollTrigger: {
						trigger: el,
						start: "top 92%",
						end: "top 55%",
						scrub: 0.8,
					},
				});
			} else if (variant === "clip-wipe") {
				// Hard-edge clipPath wipe — no opacity/y involved
				gsap.set(el, { clipPath: "inset(0 100% 0 0)" });
				gsap.to(el, {
					clipPath: "inset(0 0% 0 0)",
					duration: 1.1,
					ease: "power3.inOut",
					scrollTrigger: {
						trigger: el,
						start: "top 80%",
						once: true,
					},
				});
			} else {
				// Standard triggered animation — plays once when in view
				gsap.fromTo(el, getFromVars(variant, slideDistance), {
					...getToVars(variant),
					duration: duration / 1000,
					delay: delay / 1000,
					ease: "power4.out",
					scrollTrigger: {
						trigger: el,
						start: "top 85%",
						once: true,
					},
				});
			}
		});

		return () => ctx.revert();
	}, [prefersReduced, variant, slideDistance, duration, delay]);

	const El = Tag as React.ElementType;
	return (
		<El ref={ref} className={className}>
			{children}
		</El>
	);
}

/* ---- From/To variable builders ---- */

function getFromVars(variant: RevealVariant, slideDistance: number): gsap.TweenVars {
	switch (variant) {
		case "fade-scale":
			return { opacity: 0, y: slideDistance, scale: 0.95, visibility: "visible" };
		case "fade-blur":
			return { opacity: 0, y: slideDistance * 0.6, filter: "blur(6px)", visibility: "visible" };
		case "scrub-up":
			return { opacity: 0, y: 50, scale: 0.97, visibility: "visible" };
		case "clip-wipe":
			// Initial state is set inside the context block via gsap.set; nothing to do here
			return {};
		default: // fade-up
			return { opacity: 0, y: slideDistance, visibility: "visible" };
	}
}

function getToVars(variant: RevealVariant): gsap.TweenVars {
	switch (variant) {
		case "fade-scale":
			return { opacity: 1, y: 0, scale: 1, clearProps: "willChange" };
		case "fade-blur":
			return { opacity: 1, y: 0, filter: "blur(0px)", clearProps: "willChange,filter" };
		case "scrub-up":
			return { opacity: 1, y: 0, scale: 1 };
		case "clip-wipe":
			// Animation is driven directly inside the context block; this branch is never reached
			return { clipPath: "inset(0 0% 0 0)", clearProps: "clipPath" };
		default: // fade-up
			return { opacity: 1, y: 0, clearProps: "willChange" };
	}
}

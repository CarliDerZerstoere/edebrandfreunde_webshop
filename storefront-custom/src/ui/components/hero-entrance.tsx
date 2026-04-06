"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

interface HeroEntranceProps {
	/** CMS-driven headline — editable in Saleor Dashboard → Content → Pages → landing-hero */
	title: string;
	/** CMS-driven tagline — editable in Saleor Dashboard → Content → Pages → landing-hero */
	tagline: string;
}

/**
 * Client component that handles the animated hero entrance using GSAP timeline.
 *
 * Animation sequence (power4.out easing):
 *   0.00s — logo scales in
 *   0.18s — title slides up
 *   0.30s — subtitle slides up
 *   0.40s — divider expands
 *   0.52s — tagline fades in
 *   0.68s — CTA button rises
 *   1.10s — scroll indicator appears
 */
export function HeroEntrance({ title, tagline }: HeroEntranceProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();

	useLayoutEffect(() => {
		if (prefersReduced) return;

		const container = containerRef.current;
		if (!container) return;

		// Set all elements hidden before animation
		const elements = container.querySelectorAll("[data-hero-anim]");
		gsap.set(elements, { opacity: 0, y: 28 });
		gsap.set(container.querySelector(".hero-logo"), { opacity: 0, scale: 0.88, y: 0 });
		gsap.set(container.querySelector(".hero-divider"), { opacity: 0, scaleX: 0.3, y: 0 });
		gsap.set(container.querySelector(".hero-scroll"), { opacity: 0, y: 0 });

		const ctx = gsap.context(() => {
			const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

			tl.to(".hero-logo", {
				opacity: 1,
				scale: 1,
				duration: 1.0,
			})
				.to(
					".hero-title",
					{ opacity: 1, y: 0, duration: 0.95 },
					0.18,
				)
				.to(
					".hero-subtitle",
					{ opacity: 0.4, y: 0, duration: 0.95 },
					0.30,
				)
				.to(
					".hero-divider",
					{ opacity: 1, scaleX: 1, duration: 0.85 },
					0.40,
				)
				.to(
					".hero-tagline",
					{ opacity: 0.7, y: 0, duration: 0.95 },
					0.52,
				)
				.to(
					".hero-cta",
					{ opacity: 1, y: 0, duration: 0.95 },
					0.68,
				)
				.to(
					".hero-scroll",
					{ opacity: 0.45, duration: 1.0 },
					1.10,
				);
		}, container);

		return () => ctx.revert();
	}, [prefersReduced]);

	return (
		<div ref={containerRef} className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-28 lg:py-44">
			{/* Logo */}
			<div className="hero-logo mx-auto mb-10">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src="/logo-edelbrandfreunde.png"
					alt="Edelbrandfreunde Logo"
					width={120}
					height={120}
					className="mx-auto invert mix-blend-screen"
				/>
			</div>

			{/* Headline — CMS editable via landing-hero page title */}
			<h1
				className="hero-title font-display font-semibold leading-[1.05] tracking-tight"
				data-hero-anim
				style={{ fontSize: "clamp(3rem, 8vw, 10rem)" }}
			>
				{title}
			</h1>

			{/* Static brand subtitle */}
			<p
				className="hero-subtitle mt-4 font-display text-lg italic tracking-wide sm:text-xl"
				data-hero-anim
			>
				Abfindungsbrennerei &middot; Niederösterreich
			</p>

			{/* Decorative divider */}
			<div className="hero-divider mx-auto mt-8 flex w-24 origin-center items-center gap-3">
				<div className="h-px flex-1 bg-accent/40" />
				<div className="h-1.5 w-1.5 rotate-45 bg-accent/60" />
				<div className="h-px flex-1 bg-accent/40" />
			</div>

			{/* Tagline — CMS editable via landing-hero page content */}
			<p
				className="hero-tagline mx-auto mt-8 max-w-xl whitespace-pre-line text-lg leading-relaxed"
				data-hero-anim
			>
				{tagline}
			</p>

			{/* CTA */}
			<div className="hero-cta mt-12" data-hero-anim>
				<LinkWithChannel
					href="/products"
					className="btn-sweep group inline-flex items-center gap-3 rounded bg-accent px-8 py-3.5 text-sm font-medium uppercase tracking-widest text-accent-foreground transition-all duration-300 hover:tracking-[0.2em]"
				>
					Zum Shop
					<span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
						&rarr;
					</span>
				</LinkWithChannel>
			</div>

			{/* Scroll indicator */}
			<div className="hero-scroll mt-16 flex flex-col items-center gap-2" aria-hidden="true">
				<p className="text-[9px] font-medium uppercase tracking-[0.25em] text-primary-foreground/60">
					Entdecken
				</p>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					className="h-5 w-5 text-accent"
					style={{ animation: prefersReduced ? "none" : "scroll-bounce 2s cubic-bezier(0.45, 0, 0.55, 1) infinite" }}
				>
					<path
						fillRule="evenodd"
						d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
						clipRule="evenodd"
					/>
				</svg>
			</div>
		</div>
	);
}

"use client";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface MarqueeBannerProps {
	/**
	 * Array of text items to display in the ticker.
	 * Each entry is rendered separated by a decorative diamond bullet.
	 */
	items?: string[];
	/** How many seconds for one full loop of the text track */
	speed?: number;
	/** Optional additional className on the outer wrapper */
	className?: string;
}

const DEFAULT_ITEMS = [
	"Handgemacht",
	"Niederösterreich",
	"Abfindungsbrennerei",
	"Seit 2024",
	"100% Naturrein",
	"Kupferkessel",
	"Handverlesene Früchte",
	"Österreichische Qualität",
];

/* ---- Sub-components defined outside render scope ---- */

function BulletSeparator() {
	return (
		<span
			className="mx-6 inline-block h-[3px] w-[3px] rotate-45 bg-accent/70 align-middle"
			aria-hidden="true"
		/>
	);
}

function TrackItem({ label }: { label: string }) {
	return (
		<span className="inline-flex items-center whitespace-nowrap">
			<span className="font-display text-[10px] font-medium uppercase tracking-[0.25em] text-accent/80 sm:text-xs">
				{label}
			</span>
			<BulletSeparator />
		</span>
	);
}

function TrackItems({ items }: { items: string[] }) {
	return (
		<>
			{items.map((item, i) => (
				<TrackItem key={i} label={item} />
			))}
		</>
	);
}

/**
 * An infinite horizontal marquee / ticker that scrolls brand messaging
 * slowly across the full width of the screen.
 *
 * Respects `prefers-reduced-motion` — when the preference is set the
 * items are simply displayed in a static centred row instead.
 */
export function MarqueeBanner({
	items = DEFAULT_ITEMS,
	speed = 38,
	className = "",
}: MarqueeBannerProps) {
	const prefersReduced = useReducedMotion();

	if (prefersReduced) {
		return (
			<div
				className={`border-y border-border bg-secondary/60 py-3 ${className}`}
				aria-label="Markenbotschaft"
			>
				<p className="flex flex-wrap items-center justify-center gap-x-0 gap-y-1 text-center">
					<TrackItems items={items} />
				</p>
			</div>
		);
	}

	return (
		<div
			className={`overflow-hidden border-y border-border bg-secondary/60 py-3 ${className}`}
			aria-label="Markenbotschaft"
		>
			{/*
			 * The track is duplicated so the seam is invisible.
			 * marquee-scroll keyframe is defined in globals.css.
			 * It translates -50% so the duplicate seamlessly fills the gap.
			 */}
			<div
				className="flex"
				style={{
					animation: `marquee-scroll ${speed}s linear infinite`,
					width: "max-content",
				}}
			>
				<span>
					<TrackItems items={items} />
				</span>
				<span aria-hidden="true">
					<TrackItems items={items} />
				</span>
			</div>
		</div>
	);
}

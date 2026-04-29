"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SCENES, type SceneId } from "./scenes";
import "./pixel-story.css";

interface StepCopy {
	id: SceneId;
	label: string;
	description: string;
}

const STEPS: StepCopy[] = [
	{
		id: "ernte",
		label: "Ernte",
		description:
			"Vollreifes Obst — Marillen, Birnen, Quitten — wird von Hand gepflückt oder als Fallobst sorgfältig aufgelesen.",
	},
	{
		id: "maische",
		label: "Maische",
		description:
			"Das Obst wird zerkleinert und mit Kulturhefe in einem Gärfass eingemaischt. Die Gärung dauert 10 bis 20 Tage.",
	},
	{
		id: "brennen",
		label: "Brennen",
		description:
			"Im Kupferkessel steigen Alkohol- und Aromadämpfe auf, kondensieren im Kühler und tropfen als Rohbrand heraus.",
	},
	{
		id: "reife",
		label: "Reife",
		description:
			"Der Brand ruht in Glasballons oder Holzfässern. Über Monate und Jahre wird er milder, runder, harmonischer.",
	},
	{
		id: "abfuellung",
		label: "Abfüllung",
		description:
			"Auf Trinkstärke verdünnt, gefiltert und in Glasflaschen abgefüllt — bereit für den Genuss.",
	},
];

const AUTOPLAY_MS = 5000;

export function PixelStoryWidget() {
	const [current, setCurrent] = useState(0);
	const [paused, setPaused] = useState(false);
	const prefersReduced = useReducedMotion();
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const goTo = useCallback((index: number) => {
		setCurrent(((index % STEPS.length) + STEPS.length) % STEPS.length);
	}, []);
	const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
	const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

	// Auto-play — pauses on hover/focus and respects reduced motion.
	useEffect(() => {
		if (prefersReduced || paused) return;
		intervalRef.current = setInterval(() => {
			setCurrent((c) => (c + 1) % STEPS.length);
		}, AUTOPLAY_MS);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [prefersReduced, paused]);

	// Keyboard navigation when widget is focused
	useEffect(() => {
		const node = containerRef.current;
		if (!node) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") {
				e.preventDefault();
				goNext();
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				goPrev();
			} else if (e.key === " " || e.key === "Enter") {
				if (e.target === node) {
					e.preventDefault();
					setPaused((p) => !p);
				}
			}
		};
		node.addEventListener("keydown", handler);
		return () => node.removeEventListener("keydown", handler);
	}, [goNext, goPrev]);

	// Touch swipe
	const touchStartX = useRef<number | null>(null);
	const handleTouchStart = (e: React.TouchEvent) => {
		touchStartX.current = e.touches[0].clientX;
	};
	const handleTouchEnd = (e: React.TouchEvent) => {
		if (touchStartX.current === null) return;
		const dx = touchStartX.current - e.changedTouches[0].clientX;
		if (dx > 40) goNext();
		else if (dx < -40) goPrev();
		touchStartX.current = null;
	};

	const step = STEPS[current];

	return (
		<div
			ref={containerRef}
			className="pixel-story flex flex-col items-center gap-8 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg"
			tabIndex={0}
			role="region"
			aria-label={`Herstellungsprozess Schritt ${current + 1} von ${STEPS.length}: ${step.label}`}
			aria-live="polite"
			aria-atomic="true"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			<div className="pixel-story-canvas">
				{STEPS.map((s, i) => (
					<div
						key={s.id}
						className="pixel-story-frame"
						data-scene={s.id}
						data-active={i === current}
						style={
							{
								"--scene-shadow": SCENES[s.id].shadow,
							} as React.CSSProperties
						}
						role="img"
						aria-label={SCENES[s.id].fallback}
						aria-hidden={i !== current}
					>
						<SceneOverlays scene={s.id} active={i === current} />
					</div>
				))}
			</div>

			{/* Step copy */}
			<div className="text-center max-w-md">
				<p className="text-xs font-semibold tracking-[0.22em] uppercase text-accent">
					{`0${current + 1}`.slice(-2)} · {step.label}
				</p>
				<p className="mt-3 text-base leading-relaxed text-muted-foreground">
					{step.description}
				</p>
			</div>

			{/* Dot navigation */}
			<nav aria-label="Herstellungsprozess Navigation" className="mt-1">
				<ul className="flex gap-3">
					{STEPS.map((s, i) => (
						<li key={s.id}>
							<button
								type="button"
								onClick={() => goTo(i)}
								aria-label={`Schritt ${i + 1}: ${s.label}`}
								aria-current={i === current ? "step" : undefined}
								className={[
									"h-2 rounded-full transition-all duration-300",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
									i === current
										? "w-7 bg-accent"
										: "w-2 bg-muted-foreground/40 hover:bg-muted-foreground",
								].join(" ")}
							/>
						</li>
					))}
				</ul>
			</nav>
		</div>
	);
}

function SceneOverlays({ scene, active }: { scene: SceneId; active: boolean }) {
	if (!active) return null;
	switch (scene) {
		case "ernte":
			return <span className="pixel-overlay pixel-fruit-fall" aria-hidden="true" />;
		case "maische":
			return (
				<>
					<span className="pixel-overlay pixel-bubble b1" aria-hidden="true" />
					<span className="pixel-overlay pixel-bubble b2" aria-hidden="true" />
					<span className="pixel-overlay pixel-bubble b3" aria-hidden="true" />
				</>
			);
		case "brennen":
			return (
				<>
					<span className="pixel-overlay pixel-steam-a" aria-hidden="true" />
					<span className="pixel-overlay pixel-steam-b" aria-hidden="true" />
					<span className="pixel-overlay pixel-drop" aria-hidden="true" />
					<span className="pixel-overlay pixel-drop d2" aria-hidden="true" />
				</>
			);
		case "reife":
			return null;
		case "abfuellung":
			return (
				<>
					<span className="pixel-overlay pixel-pour" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf2" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf3" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf4" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf5" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf6" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf7" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf8" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf9" aria-hidden="true" />
					<span className="pixel-overlay pixel-glass-fill gf10" aria-hidden="true" />
				</>
			);
	}
	return null;
}

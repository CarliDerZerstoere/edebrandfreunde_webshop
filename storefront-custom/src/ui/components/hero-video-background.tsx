"use client";

import { useRef, useCallback, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
void ScrollTrigger;

interface HeroVideoBackgroundProps {
	sources: string[];
}

const PLAYBACK_RATE = 0.75;
const CROSSFADE_MS = 1000;

export function HeroVideoBackground({ sources }: HeroVideoBackgroundProps) {
	const videoARef = useRef<HTMLVideoElement>(null);
	const videoBRef = useRef<HTMLVideoElement>(null);
	const activeRef = useRef<"a" | "b">("a");
	const nextIndexRef = useRef(1);
	const transitioningRef = useRef(false);
	const timersRef = useRef<number[]>([]);
	const prefersReduced = useReducedMotion();

	const singleVideo = sources.length <= 1;

	const trackTimeout = useCallback((fn: () => void, ms: number) => {
		const id = window.setTimeout(fn, ms);
		timersRef.current.push(id);
		return id;
	}, []);

	const clearAllTimers = useCallback(() => {
		timersRef.current.forEach((id) => window.clearTimeout(id));
		timersRef.current = [];
	}, []);

	useEffect(() => {
		const videoA = videoARef.current;
		if (!videoA) return;

		clearAllTimers();
		activeRef.current = "a";
		nextIndexRef.current = 1;
		transitioningRef.current = false;

		videoA.src = sources[0];
		videoA.load();
		videoA.playbackRate = PLAYBACK_RATE;
		videoA.style.opacity = "0";

		const showAndPlay = () => {
			videoA.play().catch(() => {});
			videoA.style.opacity = "1";
		};

		if (videoA.readyState >= 3) {
			showAndPlay();
		} else {
			videoA.addEventListener("canplay", showAndPlay, { once: true });
		}

		const videoB = videoBRef.current;
		if (!singleVideo && videoB) {
			videoB.style.opacity = "0";
			videoB.src = sources[1 % sources.length];
			videoB.load();
			videoB.playbackRate = PLAYBACK_RATE;
		}

		return () => {
			videoA.removeEventListener("canplay", showAndPlay);
			clearAllTimers();
		};
	}, [sources, singleVideo, clearAllTimers]);

	const crossfade = useCallback(() => {
		if (transitioningRef.current) return;
		transitioningRef.current = true;

		const isA = activeRef.current === "a";
		const outgoing = isA ? videoARef.current : videoBRef.current;
		const incoming = isA ? videoBRef.current : videoARef.current;
		if (!incoming || !outgoing) {
			transitioningRef.current = false;
			return;
		}

		const doFade = () => {
			incoming.playbackRate = PLAYBACK_RATE;
			incoming.play().catch(() => {});
			incoming.style.opacity = "1";
			outgoing.style.opacity = "0";
			activeRef.current = isA ? "b" : "a";

			trackTimeout(() => {
				outgoing.pause();
				nextIndexRef.current = (nextIndexRef.current + 1) % sources.length;
				outgoing.src = sources[nextIndexRef.current];
				outgoing.load();
				outgoing.playbackRate = PLAYBACK_RATE;
				transitioningRef.current = false;
			}, CROSSFADE_MS + 300);
		};

		if (incoming.readyState >= 3) {
			doFade();
		} else {
			incoming.addEventListener("canplay", doFade, { once: true });
			trackTimeout(() => {
				if (transitioningRef.current) {
					incoming.removeEventListener("canplay", doFade);
					doFade();
				}
			}, 4000);
		}
	}, [sources, trackTimeout]);

	const handleTimeUpdate = useCallback(
		(e: React.SyntheticEvent<HTMLVideoElement>) => {
			if (transitioningRef.current) return;
			const video = e.currentTarget;
			const timeLeft = video.duration - video.currentTime;
			if (timeLeft > 0 && timeLeft <= 1.5) {
				crossfade();
			}
		},
		[crossfade],
	);

	const handleEnded = useCallback(() => {
		if (!transitioningRef.current) crossfade();
	}, [crossfade]);

	// Parallax: video scrolls at ~60% speed for depth effect
	const containerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = containerRef.current;
		if (!el || prefersReduced) return;
		const section = el.closest("section");
		if (!section) return;

		const ctx = gsap.context(() => {
			gsap.to(el, {
				yPercent: 15,
				ease: "none",
				scrollTrigger: {
					trigger: section,
					start: "top top",
					end: "bottom top",
					scrub: 1.5,
				},
			});
		});
		return () => ctx.revert();
	}, [prefersReduced]);

	if (prefersReduced || sources.length === 0) return null;

	const videoStyle = {
		filter: "blur(6px)",
		transform: "scale(1.1)",
		opacity: 0,
		transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
	};

	return (
		<div ref={containerRef} className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
			<video
				ref={videoARef}
				muted
				playsInline
				loop={singleVideo}
				onTimeUpdate={singleVideo ? undefined : handleTimeUpdate}
				onEnded={singleVideo ? undefined : handleEnded}
				preload="auto"
				className="absolute inset-0 h-full w-full object-cover"
				style={videoStyle}
			/>
			{!singleVideo && (
				<video
					ref={videoBRef}
					muted
					playsInline
					onTimeUpdate={handleTimeUpdate}
					onEnded={handleEnded}
					preload="auto"
					className="absolute inset-0 h-full w-full object-cover"
					style={videoStyle}
				/>
			)}
			<div className="absolute inset-0 bg-black/50" />
		</div>
	);
}

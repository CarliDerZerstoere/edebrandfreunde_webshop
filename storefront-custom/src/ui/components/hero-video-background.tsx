"use client";

import { useRef, useCallback, useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface HeroVideoBackgroundProps {
	sources: string[];
}

const PLAYBACK_RATE = 0.75;
const CROSSFADE_MS = 1000;

/**
 * Double-buffered video background with crossfade transitions.
 *
 * Key fixes vs. previous version:
 * - Videos only fade in AFTER canplay fires (no flash of unloaded frame)
 * - Overlay uses bg-black instead of bg-primary (no green flash)
 * - Container is always visible (no ready-state gating) — black overlay
 *   covers everything until video is ready, then video fades in smoothly
 */
export function HeroVideoBackground({ sources }: HeroVideoBackgroundProps) {
	const videoARef = useRef<HTMLVideoElement>(null);
	const videoBRef = useRef<HTMLVideoElement>(null);
	const activeRef = useRef<"a" | "b">("a");
	const nextIndexRef = useRef(1);
	const transitioningRef = useRef(false);
	const prefersReduced = useReducedMotion();

	const singleVideo = sources.length <= 1;

	// On mount (including SPA re-navigation): reset and start playback
	useEffect(() => {
		const videoA = videoARef.current;
		if (!videoA) return;

		// Reset state
		activeRef.current = "a";
		nextIndexRef.current = 1;
		transitioningRef.current = false;

		// Prepare slot A — hidden until loaded
		videoA.src = sources[0];
		videoA.load();
		videoA.playbackRate = PLAYBACK_RATE;
		videoA.style.opacity = "0";

		// Fade in only when video can actually play
		const showAndPlay = () => {
			videoA.play().catch(() => {});
			videoA.style.opacity = "1";
		};

		if (videoA.readyState >= 3) {
			showAndPlay();
		} else {
			videoA.addEventListener("canplay", showAndPlay, { once: true });
		}

		// Preload slot B
		const videoB = videoBRef.current;
		if (!singleVideo && videoB) {
			videoB.style.opacity = "0";
			videoB.src = sources[1 % sources.length];
			videoB.load();
			videoB.playbackRate = PLAYBACK_RATE;
		}

		return () => {
			videoA.removeEventListener("canplay", showAndPlay);
		};
	}, [sources, singleVideo]);

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

		incoming.playbackRate = PLAYBACK_RATE;

		// Only start the crossfade when the incoming video is ready
		const doFade = () => {
			incoming.play().catch(() => {});
			incoming.style.opacity = "1";
			outgoing.style.opacity = "0";

			activeRef.current = isA ? "b" : "a";

			// After CSS transition: pause outgoing, preload next into it
			setTimeout(() => {
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
			// Safety: if video never loads, don't block forever
			setTimeout(() => {
				if (transitioningRef.current) {
					incoming.removeEventListener("canplay", doFade);
					doFade();
				}
			}, 4000);
		}
	}, [sources]);

	// Trigger crossfade 1.5s before video ends (accounts for slower playback rate)
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

	// Fallback if timeupdate missed the window
	const handleEnded = useCallback(() => {
		if (!transitioningRef.current) crossfade();
	}, [crossfade]);

	if (prefersReduced || sources.length === 0) return null;

	return (
		<div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
			{/* Slot A */}
			<video
				ref={videoARef}
				autoPlay
				muted
				playsInline
				loop={singleVideo}
				onTimeUpdate={singleVideo ? undefined : handleTimeUpdate}
				onEnded={singleVideo ? undefined : handleEnded}
				preload="auto"
				className="absolute inset-0 h-full w-full object-cover"
				style={{
					filter: "blur(6px)",
					transform: "scale(1.1)",
					opacity: 0,
					transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
				}}
			>
				<source src={sources[0]} type="video/mp4" />
			</video>

			{/* Slot B */}
			{!singleVideo && (
				<video
					ref={videoBRef}
					muted
					playsInline
					onTimeUpdate={handleTimeUpdate}
					onEnded={handleEnded}
					preload="auto"
					className="absolute inset-0 h-full w-full object-cover"
					style={{
						filter: "blur(6px)",
						transform: "scale(1.1)",
						opacity: 0,
						transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
					}}
				/>
			)}

			{/* Dark overlay — black-based to avoid green flash between transitions */}
			<div className="absolute inset-0 bg-black/50" />
		</div>
	);
}

"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

/**
 * Premium Age Gate Modal for edelbrandfreunde.at.
 * 
 * Elegant overlay that checks localStorage on client mount.
 * Implemented using the brand's signature cream parchment, forest green, and copper tokens.
 * Complies with Austrian youth protection laws without blocking SEO indexing.
 */
export function AgeGate() {
	const [mounted, setMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		setMounted(true);
		const isVerified = localStorage.getItem("age-verified");
		if (isVerified !== "true") {
			setIsVisible(true);
			// Prevent body scroll while age gate is active
			document.body.style.overflow = "hidden";
		}
	}, []);

	const handleConfirm = () => {
		localStorage.setItem("age-verified", "true");
		setIsVisible(false);
		// Restore body scrolling
		document.body.style.overflow = "";
	};

	const handleDeny = () => {
		// Redirect underage users to Austrian search portal
		window.location.href = "https://www.google.at";
	};

	if (!mounted || !isVisible) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md transition-opacity duration-500 animate-fade-in">
			{/* Aged Parchment Modal Box using .welcome-paper styling */}
			<div 
				className="welcome-paper relative mx-4 w-full max-w-md overflow-hidden rounded-xl border border-copper/30 p-8 shadow-2xl text-center md:p-10"
				role="dialog"
				aria-modal="true"
				aria-labelledby="age-gate-title"
			>
				{/* Noise Overlay & Deckle Edge inherit from .welcome-paper */}
				
				{/* Inner content wrapper to sit above background effects */}
				<div className="relative z-10 flex flex-col items-center">
					{/* Brand Logo / Header Accent */}
					<div className="flex flex-col items-center gap-1.5">
						<span 
							className="h-1.5 w-1.5 rotate-45 bg-accent/80" 
							aria-hidden="true" 
						/>
						<p className="welcome-eyebrow font-display text-xs font-semibold uppercase tracking-[0.3em]">
							Abfindungsbrennerei
						</p>
					</div>

					{/* Title */}
					<h2 
						id="age-gate-title"
						className="mt-6 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
					>
						Altersnachweis
					</h2>

					{/* Divider */}
					<div className="my-5 h-[1px] w-16 bg-copper/30" />

					{/* Description */}
					<p className="text-sm leading-relaxed text-foreground/80 font-sans px-2">
						Unser Webshop bietet erlesene österreichische Edelbrände und Liköre. 
						Um unsere Spezialitäten zu entdecken, bestätigen Sie bitte Ihre Volljährigkeit.
					</p>

					{/* Notice about shipping validation */}
					<div className="mt-5 flex items-start gap-2.5 rounded-md border border-copper/25 bg-copper-subtle/10 p-3.5 text-left text-[11px] leading-relaxed text-foreground/75">
						<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
						<p>
							<strong>Hinweis:</strong> Abgabe nur an Personen über 18 Jahren. 
							Wir prüfen das Alter bei der Auslieferung durch eine Altersprüfung (ID-Check) beim Paketdienst.
						</p>
					</div>

					{/* Buttons */}
					<div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
						<button
							type="button"
							onClick={handleConfirm}
							className="flex-1 rounded-md bg-accent hover:bg-accent-hover px-5 py-3 text-sm font-semibold tracking-wider uppercase text-accent-foreground shadow-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
						>
							Ja, ich bin 18+
						</button>
						<button
							type="button"
							onClick={handleDeny}
							className="flex-1 rounded-md border border-foreground/30 hover:bg-foreground/5 px-5 py-3 text-sm font-medium tracking-wide text-foreground transition-all duration-200 active:scale-[0.98]"
						>
							Nein, ich bin unter 18
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

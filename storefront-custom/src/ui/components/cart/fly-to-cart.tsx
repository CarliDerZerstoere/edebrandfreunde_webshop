"use client";

import { createContext, useContext, useRef, useCallback, type ReactNode, type RefObject } from "react";
import { gsap } from "@/lib/gsap";

interface FlyToCartContextType {
	cartIconRef: RefObject<HTMLElement | null>;
	flyToCart: (sourceEl: HTMLElement) => void;
}

const FlyToCartContext = createContext<FlyToCartContextType | undefined>(undefined);

export function FlyToCartProvider({ children }: { children: ReactNode }) {
	const cartIconRef = useRef<HTMLElement | null>(null);

	const flyToCart = useCallback((sourceEl: HTMLElement) => {
		// Primary: use the registered CartButton ref.
		// Fallback: query the DOM directly (handles the case where CartButton
		// hasn't registered yet, e.g. Suspense boundary still loading).
		const target = cartIconRef.current ?? (document.querySelector("[data-testid='CartNavItem']") as HTMLElement | null);
		if (!target) {
			if (process.env.NODE_ENV === "development") {
				console.warn("[fly-to-cart] cartIconRef is null — CartButton not mounted yet");
			}
			return;
		}
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const sourceRect = sourceEl.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();

		// Create flying clone
		const clone = document.createElement("div");
		clone.style.cssText = `
			position: fixed;
			z-index: 9998;
			top: ${sourceRect.top}px;
			left: ${sourceRect.left}px;
			width: ${Math.min(sourceRect.width, 120)}px;
			height: ${Math.min(sourceRect.height, 120)}px;
			border-radius: 12px;
			overflow: hidden;
			pointer-events: none;
			box-shadow: 0 8px 32px rgba(0,0,0,0.2);
		`;

		const img = sourceEl.querySelector("img");
		if (img) {
			const imgClone = img.cloneNode(true) as HTMLImageElement;
			imgClone.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
			clone.appendChild(imgClone);
		} else {
			clone.style.background = "var(--secondary)";
		}

		document.body.appendChild(clone);

		const endX = targetRect.left + targetRect.width / 2 - sourceRect.left - Math.min(sourceRect.width, 120) / 2;
		const endY = targetRect.top + targetRect.height / 2 - sourceRect.top - Math.min(sourceRect.height, 120) / 2;

		// Two-phase arc: first curve up and toward cart, then arrive and shrink
		// Phase 1 covers 40% of horizontal distance and 60% of vertical distance,
		// with an extra -80px upward kick to create the arc shape.
		const tl = gsap.timeline({ onComplete: () => clone.remove() });

		tl.to(clone, {
			x: endX * 0.4,
			y: endY * 0.6 - 80,
			width: 64,
			height: 64,
			borderRadius: "50%",
			duration: 0.4,
			ease: "power2.out",
		})
		.to(clone, {
			x: endX,
			y: endY,
			width: 24,
			height: 24,
			opacity: 0,
			duration: 0.35,
			ease: "power3.in",
		});
	}, []);

	return (
		<FlyToCartContext.Provider value={{ cartIconRef, flyToCart }}>
			{children}
		</FlyToCartContext.Provider>
	);
}

export function useFlyToCart() {
	const context = useContext(FlyToCartContext);
	if (!context) {
		throw new Error("useFlyToCart must be used within a FlyToCartProvider");
	}
	return context;
}

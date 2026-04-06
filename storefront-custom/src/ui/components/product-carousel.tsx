"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { ProductImageWrapper } from "@/ui/atoms/product-image-wrapper";
import { type ProductListItemFragment } from "@/gql/graphql";
import { formatMoneyRange } from "@/lib/utils";

interface ProductCarouselProps {
	products: readonly ProductListItemFragment[];
}

/**
 * A horizontally scrollable product carousel with:
 * - CSS scroll-snap for crisp item alignment
 * - Left / right navigation arrows on desktop (keyboard accessible)
 * - Native touch/swipe support via overflow-x: scroll
 * - Hover image zoom + overlay details
 * - Respects `prefers-reduced-motion` for scroll behaviour
 */
export function ProductCarousel({ products }: ProductCarouselProps) {
	const scrollRef = useRef<HTMLUListElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);
	// Lazy initialiser reads media query once during first render on client.
	const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	});

	// Keep preference in sync if the user changes it at runtime.
	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	const updateScrollState = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 4);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		updateScrollState();
		el.addEventListener("scroll", updateScrollState, { passive: true });
		const ro = new ResizeObserver(updateScrollState);
		ro.observe(el);
		return () => {
			el.removeEventListener("scroll", updateScrollState);
			ro.disconnect();
		};
	}, [updateScrollState]);

	const scrollBy = useCallback(
		(direction: "left" | "right") => {
			const el = scrollRef.current;
			if (!el) return;
			// Scroll by ~80% of visible width so the user keeps context
			const amount = el.clientWidth * 0.82;
			el.scrollBy({
				left: direction === "left" ? -amount : amount,
				behavior: prefersReduced ? "auto" : "smooth",
			});
		},
		[prefersReduced],
	);

	if (products.length === 0) return null;

	return (
		<div className="group/carousel relative">
			{/* ---- Left arrow ---- */}
			<button
				onClick={() => scrollBy("left")}
				disabled={!canScrollLeft}
				aria-label="Vorherige Produkte"
				className={[
					"absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-1/2",
					"hidden h-10 w-10 items-center justify-center rounded-full",
					"border border-border bg-card/95 shadow-lg backdrop-blur-sm",
					"text-foreground transition-all duration-300",
					"hover:border-accent hover:bg-accent hover:text-accent-foreground",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					"disabled:pointer-events-none disabled:opacity-0",
					"lg:flex",
					// Reveal on hover of the whole carousel block
					"opacity-0 group-hover/carousel:opacity-100",
					canScrollLeft ? "" : "!opacity-0",
				].join(" ")}
			>
				<ChevronLeft />
			</button>

			{/* ---- Scroll track ---- */}
			<ul
				ref={scrollRef}
				role="list"
				data-testid="ProductCarousel"
				className={[
					"flex gap-4 overflow-x-auto pb-4 sm:gap-5",
					// Scroll snap
					"snap-x snap-mandatory",
					// Hide scrollbar on webkit, keep functionality
					"scrollbar-hide",
					// Padding so first/last cards aren't clipped by the arrows
					"px-1",
				].join(" ")}
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
				{products.map((product, index) => (
					<CarouselCard key={product.id} product={product} index={index} />
				))}
			</ul>

			{/* ---- Right arrow ---- */}
			<button
				onClick={() => scrollBy("right")}
				disabled={!canScrollRight}
				aria-label="Nächste Produkte"
				className={[
					"absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2",
					"hidden h-10 w-10 items-center justify-center rounded-full",
					"border border-border bg-card/95 shadow-lg backdrop-blur-sm",
					"text-foreground transition-all duration-300",
					"hover:border-accent hover:bg-accent hover:text-accent-foreground",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					"disabled:pointer-events-none disabled:opacity-0",
					"lg:flex",
					"opacity-0 group-hover/carousel:opacity-100",
					canScrollRight ? "" : "!opacity-0",
				].join(" ")}
			>
				<ChevronRight />
			</button>

			{/* ---- Scroll-position dots (mobile) ---- */}
			<ScrollDots products={products} scrollRef={scrollRef} />
		</div>
	);
}

/* ============================================================
 * Individual card
 * ============================================================ */
function CarouselCard({
	product,
	index,
}: {
	product: ProductListItemFragment;
	index: number;
}) {
	const price = formatMoneyRange({
		start: product.pricing?.priceRange?.start?.gross,
		stop: product.pricing?.priceRange?.stop?.gross,
	});

	return (
		<li
			className={[
				// Snap alignment
				"snap-start",
				// Card dimensions: ~80vw on mobile, fixed on desktop
				"w-[72vw] flex-shrink-0 sm:w-64 lg:w-72",
			].join(" ")}
		>
			<LinkWithChannel href={`/products/${product.slug}`} prefetch={false}>
				<div className="group relative flex flex-col">
					{/* Image wrapper with hover effects */}
					<div className="relative overflow-hidden rounded-lg">
						{product.thumbnail?.url ? (
							<>
								<ProductImageWrapper
									src={product.thumbnail.url}
									alt={product.thumbnail.alt ?? product.name}
									width={400}
									height={533}
									sizes="(max-width: 640px) 72vw, 288px"
									loading={index < 3 ? "eager" : "lazy"}
									priority={index < 2}
									className="transition-transform duration-700 group-hover:scale-105"
								/>
								{/* Hover overlay */}
								<div className="absolute inset-0 flex items-end bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
									<div className="w-full p-4">
										<span className="inline-block rounded border border-accent-foreground/40 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-accent-foreground">
											Jetzt ansehen
										</span>
									</div>
								</div>
							</>
						) : (
							<div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-secondary text-4xl">
								&#9830;
							</div>
						)}

						{/* Category badge */}
						{product.category?.name && (
							<div className="absolute left-3 top-3">
								<span className="inline-block rounded bg-primary/80 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary-foreground backdrop-blur-sm">
									{product.category.name}
								</span>
							</div>
						)}
					</div>

					{/* Text */}
					<div className="mt-3 flex items-start justify-between gap-2">
						<div className="min-w-0">
							<h3 className="truncate text-sm font-semibold text-foreground group-hover:text-accent transition-colors duration-200">
								{product.name}
							</h3>
							{product.category?.name && (
								<p className="mt-0.5 text-xs text-muted-foreground">{product.category.name}</p>
							)}
						</div>
						<p className="shrink-0 text-sm font-semibold text-foreground">{price}</p>
					</div>
				</div>
			</LinkWithChannel>
		</li>
	);
}

/* ============================================================
 * Scroll-position dot indicators (mobile visual aid)
 * ============================================================ */
function ScrollDots({
	products,
	scrollRef,
}: {
	products: readonly ProductListItemFragment[];
	scrollRef: React.RefObject<HTMLUListElement | null>;
}) {
	const [activeIndex, setActiveIndex] = useState(0);
	// Show only up to 8 dots to avoid clutter
	const dotCount = Math.min(products.length, 8);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const handler = () => {
			const progress = el.scrollLeft / (el.scrollWidth - el.clientWidth);
			setActiveIndex(Math.round(progress * (dotCount - 1)));
		};
		el.addEventListener("scroll", handler, { passive: true });
		return () => el.removeEventListener("scroll", handler);
	}, [scrollRef, dotCount]);

	if (dotCount < 2) return null;

	return (
		<div className="mt-4 flex items-center justify-center gap-1.5 lg:hidden" aria-hidden="true">
			{Array.from({ length: dotCount }).map((_, i) => (
				<button
					key={i}
					onClick={() => {
						const el = scrollRef.current;
						if (!el) return;
						const target = (i / (dotCount - 1)) * (el.scrollWidth - el.clientWidth);
						el.scrollTo({ left: target, behavior: "smooth" });
					}}
					className={[
						"rounded-full transition-all duration-300",
						i === activeIndex
							? "h-1.5 w-5 bg-accent"
							: "h-1.5 w-1.5 bg-border hover:bg-muted-foreground",
					].join(" ")}
				/>
			))}
		</div>
	);
}

/* ============================================================
 * SVG chevron icons
 * ============================================================ */
function ChevronLeft() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			className="h-4 w-4"
			aria-hidden="true"
		>
			<path
				fillRule="evenodd"
				d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
				clipRule="evenodd"
			/>
		</svg>
	);
}

function ChevronRight() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			className="h-4 w-4"
			aria-hidden="true"
		>
			<path
				fillRule="evenodd"
				d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
				clipRule="evenodd"
			/>
		</svg>
	);
}

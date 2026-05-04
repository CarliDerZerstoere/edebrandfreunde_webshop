"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { ProductImageWrapper } from "@/ui/atoms/product-image-wrapper";
import { type ProductListItemFragment } from "@/gql/graphql";
import { formatMoneyRange } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface ProductCarouselProps {
	products: readonly ProductListItemFragment[];
}

/**
 * Horizontal product carousel powered by Embla Carousel.
 *
 * Why Embla instead of CSS scroll-snap: iOS Safari has known issues
 * with `scroll-snap-type` inside ancestors that use `overflow: clip`,
 * which left some cards unreachable on mobile. Embla handles touch
 * gestures purely in JS and works reliably across all mobile browsers.
 */
export function ProductCarousel({ products }: ProductCarouselProps) {
	const prefersReduced = useReducedMotion();
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: "start",
		containScroll: "trimSnaps",
		dragFree: false,
		duration: prefersReduced ? 0 : 25,
		watchDrag: true,
	});

	const [canScrollPrev, setCanScrollPrev] = useState(false);
	const [canScrollNext, setCanScrollNext] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
		setCanScrollPrev(emblaApi.canScrollPrev());
		setCanScrollNext(emblaApi.canScrollNext());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		setScrollSnaps(emblaApi.scrollSnapList());
		onSelect();
		emblaApi.on("select", onSelect);
		emblaApi.on("reInit", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
			emblaApi.off("reInit", onSelect);
		};
	}, [emblaApi, onSelect]);

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
	const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

	if (products.length === 0) return null;

	return (
		<div className="group/carousel relative">
			{/* ---- Left arrow (desktop only) ---- */}
			<button
				type="button"
				onClick={scrollPrev}
				disabled={!canScrollPrev}
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
					"opacity-0 group-hover/carousel:opacity-100",
					canScrollPrev ? "" : "!opacity-0",
				].join(" ")}
			>
				<ChevronLeft />
			</button>

			{/* ---- Embla viewport ---- */}
			<div ref={emblaRef} className="overflow-hidden">
				<ul role="list" data-testid="ProductCarousel" className="flex gap-4 sm:gap-5">
					{products.map((product, index) => (
						<CarouselCard key={product.id} product={product} index={index} />
					))}
				</ul>
			</div>

			{/* ---- Right arrow (desktop only) ---- */}
			<button
				type="button"
				onClick={scrollNext}
				disabled={!canScrollNext}
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
					canScrollNext ? "" : "!opacity-0",
				].join(" ")}
			>
				<ChevronRight />
			</button>

			{/* ---- Dots (mobile) ---- */}
			{scrollSnaps.length > 1 && (
				<div className="mt-4 flex items-center justify-center gap-1.5 lg:hidden" aria-hidden="true">
					{scrollSnaps.map((_, i) => (
						<button
							key={i}
							type="button"
							onClick={() => scrollTo(i)}
							className={[
								"rounded-full transition-all duration-300",
								i === selectedIndex
									? "h-1.5 w-5 bg-accent"
									: "h-1.5 w-1.5 bg-border hover:bg-muted-foreground",
							].join(" ")}
						/>
					))}
				</div>
			)}
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
		<li className="min-w-0 flex-[0_0_72%] sm:flex-[0_0_16rem] lg:flex-[0_0_18rem]">
			<LinkWithChannel href={`/products/${product.slug}`} prefetch={false}>
				<div className="group relative flex flex-col">
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

						{product.category?.name && (
							<div className="absolute left-3 top-3">
								<span className="inline-block rounded bg-primary/80 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary-foreground backdrop-blur-sm">
									{product.category.name}
								</span>
							</div>
						)}
					</div>

					<div className="mt-3 flex items-start justify-between gap-2">
						<div className="min-w-0">
							<h3 className="truncate text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-accent">
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

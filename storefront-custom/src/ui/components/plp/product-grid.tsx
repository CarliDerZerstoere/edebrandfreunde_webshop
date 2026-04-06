"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ProductCard, type ProductCardData } from "./product-card";
import { TiltCard } from "./tilt-card";

interface ProductGridProps {
	products: ProductCardData[];
}

export function ProductGrid({ products }: ProductGridProps) {
	const gridRef = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();
	const hasAnimated = useRef(false);

	useEffect(() => {
		const grid = gridRef.current;
		if (!grid || prefersReduced || hasAnimated.current) return;

		const cards = grid.children;
		if (cards.length === 0) return;

		hasAnimated.current = true;

		const ctx = gsap.context(() => {
			gsap.set(cards, { opacity: 0, y: 24, scale: 0.97 });

			gsap.to(cards, {
				opacity: 1,
				y: 0,
				scale: 1,
				duration: 0.55,
				ease: "power3.out",
				stagger: {
					amount: 0.5,
					from: "edges",
				},
				clearProps: "opacity,transform",
			});
		});

		return () => ctx.revert();
	}, [products, prefersReduced]);

	return (
		<div ref={gridRef} className="grid w-full grid-cols-2 gap-5 lg:grid-cols-3 lg:gap-8">
			{products.map((product, index) => (
				<TiltCard key={product.id}>
					<ProductCard product={product} priority={index < 3} />
				</TiltCard>
			))}
		</div>
	);
}

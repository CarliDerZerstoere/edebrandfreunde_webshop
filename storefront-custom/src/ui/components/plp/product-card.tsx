"use client";

import type React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Loader2, Check } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Badge } from "@/ui/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProductCardData {
	id: string;
	name: string;
	slug: string;
	brand?: string | null;
	price: number;
	compareAtPrice?: number | null;
	currency: string;
	image: string;
	imageAlt?: string;
	hoverImage?: string | null;
	href: string;
	badge?: string | null;
	colors?: { name: string; hex: string }[];
	sizes?: string[];
	category?: { id: string; name: string; slug: string } | null;
	createdAt?: string | null;
	hasVariants?: boolean;
	abv?: string | null;
	volume?: string | null;
	/** Short variety/fruit descriptor from "sorte" attribute */
	variety?: string | null;
	/** Harvest year from "jahrgang" attribute */
	vintage?: string | null;
	firstVariantId?: string | null;
	onQuickAdd?: (productId: string, variantId: string) => void;
	/** Quick-add button state: idle → pending → success → idle */
	quickAddState?: "idle" | "pending" | "success";
}

interface ProductCardProps {
	product: ProductCardData;
	priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
	const canQuickAdd = !product.hasVariants && product.onQuickAdd;

	const handleQuickAdd = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (product.firstVariantId) {
			product.onQuickAdd?.(product.id, product.firstVariantId);
		}
	};

	const formatPrice = (amount: number, currency: string) => {
		return new Intl.NumberFormat("de-AT", {
			style: "currency",
			currency: currency,
		}).format(amount);
	};

	return (
		<article className="group card-lift">
			<Link href={product.href} className="block">
				{/* Image Container */}
				<div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary">
					{/* Primary Image */}
					<Image
						src={product.image}
						alt={product.imageAlt || product.name}
						fill
						sizes="(max-width: 1024px) 50vw, 33vw"
						className={cn(
							"object-cover transition-all duration-[400ms] ease-out md:group-hover:scale-105",
							product.hoverImage && "md:group-hover:opacity-0",
						)}
						priority={priority}
					/>

					{/* Hover Image - desktop only to avoid double-tap on touch */}
					{product.hoverImage && (
						<Image
							src={product.hoverImage}
							alt={`${product.name} - Alternativansicht`}
							fill
							sizes="(max-width: 1024px) 50vw, 33vw"
							className="object-cover opacity-0 transition-all duration-500 ease-out md:group-hover:scale-105 md:group-hover:opacity-100"
						/>
					)}

					{/* Badge */}
					{product.badge && (
						<Badge
							variant={product.badge === "Aktion" ? "destructive" : "default"}
							className="absolute left-3 top-3"
						>
							{product.badge}
						</Badge>
					)}

					{/* Quick Add Overlay - desktop only */}
					{canQuickAdd && (
						<div className="absolute bottom-0 left-0 right-0 hidden translate-y-2 p-3 opacity-0 transition-all duration-300 md:block md:group-hover:translate-y-0 md:group-hover:opacity-100">
							<Button
								className={cn(
									"w-full transition-all duration-300",
									product.quickAddState === "success" && "bg-accent hover:bg-accent",
								)}
								size="sm"
								onClick={handleQuickAdd}
								type="button"
								disabled={product.quickAddState === "pending"}
							>
								<span className="relative flex items-center justify-center gap-1.5">
									{product.quickAddState === "pending" && (
										<Loader2 className="h-4 w-4 animate-spin" />
									)}
									{product.quickAddState === "success" && (
										<Check className="h-4 w-4 animate-[scale-in_0.3s_ease-out]" />
									)}
									{(!product.quickAddState || product.quickAddState === "idle") && (
										<Plus className="h-4 w-4" />
									)}
									<span>
										{product.quickAddState === "pending"
											? "Wird hinzugefügt…"
											: product.quickAddState === "success"
												? "Hinzugefügt!"
												: "In den Warenkorb"}
									</span>
								</span>
							</Button>
						</div>
					)}
				</div>

				{/* Product Info */}
				<div className="mt-5 space-y-2.5">
					{product.brand && <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.brand}</p>}
					<h3 className="line-clamp-2 font-semibold leading-snug transition-colors duration-300 md:group-hover:text-accent">
						{product.name}
					</h3>

					{/* Variety + Vintage — short descriptor line */}
					{(product.variety || product.vintage) && (
						<p className="text-xs italic text-muted-foreground">
							{[product.variety, product.vintage && `Jahrgang ${product.vintage}`].filter(Boolean).join(" · ")}
						</p>
					)}

					{(product.abv || product.volume) && (
						<p className="text-xs text-muted-foreground">
							{[product.abv && `${product.abv}% vol.`, product.volume].filter(Boolean).join(" · ")}
						</p>
					)}

					{/* Color Swatches */}
					{product.colors && product.colors.length > 1 && (
						<div className="flex items-center gap-1.5 pt-1">
							{product.colors.slice(0, 4).map((color) => (
								<span
									key={color.name}
									className="h-4 w-4 rounded-full border border-border"
									style={{ backgroundColor: color.hex }}
									title={color.name}
								/>
							))}
							{product.colors.length > 4 && (
								<span className="ml-0.5 text-xs text-muted-foreground">+{product.colors.length - 4}</span>
							)}
						</div>
					)}

					{/* Price */}
					<div className="flex items-center gap-2 pt-1">
						<span className="text-base font-semibold" style={{ color: "var(--copper)" }}>{formatPrice(product.price, product.currency)}</span>
						{product.compareAtPrice && (
							<span className="text-sm text-muted-foreground line-through">
								{formatPrice(product.compareAtPrice, product.currency)}
							</span>
						)}
					</div>
				</div>
			</Link>
		</article>
	);
}

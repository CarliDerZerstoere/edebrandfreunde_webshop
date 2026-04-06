"use client";

import { Suspense, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { FilterBar, ProductGrid, useProductFilters, type ProductCardData } from "@/ui/components/plp";
import { Pagination } from "@/ui/components/pagination";
import { PaginationSkeleton } from "@/ui/components/pagination-skeleton";
import { useCart } from "@/ui/components/cart/cart-context";
import { quickAddToCart } from "@/ui/components/plp/actions";

interface ProductsPageClientProps {
	products: ProductCardData[];
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		startCursor?: string | null;
		endCursor?: string | null;
	};
	totalCount?: number;
	resolvedCategories?: Array<{ slug: string; id: string; name: string }>;
	cmsPriceRanges?: { value: string; label: string; count: number }[] | null;
}

export function ProductsPageClient({ products, pageInfo, resolvedCategories = [], cmsPriceRanges }: ProductsPageClientProps) {
	const params = useParams();
	const channel = params.channel as string;
	const { openCart } = useCart();
	// Track add-to-cart state per product: idle → pending → success → idle
	const [addingStates, setAddingStates] = useState<Record<string, "pending" | "success">>({});

	const handleQuickAdd = useCallback(
		async (productId: string, variantId: string) => {
			setAddingStates((prev) => ({ ...prev, [productId]: "pending" }));

			const result = await quickAddToCart(channel, variantId);

			if (result.success) {
				setAddingStates((prev) => ({ ...prev, [productId]: "success" }));
				// Show checkmark for 1.5s, then open cart and reset
				setTimeout(() => {
					openCart();
					setAddingStates((prev) => {
						const next = { ...prev };
						delete next[productId];
						return next;
					});
				}, 1200);
			} else {
				setAddingStates((prev) => {
					const next = { ...prev };
					delete next[productId];
					return next;
				});
			}
		},
		[channel, openCart],
	);

	const {
		filteredProducts,
		categoryOptions,
		colorOptions,
		sizeOptions,
		priceRanges: _unusedPriceRanges,
		selectedCategories,
		selectedColors,
		selectedSizes,
		selectedPriceRange,
		sortValue,
		activeFilters,
		handleCategoryToggle,
		handleColorToggle,
		handleSizeToggle,
		handlePriceRangeChange,
		handleSortChange,
		handleRemoveFilter,
		handleClearFilters,
	} = useProductFilters({
		products,
		resolvedCategories,
		enableCategoryFilter: true,
	});

	// Only show price ranges if configured in CMS (no fallback)
	const priceRanges = cmsPriceRanges && cmsPriceRanges.length > 0 ? cmsPriceRanges : [];

	const enrichedProducts = filteredProducts.map((p) => ({
		...p,
		onQuickAdd: !p.hasVariants && p.firstVariantId ? handleQuickAdd : undefined,
		quickAddState: (addingStates[p.id] ?? "idle") as "idle" | "pending" | "success",
	}));

	return (
		<>
			<FilterBar
				resultCount={filteredProducts.length}
				sortValue={sortValue}
				onSortChange={handleSortChange}
				categoryOptions={categoryOptions}
				colorOptions={colorOptions}
				sizeOptions={sizeOptions}
				priceRanges={priceRanges}
				selectedCategories={selectedCategories}
				selectedColors={selectedColors}
				selectedSizes={selectedSizes}
				selectedPriceRange={selectedPriceRange}
				onCategoryToggle={handleCategoryToggle}
				onColorToggle={handleColorToggle}
				onSizeToggle={handleSizeToggle}
				onPriceRangeChange={handlePriceRangeChange}
				activeFilters={activeFilters}
				onRemoveFilter={handleRemoveFilter}
				onClearFilters={handleClearFilters}
			/>
			<div className="w-full">
				<div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 lg:px-8 lg:pt-14">
					{enrichedProducts.length > 0 ? (
						<ProductGrid products={enrichedProducts} />
					) : (
						<div className="py-12 text-center">
							<p className="text-lg text-muted-foreground">Keine Produkte gefunden.</p>
							<button
								onClick={handleClearFilters}
								className="mt-4 text-sm font-medium text-foreground underline underline-offset-4"
							>
								Alle Filter zurücksetzen
							</button>
						</div>
					)}
					<Suspense fallback={<PaginationSkeleton />}>
						<Pagination pageInfo={pageInfo} />
					</Suspense>
				</div>
			</div>
		</>
	);
}

import type { ProductListItemFragment } from "@/gql/graphql";
import type { ProductCardData } from "./product-card";
import { getColorHex, isColorAttribute, isSizeAttribute } from "@/lib/colors";
import { sortSizes } from "@/lib/sizes";
import { localeConfig } from "@/config/locale";
import { hasDiscountInPriceRange } from "@/lib/pricing";

/**
 * Extract colors from product variants
 */
function extractColorsFromVariants(
	variants: ProductListItemFragment["variants"],
): { name: string; hex: string }[] {
	const colorSet = new Map<string, string>();

	variants?.forEach((variant) => {
		variant.selectionAttributes?.forEach((attr) => {
			if (isColorAttribute(attr.attribute?.slug ?? "")) {
				attr.values?.forEach((value) => {
					const colorName = value.name;
					if (colorName && !colorSet.has(colorName)) {
						const hex = getColorHex(value) ?? "#6b7280"; // Default gray if no match
						colorSet.set(colorName, hex);
					}
				});
			}
		});
	});

	return Array.from(colorSet.entries()).map(([name, hex]) => ({ name, hex }));
}

/**
 * Extract sizes from product variants
 */
function extractSizesFromVariants(variants: ProductListItemFragment["variants"]): string[] {
	const sizeSet = new Set<string>();

	variants?.forEach((variant) => {
		variant.selectionAttributes?.forEach((attr) => {
			if (isSizeAttribute(attr.attribute?.slug ?? "")) {
				attr.values?.forEach((value) => {
					if (value.name) {
						sizeSet.add(value.name);
					}
				});
			}
		});
	});

	// Sort sizes in logical order (S, M, L, XL or numeric)
	return sortSizes(Array.from(sizeSet));
}

/**
 * Transform Saleor product data to ProductCard format
 */
export function transformToProductCard(product: ProductListItemFragment, channel: string): ProductCardData {
	const startPrice = product.pricing?.priceRange?.start?.gross;
	const undiscountedStartPrice = product.pricing?.priceRangeUndiscounted?.start?.gross;

	// Use centralized pricing logic to detect if ANY variant is on sale
	const isSale = hasDiscountInPriceRange(
		product.pricing?.priceRange,
		product.pricing?.priceRangeUndiscounted,
	);

	// Extract colors and sizes from variants
	const colors = extractColorsFromVariants(product.variants);
	const sizes = extractSizesFromVariants(product.variants);

	// Extract ABV from product attributes
	const abvAttr = product.attributes?.find((a) => a.attribute.slug === "alkoholgehalt");
	const abv = abvAttr?.values?.[0]?.name ?? null;

	// Extract Volume from product attributes
	const volumeAttr = product.attributes?.find((a) => a.attribute.slug === "inhalt");
	const volume = volumeAttr?.values?.[0]?.name ?? null;

	// Extract variety (Sorte) from product attributes
	const varietyAttr = product.attributes?.find((a) => a.attribute.slug === "sorte");
	const variety = varietyAttr?.values?.[0]?.name ?? null;

	// Extract vintage (Jahrgang) from product attributes
	const vintageAttr = product.attributes?.find((a) => a.attribute.slug === "jahrgang");
	const vintage = vintageAttr?.values?.[0]?.name ?? null;

	// Extract badge from product metadata (e.g. "Bestseller", "Limitiert", "Destillata Gold")
	const badgeMeta = product.metadata?.find((m) => m.key === "badge");
	const metadataBadge = badgeMeta?.value ?? null;

	// Hover image from second media item
	const hoverImage = product.media && product.media.length > 1 ? product.media[1].url : null;

	const hasVariants = (product.variants?.length ?? 0) > 1;

	return {
		id: product.id,
		name: product.name,
		slug: product.slug,
		brand: product.category?.name ?? null,
		price: startPrice?.amount ?? 0,
		compareAtPrice: isSale ? undiscountedStartPrice?.amount : null,
		currency: startPrice?.currency ?? localeConfig.fallbackCurrency,
		image: product.thumbnail?.url ?? "/placeholder.svg",
		imageAlt: product.thumbnail?.alt ?? product.name,
		hoverImage,
		href: `/${channel}/products/${product.slug}`,
		badge: isSale ? "Aktion" : metadataBadge,
		colors,
		sizes,
		abv,
		volume,
		variety,
		vintage,
		category: product.category
			? { id: product.category.id, name: product.category.name, slug: product.category.slug }
			: null,
		createdAt: product.created,
		hasVariants,
		firstVariantId: !hasVariants ? product.variants?.[0]?.id ?? null : null,
	};
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: string): string {
	return new Intl.NumberFormat(localeConfig.default, {
		style: "currency",
		currency: currency,
	}).format(amount);
}

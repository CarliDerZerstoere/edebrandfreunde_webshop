import { Suspense } from "react";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { ErrorBoundary } from "react-error-boundary";
import edjsHTML from "editorjs-html";
import xss from "xss";

import { executePublicGraphQL } from "@/lib/graphql";
import { ProductDetailsDocument, LandingPageContentDocument, type ProductDetailsQuery } from "@/gql/graphql";
import { parseEditorJSToText } from "@/lib/editorjs";
import { buildPageMetadata, buildProductJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/ui/components/breadcrumbs";
import {
	ProductGallery,
	ProductAttributes,
	VariantSectionDynamic,
	VariantSectionSkeleton,
	VariantSectionError,
} from "@/ui/components/pdp";

// ============================================================================
// Cached Data Fetching
// ============================================================================

async function getProductData(slug: string, channel: string) {
	const result = await executePublicGraphQL(ProductDetailsDocument, {
		variables: {
			slug: decodeURIComponent(slug),
			channel,
		},
		revalidate: 300,
	});

	if (!result.ok) {
		console.error(`[getProductData] Failed to fetch product ${slug} for ${channel}:`, result.error.message);
		return null;
	}

	return result.data.product;
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata(props: {
	params: Promise<{ slug: string; channel: string }>;
}): Promise<Metadata> {
	const params = await props.params;
	const product = await getProductData(params.slug, params.channel);

	if (!product) {
		return { title: "Produkt nicht gefunden" };
	}

	const description = product.seoDescription || product.name;
	const ogImage = product.media?.[0]?.url || product.thumbnail?.url;
	const priceAmount = product.pricing?.priceRange?.start?.gross?.amount;
	const priceCurrency = product.pricing?.priceRange?.start?.gross?.currency;

	return buildPageMetadata({
		title: product.seoTitle || product.name,
		description,
		image: ogImage,
		url: `/${params.channel}/products/${encodeURIComponent(params.slug)}`,
		openGraph:
			priceAmount && priceCurrency
				? {
						"product:price:amount": String(priceAmount),
						"product:price:currency": priceCurrency,
					}
				: undefined,
	});
}

// NOTE: generateStaticParams is intentionally omitted for product pages.
// All product pages are generated on-demand via ISR instead.

// ============================================================================
// Page Component
// ============================================================================

const parser = edjsHTML();

/**
 * Sync page shell with dedicated Suspense boundary.
 * All cached product data + dynamic variant section stream inside
 * this boundary, not through the layout's main Suspense.
 */
export default function ProductPage(props: {
	params: Promise<{ slug: string; channel: string }>;
	searchParams: Promise<{ variant?: string }>;
}) {
	return (
		<Suspense fallback={<ProductPageSkeleton />}>
			<ProductContent params={props.params} searchParams={props.searchParams} />
		</Suspense>
	);
}

async function ProductContent({
	params: paramsPromise,
	searchParams: searchParamsPromise,
}: {
	params: Promise<{ slug: string; channel: string }>;
	searchParams: Promise<{ variant?: string }>;
}) {
	const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);

	const [product, trustBarResult] = await Promise.all([
		getProductData(params.slug, params.channel),
		executePublicGraphQL(LandingPageContentDocument, {
			variables: { slug: "pdp-trust-signals" },
			revalidate: 3600,
		}),
	]);

	if (!product) {
		notFound();
	}

	// Parse CMS trust signals (pipe-separated)
	const trustBarText = trustBarResult.ok && trustBarResult.data.page
		? parseEditorJSToText(trustBarResult.data.page.content)
		: null;
	const trustSignals = trustBarText ? trustBarText.split("|").map((s: string) => s.trim()).filter(Boolean) : [];

	// Extract volume in ml from product attribute for per-serving calculation
	const volumeAttr = product.attributes?.find((a) => a.attribute.slug === "inhalt")?.values?.[0]?.name;
	const volumeMl = volumeAttr ? parseVolumeMl(volumeAttr) : null;

	const variants = product.variants || [];
	const selectedVariantId = searchParams.variant || (variants.length === 1 ? variants[0].id : undefined);
	const selectedVariant = variants.find((v) => v.id === selectedVariantId);

	const descriptionHtml = parseDescription(product.description);
	const images = getGalleryImages(product, selectedVariant);
	const productAttributes = extractProductAttributes(product);
	const careInstructions = extractCareInstructions(product);
	const spiritMeta = extractSpiritMetadata(product);

	const breadcrumbs = [
		{ label: "Startseite", href: `/${params.channel}` },
		...(product.category
			? [{ label: product.category.name, href: `/${params.channel}/categories/${product.category.slug}` }]
			: []),
		{ label: product.name },
	];

	const productJsonLd = buildProductJsonLd({
		name: product.name,
		description: product.seoDescription || product.name,
		images: images.length > 0 ? images.map((img) => img.url) : undefined,
		brand: product.category?.name,
		url: `/${params.channel}/products/${product.slug}`,
		priceRange: product.pricing?.priceRange?.start?.gross
			? {
					lowPrice: product.pricing.priceRange.start.gross.amount,
					highPrice:
						product.pricing.priceRange.stop?.gross?.amount || product.pricing.priceRange.start.gross.amount,
					currency: product.pricing.priceRange.start.gross.currency,
				}
			: null,
		inStock: product.variants?.some((v) => v.quantityAvailable) ?? false,
		variantCount: product.variants?.length ?? 0,
	});

	const lcpImageUrl = images[0]?.url;

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{lcpImageUrl && <link rel="preload" as="image" href={lcpImageUrl} fetchPriority="high" />}

			{productJsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
				/>
			)}

			{/* div, not <main> — already inside the layout's <main>. A nested
			    <main> confuses document.querySelector("main") used by PageTransition. */}
			<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
				<div className="mb-6 hidden sm:block">
					<Breadcrumbs items={breadcrumbs} />
				</div>

				<div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
					<div className="lg:sticky lg:top-24 lg:self-start">
						<ProductGallery images={images} productName={product.name} />
					</div>

					<div className="flex flex-col gap-5">
						<h1 className="order-2 font-display text-balance text-4xl font-bold tracking-tight lg:text-5xl">
							{product.name}
						</h1>

						{/* Spirit metadata: ABV, Volume, Awards, Batch size */}
						{(spiritMeta.abv || spiritMeta.volume || spiritMeta.award || spiritMeta.batchSize) && (
							<div className="order-2 space-y-2">
								{(spiritMeta.abv || spiritMeta.volume) && (
									<p className="text-sm text-muted-foreground">
										{[spiritMeta.abv && `${spiritMeta.abv}% vol.`, spiritMeta.volume]
											.filter(Boolean)
											.join(" · ")}
									</p>
								)}
								{spiritMeta.award && (
									<p className="flex items-center gap-1.5 text-sm font-medium text-accent">
										<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
											<circle cx="12" cy="8" r="7" />
											<path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
										</svg>
										{spiritMeta.award}
									</p>
								)}
								{spiritMeta.batchSize && (
									<p className="text-xs text-muted-foreground">
										Kleine Auflage · {spiritMeta.batchSize} Flaschen
									</p>
								)}
							</div>
						)}

						<ErrorBoundary FallbackComponent={VariantSectionError}>
							<Suspense fallback={<VariantSectionSkeleton />}>
								<VariantSectionDynamic
									product={product}
									channel={params.channel}
									searchParams={searchParamsPromise}
									volumeMl={volumeMl}
									trustSignals={trustSignals}
								/>
							</Suspense>
						</ErrorBoundary>

						<div className="order-4 mt-6">
							<ProductAttributes
								descriptionHtml={descriptionHtml}
								attributes={productAttributes}
								careInstructions={careInstructions}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Skeleton
// ============================================================================

function ProductPageSkeleton() {
	return (
		<div className="flex min-h-screen animate-skeleton-delayed flex-col bg-background opacity-0">
			{/* div, not <main> — already inside the layout's <main>. */}
			<div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
				<div className="mb-6 hidden h-4 w-64 animate-pulse rounded bg-secondary sm:block" />
				<div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
					<div className="aspect-square animate-pulse rounded-lg bg-secondary" />
					<div className="flex flex-col gap-4">
						<div className="h-8 w-3/4 animate-pulse rounded bg-secondary" />
						<div className="h-6 w-24 animate-pulse rounded bg-secondary" />
						<div className="mt-4 space-y-3">
							<div className="h-10 w-full animate-pulse rounded bg-secondary" />
							<div className="h-10 w-full animate-pulse rounded bg-secondary" />
						</div>
						<div className="mt-4 h-12 w-full animate-pulse rounded bg-secondary" />
					</div>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseDescription(description: string | null | undefined): string[] | null {
	if (!description) return null;

	try {
		const parsed = parser.parse(JSON.parse(description));
		return parsed.map((html: string) => xss(html));
	} catch {
		return [xss(`<p>${description}</p>`)];
	}
}

function extractProductAttributes(product: NonNullable<ProductDetailsQuery["product"]>) {
	const variantAttributeSlugs = ["size", "color", "colour", "variant"];
	const internalAttributeSlugs = ["care-instructions", "care"];

	return (product.attributes || [])
		.filter((attr) => attr.attribute.name)
		.filter((attr) => !variantAttributeSlugs.includes((attr.attribute.slug ?? "").toLowerCase()))
		.filter((attr) => !internalAttributeSlugs.includes((attr.attribute.slug ?? "").toLowerCase()))
		.map((attr) => ({
			name: attr.attribute.name!,
			value:
				attr.values.length === 1
					? attr.values[0]?.name ?? ""
					: attr.values.map((v) => v.name ?? "").filter(Boolean),
		}))
		.filter((attr) => {
			if (Array.isArray(attr.value)) return attr.value.length > 0;
			return attr.value !== "";
		});
}

function extractCareInstructions(product: NonNullable<ProductDetailsQuery["product"]>): string | null {
	const careAttr = (product.attributes || []).find(
		(attr) =>
			attr.attribute.slug === "care-instructions" ||
			attr.attribute.slug === "care" ||
			(attr.attribute.name ?? "").toLowerCase().includes("care"),
	);

	return (
		careAttr?.values
			.map((v) => v.name)
			.filter(Boolean)
			.join(". ") || null
	);
}

/** Parse volume string like "0,7l", "0,5l", "350ml" to ml */
function parseVolumeMl(volume: string): number | null {
	const cleaned = volume.replace(/\s/g, "").toLowerCase();
	// Match "0,7l" or "0.7l"
	const literMatch = cleaned.match(/^(\d+[.,]\d+)\s*l$/);
	if (literMatch) return Math.round(parseFloat(literMatch[1].replace(",", ".")) * 1000);
	// Match "700ml" or "350ml"
	const mlMatch = cleaned.match(/^(\d+)\s*ml$/);
	if (mlMatch) return parseInt(mlMatch[1], 10);
	return null;
}

function extractSpiritMetadata(product: NonNullable<ProductDetailsQuery["product"]>) {
	const findAttr = (slug: string) =>
		product.attributes?.find((a) => a.attribute.slug === slug)?.values?.[0]?.name ?? null;
	const findMeta = (key: string) =>
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(product as any).metadata?.find?.((m: { key: string; value: string }) => m.key === key)?.value ?? null;

	return {
		abv: findAttr("alkoholgehalt"),
		volume: findAttr("inhalt"),
		award: findAttr("auszeichnungen") ?? findMeta("award"),
		batchSize: findAttr("abfuellmenge") ?? findMeta("batch_size"),
	};
}

type Product = NonNullable<ProductDetailsQuery["product"]>;
type Variant = NonNullable<Product["variants"]>[number];

function getGalleryImages(
	product: Product,
	selectedVariant: Variant | null | undefined,
): { url: string; alt: string | null | undefined }[] {
	if (selectedVariant?.media && selectedVariant.media.length > 0) {
		const variantImages = selectedVariant.media
			.filter((m) => m.type === "IMAGE")
			.map((m) => ({ url: m.url, alt: m.alt }));
		if (variantImages.length > 0) {
			return variantImages;
		}
	}

	if (product.media && product.media.length > 0) {
		return product.media.filter((m) => m.type === "IMAGE").map((m) => ({ url: m.url, alt: m.alt }));
	}

	if (product.thumbnail) {
		return [{ url: product.thumbnail.url, alt: product.thumbnail.alt }];
	}

	return [];
}

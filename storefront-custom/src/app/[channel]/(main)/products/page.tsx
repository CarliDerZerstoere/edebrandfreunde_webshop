import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductListPaginatedDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { getPaginatedListVariables } from "@/lib/utils";
import { transformToProductCard } from "@/ui/components/plp";
import { TrustBar } from "@/ui/components/plp/trust-bar";
import { buildSortVariables, buildFilterVariables } from "@/ui/components/plp/filter-utils";
import { resolveCategorySlugsToIds } from "@/ui/components/plp/filter-utils.server";
import { LandingPageContentDocument } from "@/gql/graphql";
import { parseEditorJSToText } from "@/lib/editorjs";
import { ProductsPageClient } from "./products-client";

export const metadata = {
	title: "Alle Produkte · Edelbrandfreunde",
	description: "Entdecke unser gesamtes Sortiment an handgemachten Edelbränden aus Niederösterreich.",
};

type PageProps = {
	params: Promise<{ channel: string }>;
	searchParams: Promise<{
		cursor?: string | string[];
		direction?: string | string[];
		sort?: string;
		price?: string;
		colors?: string;
		sizes?: string;
		categories?: string;
	}>;
};

/**
 * Products page with Cache Components.
 * Static shell (hero) renders immediately, product grid streams in.
 */
export default async function Page(props: PageProps) {
	const params = await props.params;

	const breadcrumbs = [
		{ label: "Startseite", href: `/${params.channel}` },
		{ label: "Alle Produkte", href: `/${params.channel}/products` },
	];

	// Fetch CMS content (hero, trust bar, price ranges) in parallel
	const [heroResult, trustBarResult, priceRangesResult, productCountResult] = await Promise.all([
		executePublicGraphQL(LandingPageContentDocument, {
			variables: { slug: "products-hero" },
			revalidate: 3600,
		}),
		executePublicGraphQL(LandingPageContentDocument, {
			variables: { slug: "products-trust-bar" },
			revalidate: 3600,
		}),
		executePublicGraphQL(LandingPageContentDocument, {
			variables: { slug: "products-price-ranges" },
			revalidate: 3600,
		}),
		executePublicGraphQL(ProductListPaginatedDocument, {
			variables: { first: 1, channel: params.channel },
			revalidate: 300,
		}),
	]);
	// Hero CMS content
	const heroPage = heroResult.ok ? heroResult.data.page : null;
	const heroTitle = heroPage?.title ?? "Unser Sortiment";
	const heroMotto = heroPage ? parseEditorJSToText(heroPage.content) : null;
	const productCount = productCountResult.ok ? productCountResult.data.products?.totalCount ?? 0 : 0;

	const trustBarText = trustBarResult.ok && trustBarResult.data.page
		? parseEditorJSToText(trustBarResult.data.page.content)
		: null;
	const trustSignals = trustBarText ? trustBarText.split("|").map((s: string) => s.trim()).filter(Boolean) : [];

	// Parse CMS price ranges: "0-30:Unter €30|30-50:€30 – €50|..."
	const priceRangesText = priceRangesResult.ok && priceRangesResult.data.page
		? parseEditorJSToText(priceRangesResult.data.page.content)
		: null;
	const cmsPriceRanges = priceRangesText
		? priceRangesText.split("|").map((entry: string) => {
				const [value, label] = entry.split(":").map((s) => s.trim());
				return value && label ? { value, label, count: 0 } : null;
			}).filter(Boolean) as { value: string; label: string; count: number }[]
		: null;

	return (
		<>
			{/* Dark Hero Band */}
			<section className="relative overflow-hidden bg-primary text-primary-foreground">
				{/* Film grain */}
				<div
					className="absolute inset-0 opacity-[0.03]"
					aria-hidden="true"
					style={{
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
					}}
				/>
				<div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
					{/* Breadcrumbs */}
					<nav className="mb-6 flex items-center gap-1.5 text-sm text-primary-foreground/50">
						{breadcrumbs.map((crumb, index) => (
							<span key={crumb.href} className="flex items-center gap-1.5">
								{index > 0 && <span className="text-primary-foreground/30">/</span>}
								{index === breadcrumbs.length - 1 ? (
									<span className="text-primary-foreground/70">{crumb.label}</span>
								) : (
									<a href={crumb.href} className="transition-colors hover:text-primary-foreground/80">{crumb.label}</a>
								)}
							</span>
						))}
					</nav>

					<div className="flex items-end justify-between gap-8">
						<div className="max-w-2xl">
							<h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
								{heroTitle}
							</h1>
							{heroMotto && (
								<p className="mt-4 text-lg leading-relaxed text-primary-foreground/60">
									{heroMotto}
								</p>
							)}
						</div>

						{/* Product count as visual accent */}
						{productCount > 0 && (
							<div className="hidden text-right lg:block">
								<span
									className="font-display text-7xl font-bold leading-none tracking-tight"
									style={{ color: "var(--copper)" }}
								>
									{productCount}
								</span>
								<p className="mt-1 text-sm tracking-wide text-primary-foreground/40">
									{productCount === 1 ? "Sorte" : "Sorten"}
								</p>
							</div>
						)}
					</div>
				</div>
			</section>
			<TrustBar signals={trustSignals} />
			<Suspense fallback={<ProductsGridSkeleton />}>
				<ProductsContent params={props.params} searchParams={props.searchParams} cmsPriceRanges={cmsPriceRanges} />
			</Suspense>
		</>
	);
}

/**
 * Dynamic products content - reads searchParams at request time.
 */
async function ProductsContent({
	params: paramsPromise,
	searchParams: searchParamsPromise,
	cmsPriceRanges,
}: {
	params: Promise<{ channel: string }>;
	searchParams: PageProps["searchParams"];
	cmsPriceRanges: { value: string; label: string; count: number }[] | null;
}) {
	const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);

	const paginationVariables = getPaginatedListVariables({ params: searchParams });
	const sortBy = buildSortVariables(searchParams.sort);

	// Parse category slugs from URL and resolve to IDs for server-side filtering
	const categorySlugs = searchParams.categories?.split(",").filter(Boolean) || [];
	const categoryMap = await resolveCategorySlugsToIds(categorySlugs);
	const categoryIds = Array.from(categoryMap.values()).map((c) => c.id);

	const filter = buildFilterVariables({
		priceRange: searchParams.price,
		categoryIds,
	});

	const result = await executePublicGraphQL(ProductListPaginatedDocument, {
		variables: {
			...paginationVariables,
			channel: params.channel,
			sortBy,
			filter,
		},
		revalidate: 300,
	});

	if (!result.ok || !result.data.products) {
		notFound();
	}

	const products = result.data.products;
	const productCards = products.edges.map((e) => transformToProductCard(e.node, params.channel));

	// Build resolved categories array for the client (for active filter display)
	const resolvedCategories = categorySlugs
		.map((slug) => {
			const cat = categoryMap.get(slug);
			return cat ? { slug, id: cat.id, name: cat.name } : null;
		})
		.filter(Boolean) as { slug: string; id: string; name: string }[];

	return (
		<ProductsPageClient
			products={productCards}
			pageInfo={products.pageInfo}
			totalCount={products.totalCount ?? productCards.length}
			resolvedCategories={resolvedCategories}
			cmsPriceRanges={cmsPriceRanges}
		/>
	);
}

/**
 * Products grid skeleton with delayed visibility.
 * Matches ProductGrid/ProductCard dimensions to prevent layout shift.
 */
function ProductsGridSkeleton() {
	return (
		<div className="mx-auto max-w-7xl animate-skeleton-delayed px-4 pt-10 pb-8 opacity-0 sm:px-6 lg:px-8 lg:pt-14">
			<div className="grid grid-cols-2 gap-5 lg:grid-cols-3 lg:gap-8">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i}>
						<div className="aspect-[3/4] rounded-xl skeleton-shimmer" />
						<div className="mt-5 space-y-2.5">
							<div className="h-3 w-16 rounded skeleton-shimmer" />
							<div className="h-4 w-3/4 rounded skeleton-shimmer" />
							<div className="h-4 w-1/3 rounded skeleton-shimmer" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

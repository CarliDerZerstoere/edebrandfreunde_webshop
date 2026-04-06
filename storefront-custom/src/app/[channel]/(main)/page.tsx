import { Suspense } from "react";
import {
	ProductListByCollectionDocument,
	ProductOrderField,
	OrderDirection,
	LandingPageContentDocument,
	LandingCategoriesDocument,
} from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { CACHE_PROFILES, applyCacheProfile } from "@/lib/cache-manifest";
import { brandConfig } from "@/config/brand";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { parseEditorJSToHtml, parseEditorJSToText } from "@/lib/editorjs";

// Dynamic components
import { HeroEntrance } from "@/ui/components/hero-entrance";
import { RevealOnScroll } from "@/ui/components/reveal-on-scroll";
import { MarqueeBanner } from "@/ui/components/marquee-banner";
import { ProductCarousel } from "@/ui/components/product-carousel";
import { QualityCounter } from "@/ui/components/quality-counter";

export const metadata = {
	title: brandConfig.siteName,
	description: brandConfig.description,
};

/* ============================================
 * CMS Data Fetching
 *
 * Jede Sektion lädt ihre Texte aus einer Saleor Page.
 * Im Dashboard unter Content → Pages findest du:
 *
 *   landing-hero         → Hero: Titel + Tagline
 *   landing-sortiment    → Kategorien: Überschrift + Beschreibung
 *   landing-bestseller   → Bestseller: Überschrift + Beschreibung
 *   landing-qualitaet    → Qualität: Überschrift + Merkmale
 *   landing-destillation → Destillation: Überschrift + Text
 *   landing-about        → Über uns: Überschrift + Text
 *
 * Kategorien kommen aus Catalog → Categories
 * Produkte kommen aus Catalog → Collections → featured-products
 * ============================================ */

async function getCmsPage(slug: string) {
	"use cache";
	applyCacheProfile(CACHE_PROFILES.collections, `cms-${slug}`);
	const result = await executePublicGraphQL(LandingPageContentDocument, {
		variables: { slug },
		revalidate: 60,
	});
	if (!result.ok || !result.data.page) return null;
	return result.data.page;
}

async function getCategories() {
	"use cache";
	applyCacheProfile(CACHE_PROFILES.collections, "landing-categories");
	const result = await executePublicGraphQL(LandingCategoriesDocument, {
		variables: { first: 20 },
		revalidate: 300,
	});
	if (!result.ok) return [];
	return result.data.categories?.edges.map(({ node }) => node).filter((c) => c.slug !== "default-category") ?? [];
}

async function getFeaturedProducts(channel: string) {
	"use cache";
	applyCacheProfile(CACHE_PROFILES.collections, "featured-products");
	const result = await executePublicGraphQL(ProductListByCollectionDocument, {
		variables: {
			slug: "featured-products",
			channel,
			first: 12,
			sortBy: { field: ProductOrderField.Collection, direction: OrderDirection.Asc },
		},
		revalidate: 300,
	});
	if (!result.ok) return [];
	return result.data.collection?.products?.edges.map(({ node }) => node) ?? [];
}

/* ============================================
 * Page
 * ============================================ */
export default function Page(props: { params: Promise<{ channel: string }> }) {
	return (
		<>
			{/* ─── Hero ─── full-viewport, no RevealOnScroll (IS the page entry) */}
			<Suspense fallback={<HeroSkeleton />}>
				<HeroSection />
			</Suspense>

			{/* ─── Marquee ─── immediate brand immersion after hero */}
			<MarqueeBanner />

			{/* ─── Categories ─── full-width stacked banners */}
			<Suspense fallback={null}>
				<CategoriesSection />
			</Suspense>

			{/* ─── Featured Products ─── dark cinematic section */}
			<Suspense fallback={<SectionSkeleton />}>
				<FeaturedSection params={props.params} />
			</Suspense>

			{/* ─── Second marquee ─── between commerce and editorial */}
			<MarqueeBanner speed={50} />

			{/* ─── About ─── emotional hook before technical validation */}
			<Suspense fallback={null}>
				<AboutSection />
			</Suspense>

			{/* ─── Distillation ─── craft story */}
			<Suspense fallback={null}>
				<DestillationSection />
			</Suspense>

			{/* ─── Quality ─── animated stats */}
			<Suspense fallback={null}>
				<QualitySection />
			</Suspense>
		</>
	);
}

/* ============================================
 * Hero
 * Dashboard: Content → Pages → "landing-hero"
 *   Titel = Hauptüberschrift
 *   Inhalt = Tagline-Text
 *
 * Full-viewport section. min-h-screen forces the hero to claim
 * the entire first view — consistent with cinnamon.co.uk's approach
 * of making the first section command complete attention.
 * ============================================ */

async function HeroSection() {
	const page = await getCmsPage("landing-hero");
	const tagline = (page ? parseEditorJSToText(page.content) : null) ?? brandConfig.tagline;
	const title = page?.title ?? "Edelbrandfreunde";

	return (
		<section className="relative isolate flex min-h-screen items-center overflow-hidden bg-primary text-primary-foreground">
			{/* ── Animated gradient layers ── */}
			<div
				className="hero-gradient-a absolute inset-0 -z-10"
				style={{
					backgroundImage:
						"radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.45 0.12 50 / 0.6), transparent)",
				}}
			/>
			<div
				className="hero-gradient-b absolute inset-0 -z-10"
				style={{
					backgroundImage:
						"radial-gradient(ellipse 80% 40% at 20% 100%, oklch(0.30 0.08 40 / 0.30), transparent)",
				}}
			/>
			<div
				className="hero-gradient-c absolute inset-0 -z-10"
				style={{
					backgroundImage:
						"radial-gradient(ellipse 40% 60% at 90% 50%, oklch(0.25 0.06 55 / 0.20), transparent)",
				}}
			/>

			{/* Film-grain noise texture — subtle professional depth */}
			<div
				className="absolute inset-0 -z-10 opacity-[0.035]"
				aria-hidden="true"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
				}}
			/>

			{/* Soft bottom gradient — hero bleeds into next section */}
			<div
				className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40"
				style={{
					background: "linear-gradient(to bottom, transparent, oklch(0.17 0.020 40 / 0.55))",
				}}
				aria-hidden="true"
			/>

			{/*
			 * HeroEntrance — Client Component.
			 * Receives CMS-driven title + tagline. Entrance animations happen client-side.
			 */}
			<div className="w-full">
				<HeroEntrance title={title} tagline={tagline} />
			</div>
		</section>
	);
}

function HeroSkeleton() {
	return (
		<section className="flex min-h-screen items-center bg-primary py-36 lg:py-44">
			<div className="mx-auto max-w-4xl w-full text-center">
				<div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-primary-foreground/5" />
				<div className="mx-auto mt-10 h-14 w-80 animate-pulse rounded bg-primary-foreground/5" />
			</div>
		</section>
	);
}

/* ============================================
 * Kategorien
 * Dashboard: Content → Pages → "landing-sortiment"
 *   Titel = Überschrift (z.B. "Unsere Edelbrände")
 *   Inhalt = Beschreibungstext darunter
 *
 * Die Kategorien kommen aus Catalog → Categories.
 *
 * Layout: stacked full-width category banners (portrait images).
 * Each category gets the full viewport width as a cinematic strip,
 * rather than a cramped grid.
 * ============================================ */

async function CategoriesSection() {
	const [categories, page] = await Promise.all([getCategories(), getCmsPage("landing-sortiment")]);
	if (categories.length === 0) return null;

	const title = page?.title ?? "Unsere Edelbrände";
	const subtitle = page ? parseEditorJSToText(page.content) : null;

	return (
		<section
			className="flex min-h-[80vh] items-center"
		>
			<div
				className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
				style={{ paddingTop: "var(--section-py)", paddingBottom: "var(--section-py)" }}
			>
			{/* Section header */}
			<RevealOnScroll variant="fade-scale">
				<Eyebrow label="Sortiment" />
				<h2 className="mt-4 text-center font-display text-section font-semibold tracking-tight">
					{title}
				</h2>
				{subtitle && (
					<p className="mx-auto mt-5 max-w-xl whitespace-pre-line text-center text-muted-foreground sm:text-lg">
						{subtitle}
					</p>
				)}
			</RevealOnScroll>

			{/*
			 * Stacked banner layout — each category is a large horizontal strip.
			 * Categories with images get a cinematic full-bleed treatment.
			 * Categories without images fall back to the card layout.
			 *
			 * The first category (index 0) gets extra vertical height to anchor
			 * the section visually (same "hero slot" pattern from cinnamon.co.uk).
			 */}
			<div className="mt-14 space-y-3 sm:space-y-4">
				{categories.map((cat, index) => {
					const desc = parseEditorJSToText(cat.description);
					const isHero = index === 0;

					if (cat.backgroundImage?.url) {
						return (
							<RevealOnScroll
								key={cat.id}
								delay={index * 80}
								variant="fade-scale"
								slideDistance={20}
							>
								<LinkWithChannel href={`/categories/${cat.slug}`} className="category-banner block">
									<div
										className={`group relative w-full overflow-hidden rounded-lg ${
											isHero ? "aspect-[16/7]" : "aspect-[16/5]"
										}`}
									>
										{/* Background image */}
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={cat.backgroundImage.url}
											alt={cat.backgroundImage.alt ?? cat.name}
											className="category-banner-img absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
										/>

										{/* Gradient overlay — bottom-heavy so text is always readable */}
										<div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/40 to-transparent" />
										<div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />

										{/* Hover shimmer sweep */}
										<div
											className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
											style={{
												background:
													"linear-gradient(120deg, transparent 35%, oklch(0.60 0.13 55 / 0.12) 55%, transparent 75%)",
											}}
										/>

										{/* Text content */}
										<div className="absolute inset-y-0 left-0 flex flex-col justify-center px-8 sm:px-12 lg:px-16">
											<h3
												className={`font-display font-semibold leading-tight tracking-tight text-background ${
													isHero
														? "text-3xl sm:text-4xl lg:text-5xl"
														: "text-xl sm:text-2xl lg:text-3xl"
												}`}
											>
												{cat.name}
											</h3>
											{desc && (
												<p
													className={`mt-2 max-w-xs leading-relaxed text-background/70 ${
														isHero ? "text-base sm:text-lg" : "text-sm sm:text-base"
													}`}
												>
													{desc}
												</p>
											)}
											{/* Animated arrow indicator */}
											<div className="mt-4 flex items-center gap-2 text-accent">
												<span className="text-xs font-medium uppercase tracking-[0.18em]">
													Entdecken
												</span>
												<span className="inline-block transition-transform duration-300 group-hover:translate-x-2">
													&rarr;
												</span>
											</div>
										</div>
									</div>
								</LinkWithChannel>
							</RevealOnScroll>
						);
					}

					// No image — minimal card fallback
					return (
						<RevealOnScroll key={cat.id} delay={index * 80}>
							<LinkWithChannel href={`/categories/${cat.slug}`} className="block">
								<div className="card-lift group flex items-center gap-5 rounded-lg border border-border bg-card px-6 py-5 transition-all duration-200 hover:border-accent/50 sm:px-8 sm:py-6">
									<span className="text-2xl leading-none">{getCategoryEmoji(cat.slug)}</span>
									<div className="min-w-0 flex-1">
										<h3 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
											{cat.name}
										</h3>
										{desc && (
											<p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
												{desc}
											</p>
										)}
									</div>
									<span className="shrink-0 text-accent opacity-60 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
										&rarr;
									</span>
								</div>
							</LinkWithChannel>
						</RevealOnScroll>
					);
				})}
			</div>
		</div>
		</section>
	);
}

/* ============================================
 * Bestseller
 * Dashboard: Content → Pages → "landing-bestseller"
 *   Titel = Überschrift (z.B. "Bestseller")
 *   Inhalt = Beschreibungstext darunter
 *
 * Die Produkte kommen aus:
 * Dashboard: Catalog → Collections → "Featured Products"
 *
 * Layout: full-bleed dark section (deep ink background) with the
 * existing ProductCarousel. The dark background creates a cinematic
 * contrast against the parchment sections before and after.
 * ============================================ */

async function FeaturedSection({ params: paramsPromise }: { params: Promise<{ channel: string }> }) {
	const { channel } = await paramsPromise;
	const [products, page] = await Promise.all([getFeaturedProducts(channel), getCmsPage("landing-bestseller")]);

	const title = page?.title ?? "Bestseller";
	const subtitle = page ? parseEditorJSToText(page.content) : null;

	return (
		<section className="featured-dark-section flex min-h-[85vh] items-center">
			{/*
			 * Ambient copper radial glow behind the carousel.
			 * Mirrors the distillery-at-night mood of the hero.
			 */}
			<div
				className="pointer-events-none absolute inset-0 -z-10"
				aria-hidden="true"
				style={{
					backgroundImage:
						"radial-gradient(ellipse 70% 50% at 50% 80%, oklch(0.45 0.12 50 / 0.18), transparent)",
				}}
			/>

			<div
				className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
				style={{ paddingTop: "var(--section-py)", paddingBottom: "var(--section-py)" }}
			>
				<RevealOnScroll variant="fade-scale">
					<Eyebrow label="Empfehlungen" colorClass="text-accent" />
					<h2 className="mt-4 text-center font-display text-section font-semibold tracking-tight text-primary-foreground">
						{title}
					</h2>
					{subtitle && (
						<p className="mx-auto mt-5 max-w-xl whitespace-pre-line text-center text-primary-foreground/60 sm:text-lg">
							{subtitle}
						</p>
					)}
				</RevealOnScroll>

				<div className="mt-14">
					{products.length > 0 ? (
						<>
							<ProductCarousel products={products} />
							<RevealOnScroll delay={200}>
								<div className="mt-14 text-center">
									<LinkWithChannel
										href="/products"
										className="group inline-flex items-center gap-3 rounded border border-accent/50 px-8 py-3.5 text-sm font-medium uppercase tracking-widest text-primary-foreground transition-all duration-300 hover:border-accent hover:bg-accent/10 hover:tracking-[0.22em]"
									>
										Alle Produkte ansehen
										<span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">
											&rarr;
										</span>
									</LinkWithChannel>
								</div>
							</RevealOnScroll>
						</>
					) : (
						<p className="py-20 text-center text-primary-foreground/50">
							Unsere Bestseller werden bald hier angezeigt.
						</p>
					)}
				</div>
			</div>
		</section>
	);
}

/* ============================================
 * Qualität
 * Dashboard: Content → Pages → "landing-qualitaet"
 *   Titel = Überschrift (z.B. "Unser Versprechen")
 *   Inhalt = Je Absatz ein Merkmal, Format:
 *            "Titel — Beschreibung"
 *            z.B. "100% Handarbeit — Jeder Edelbrand wird..."
 * ============================================ */

async function QualitySection() {
	const page = await getCmsPage("landing-qualitaet");
	if (!page) return null;

	const contentHtml = parseEditorJSToHtml(page.content);
	if (!contentHtml || contentHtml.length === 0) return null;

	const qualities = contentHtml.map((html, i) => {
		const text = html.replace(/<[^>]*>/g, "");
		const dashIdx = text.indexOf("—");
		const title = dashIdx > 0 ? text.slice(0, dashIdx).trim() : text.slice(0, 30).trim();
		const description = dashIdx > 0 ? text.slice(dashIdx + 1).trim() : text;
		return { title, description, n: i };
	});

	return (
		<section
			className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
			style={{ paddingTop: "var(--section-py)", paddingBottom: "var(--section-py)" }}
		>
			<RevealOnScroll variant="fade-scale">
				<Eyebrow label="Qualität" />
				<h2 className="mt-4 text-center font-display text-section font-semibold tracking-tight">
					{page.title}
				</h2>
			</RevealOnScroll>

			{/*
			 * QualityCounter — Client Component.
			 * Receives parsed quality data as props.
			 * Numbers animate counting up when scrolled into view.
			 * All text remains CMS-driven (parsed from landing-qualitaet).
			 */}
			<QualityCounter qualities={qualities} />
		</section>
	);
}

/* ============================================
 * Destillation
 * Dashboard: Content → Pages → "landing-destillation"
 *   Titel = Überschrift (z.B. "Die Kunst der Destillation")
 *   Inhalt = Absätze mit Text über den Prozess
 *
 * Full-viewport or near-full-viewport cinematic editorial section.
 * ============================================ */

async function DestillationSection() {
	const page = await getCmsPage("landing-destillation");
	if (!page) return null;

	const contentHtml = parseEditorJSToHtml(page.content);

	return (
		<section
			className="relative overflow-hidden bg-card"
			style={{ paddingTop: "var(--section-py)", paddingBottom: "var(--section-py)" }}
		>
			{/* Ambient glow — copper warmth in the background */}
			<div
				className="ambient-glow-pulse pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
				aria-hidden="true"
				style={{
					background:
						"radial-gradient(circle, oklch(0.50 0.12 42 / 0.22) 0%, transparent 70%)",
				}}
			/>

			<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24 lg:items-center">
					{/* Text column */}
					<RevealOnScroll variant="fade-scale" slideDistance={36}>
						<Eyebrow label="Handwerk" align="left" />
						<h2 className="mt-4 font-display text-section font-semibold tracking-tight">
							{page.title}
						</h2>
						{contentHtml && (
							<div className="mt-8 space-y-5">
								{contentHtml.map((html, i) => (
									<RevealOnScroll
										key={i}
										variant="fade-blur"
										delay={i * 100}
										slideDistance={12}
									>
										<div
											className="text-lg leading-relaxed text-muted-foreground"
											dangerouslySetInnerHTML={{ __html: html }}
										/>
									</RevealOnScroll>
								))}
							</div>
						)}
					</RevealOnScroll>

					{/* Illustration column — copper still with floating animation */}
					<RevealOnScroll delay={180} slideDistance={24}>
						<div
							className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg lg:aspect-auto lg:min-h-[520px]"
							style={{
								background:
									"radial-gradient(ellipse at 50% 70%, oklch(0.50 0.12 42 / 0.35) 0%, oklch(0.20 0.02 40) 65%)",
							}}
						>
							{/* Film-grain noise inside illustration box */}
							<div
								className="absolute inset-0 opacity-[0.04]"
								aria-hidden="true"
								style={{
									backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
								}}
							/>

							{/* Floating copper still SVG */}
							<svg
								viewBox="0 0 200 280"
								className="still-float relative z-10 h-72 w-auto opacity-25"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								aria-hidden="true"
							>
								<ellipse cx="100" cy="210" rx="55" ry="18" stroke="currentColor" strokeWidth="1.5" className="text-amber-300" />
								<path
									d="M55 210 L48 130 Q48 85 100 85 Q152 85 152 130 L145 210Z"
									stroke="currentColor"
									strokeWidth="1.5"
									fill="none"
									className="text-amber-300"
								/>
								<path d="M100 85 L100 50" stroke="currentColor" strokeWidth="1.5" className="text-amber-300" />
								<ellipse cx="100" cy="48" rx="16" ry="8" stroke="currentColor" strokeWidth="1.5" className="text-amber-300" />
								<path
									d="M116 48 Q135 42 148 58 Q162 78 155 100"
									stroke="currentColor"
									strokeWidth="1.5"
									fill="none"
									className="text-amber-300"
								/>
								<ellipse cx="155" cy="108" rx="10" ry="6" stroke="currentColor" strokeWidth="1" className="text-amber-300/60" />
								<path
									d="M155 114 L155 180 Q155 195 140 195 L130 195"
									stroke="currentColor"
									strokeWidth="1.5"
									fill="none"
									className="text-amber-300"
								/>
							</svg>
							<p
								className="absolute bottom-6 z-10 text-xs tracking-[0.2em] uppercase text-amber-200/30"
								aria-hidden="true"
							>
								Kupferkessel &middot; Niederösterreich
							</p>
						</div>
					</RevealOnScroll>
				</div>
			</div>
		</section>
	);
}

/* ============================================
 * Über uns
 * Dashboard: Content → Pages → "landing-about"
 *   Titel = Überschrift (z.B. "Über die Edelbrandfreunde")
 *   Inhalt = Absätze mit der Geschichte
 *
 * Cinematic centered editorial layout with generous whitespace.
 * The decorative quote flourish gives it a magazine/editorial feel.
 * ============================================ */

async function AboutSection() {
	const page = await getCmsPage("landing-about");
	if (!page) return null;

	const contentHtml = parseEditorJSToHtml(page.content);

	return (
		<section className="flex min-h-[70vh] items-center">
			<div
				className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
				style={{ paddingTop: "var(--section-py)", paddingBottom: "var(--section-py)" }}
			>
			<div className="mx-auto max-w-3xl text-center">
				{/* Decorative quote flourish — CSS pseudo-element, no text content */}
				<div className="quote-flourish" aria-hidden="true" />

				<RevealOnScroll variant="fade-scale">
					<Eyebrow label="Geschichte" />
					<h2 className="mt-4 font-display text-section font-semibold tracking-tight">
						{page.title}
					</h2>
				</RevealOnScroll>

				{contentHtml && (
					<div className="mt-10 space-y-5">
						{contentHtml.map((html, i) => (
							<RevealOnScroll
								key={i}
								variant="fade-blur"
								delay={i * 120}
								slideDistance={14}
							>
								<div
									className="text-lg leading-relaxed text-muted-foreground sm:text-xl"
									dangerouslySetInnerHTML={{ __html: html }}
								/>
							</RevealOnScroll>
						))}
					</div>
				)}
			</div>
		</div>
		</section>
	);
}

/* ============================================
 * Shared
 * ============================================ */

function Eyebrow({
	label,
	align = "center",
	colorClass,
}: {
	label: string;
	align?: "center" | "left";
	colorClass?: string;
}) {
	return (
		<p
			className={`text-xs font-medium uppercase tracking-[0.22em] ${colorClass ?? "text-accent"} ${
				align === "center" ? "text-center" : ""
			}`}
		>
			{label}
		</p>
	);
}

function SectionSkeleton() {
	return (
		<section className="featured-dark-section py-28">
			<div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
				<div className="mx-auto h-4 w-20 animate-pulse rounded bg-primary-foreground/10" />
				<div className="mx-auto mt-4 h-10 w-56 animate-pulse rounded bg-primary-foreground/10" />
			</div>
		</section>
	);
}

function getCategoryEmoji(slug: string): string {
	const map: Record<string, string> = {
		marille: "\uD83C\uDF51",
		birne: "\uD83C\uDF50",
		quitte: "\uD83C\uDF4B",
		zwetschke: "\uD83E\uDED0",
		kirsche: "\uD83C\uDF52",
		weintraube: "\uD83C\uDF47",
		apfel: "\uD83C\uDF4E",
		holunder: "\uD83C\uDF38",
		nuss: "\uD83E\uDD5C",
	};
	return map[slug] ?? "\u2726";
}

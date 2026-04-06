"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SearchIcon, Loader2Icon } from "lucide-react";

interface SearchResult {
	name: string;
	slug: string;
	category?: string;
	price?: string;
	currency?: string;
	thumbnailUrl?: string;
}

/**
 * Live Search Bar with instant product suggestions.
 *
 * Queries the Saleor GraphQL API as you type (debounced 300ms).
 * Shows a dropdown with matching products below the input.
 */
export const SearchBar = ({ channel }: { channel: string }) => {
	const router = useRouter();
	const params = useParams();
	const ch = (params.channel as string) || channel;

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);

	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	// Debounced search
	useEffect(() => {
		if (query.trim().length < 2) {
			setResults([]);
			setIsOpen(false);
			return;
		}

		const timer = setTimeout(() => {
			fetchResults(query.trim());
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	const fetchResults = useCallback(
		async (search: string) => {
			// Cancel previous request
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setIsLoading(true);

			try {
				const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
				if (!apiUrl) return;

				// Saleor's search filter uses PostgreSQL full-text search which
				// doesn't support prefix matching ("Mar" won't find "Marillen").
				// So we fetch more results and also try the search filter,
				// then combine and client-side filter for prefix matches.
				const res = await fetch(apiUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					signal: controller.signal,
					body: JSON.stringify({
						query: `query SearchSuggestions($search: String!, $channel: String!) {
						searchResults: products(first: 5, channel: $channel, filter: { search: $search }) {
							edges {
								node {
									name
									slug
									category { name }
									thumbnail(size: 128, format: WEBP) { url }
									pricing {
										priceRange {
											start {
												gross { amount currency }
											}
										}
									}
								}
							}
						}
						allProducts: products(first: 50, channel: $channel) {
							edges {
								node {
									name
									slug
									category { name }
									thumbnail(size: 128, format: WEBP) { url }
									pricing {
										priceRange {
											start {
												gross { amount currency }
											}
										}
									}
								}
							}
						}
					}`,
						variables: { search, channel: ch },
					}),
				});

				if (controller.signal.aborted) return;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const data: any = await res.json();

				const mapEdge = (edge: {
					node: {
						name: string;
						slug: string;
						category?: { name: string };
						thumbnail?: { url: string };
						pricing?: {
							priceRange?: {
								start?: { gross?: { amount: number; currency: string } };
							};
						};
					};
				}) => ({
					name: edge.node.name,
					slug: edge.node.slug,
					category: edge.node.category?.name,
					thumbnailUrl: edge.node.thumbnail?.url,
					price: edge.node.pricing?.priceRange?.start?.gross?.amount?.toFixed(2),
					currency: edge.node.pricing?.priceRange?.start?.gross?.currency,
				});

				// Combine: exact search results + client-side prefix filter on all products
				const searchResults = data?.data?.searchResults?.edges?.map(mapEdge) ?? [];
				const allProducts = data?.data?.allProducts?.edges?.map(mapEdge) ?? [];

				const searchLower = search.toLowerCase();
				const prefixMatches = allProducts.filter(
					(p: SearchResult) =>
						p.name.toLowerCase().includes(searchLower) ||
						(p.category && p.category.toLowerCase().includes(searchLower)),
				);

				// Merge: search results first, then prefix matches (deduplicated)
				const seen = new Set<string>();
				const products: SearchResult[] = [];
				for (const p of [...searchResults, ...prefixMatches]) {
					if (!seen.has(p.slug)) {
						seen.add(p.slug);
						products.push(p);
					}
					if (products.length >= 5) break;
				}

				setResults(products);
				setIsOpen(products.length > 0);
				setSelectedIndex(-1);
			} catch {
				// Aborted or network error — ignore
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			}
		},
		[ch],
	);

	// Close dropdown on outside click
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	// Keyboard navigation
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isOpen) {
			if (e.key === "Enter" && query.trim()) {
				router.push(`/${encodeURIComponent(ch)}/search?query=${encodeURIComponent(query)}`);
			}
			return;
		}

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
				break;
			case "ArrowUp":
				e.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
				break;
			case "Enter":
				e.preventDefault();
				if (selectedIndex >= 0 && results[selectedIndex]) {
					navigateToProduct(results[selectedIndex].slug);
				} else if (query.trim()) {
					router.push(`/${encodeURIComponent(ch)}/search?query=${encodeURIComponent(query)}`);
					setIsOpen(false);
				}
				break;
			case "Escape":
				setIsOpen(false);
				inputRef.current?.blur();
				break;
		}
	};

	const navigateToProduct = (slug: string) => {
		setIsOpen(false);
		setQuery("");
		router.push(`/${encodeURIComponent(ch)}/products/${slug}`);
	};

	return (
		<div className="relative w-full max-w-md">
			<label className="relative block">
				<span className="sr-only">Produkte suchen</span>
				<span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
					{isLoading ? (
						<Loader2Icon className="h-4 w-4 animate-spin text-accent" aria-hidden />
					) : (
						<SearchIcon
							className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground"
							aria-hidden
						/>
					)}
				</span>
				<input
					ref={inputRef}
					type="text"
					name="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => results.length > 0 && setIsOpen(true)}
					onKeyDown={handleKeyDown}
					placeholder="Produkte suchen..."
					autoComplete="off"
					role="combobox"
					aria-expanded={isOpen}
					aria-haspopup="listbox"
					aria-autocomplete="list"
					className="h-10 w-full rounded-lg border border-transparent bg-secondary py-2 pl-11 pr-4 text-sm text-foreground transition-all placeholder:text-muted-foreground hover:border-border hover:bg-secondary/80 focus:border-ring focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
				/>
			</label>

			{/* Dropdown */}
			{isOpen && (
				<div
					ref={dropdownRef}
					role="listbox"
					className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
				>
					{results.map((product, i) => (
						<button
							key={product.slug}
							role="option"
							aria-selected={i === selectedIndex}
							onClick={() => navigateToProduct(product.slug)}
							className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
								i === selectedIndex ? "bg-accent/10" : "hover:bg-secondary"
							} ${i > 0 ? "border-t border-border/50" : ""}`}
						>
							{product.thumbnailUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={product.thumbnailUrl}
									alt=""
									className="h-10 w-10 rounded object-cover bg-secondary"
								/>
							) : (
								<div className="flex h-10 w-10 items-center justify-center rounded bg-secondary text-muted-foreground">
									<SearchIcon className="h-4 w-4" />
								</div>
							)}
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">{product.name}</p>
								{product.category && (
									<p className="text-xs text-muted-foreground">{product.category}</p>
								)}
							</div>
							{product.price && (
								<span className="whitespace-nowrap text-sm font-medium text-accent">
									{product.currency === "EUR" ? "€" : product.currency} {product.price}
								</span>
							)}
						</button>
					))}

					{/* "Alle Ergebnisse" link */}
					<button
						onClick={() => {
							router.push(`/${encodeURIComponent(ch)}/search?query=${encodeURIComponent(query)}`);
							setIsOpen(false);
						}}
						className="flex w-full items-center justify-center border-t border-border px-4 py-2.5 text-xs font-medium text-accent transition-colors hover:bg-secondary"
					>
						Alle Ergebnisse anzeigen &rarr;
					</button>
				</div>
			)}
		</div>
	);
};

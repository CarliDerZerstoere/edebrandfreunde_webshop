import Link from "next/link";
import { NavLink } from "./nav-link";
import { executePublicGraphQL } from "@/lib/graphql";
import { MenuGetBySlugDocument } from "@/gql/graphql";

export const NavLinks = async ({ channel }: { channel: string }) => {
	const result = await executePublicGraphQL(MenuGetBySlugDocument, {
		variables: { slug: "navbar", channel },
		revalidate: 60 * 60,
	});

	if (!result.ok) {
		console.warn(`[NavLinks] Failed to fetch navigation for ${channel}:`, result.error.message);
		return <NavLink href="/products">Alle Produkte</NavLink>;
	}

	const items = result.data.menu?.items ?? [];
	if (items.length === 0) {
		return <NavLink href="/products">Alle Produkte</NavLink>;
	}

	return (
		<>
			{items.map((item) => {
				if (item.category) {
					return (
						<NavLink key={item.id} href={`/categories/${item.category.slug}`}>
							{item.name}
						</NavLink>
					);
				}
				if (item.collection) {
					return (
						<NavLink key={item.id} href={`/collections/${item.collection.slug}`}>
							{item.name}
						</NavLink>
					);
				}
				if (item.page) {
					return (
						<NavLink key={item.id} href={`/pages/${item.page.slug}`}>
							{item.name}
						</NavLink>
					);
				}
				if (item.url) {
					// URL items from CMS: if the URL is a relative path like "/products",
					// LinkWithChannel will add the channel prefix client-side.
					// But during SSR/prerender useParams() may be empty.
					// So we render a server-safe link with explicit channel prefix.
					const href = item.url.startsWith("/") ? `/${channel}${item.url}` : item.url;
					return (
						<li key={item.id} className="inline-flex">
							<Link
								href={href}
								prefetch={false}
								className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
							>
								{item.name}
							</Link>
						</li>
					);
				}
				return null;
			})}
		</>
	);
};

import Link from "next/link";
import { LinkWithChannel } from "../atoms/link-with-channel";
import { ChannelSelect } from "./channel-select";
import { ChannelsListDocument, MenuGetBySlugDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { CopyrightText } from "./copyright-text";
import { Logo } from "./shared/logo";

// Default footer links when no CMS data is available
const defaultFooterLinks = {
	support: [
		{ label: "Kontakt", href: "/oe/pages/kontakt" },
		{ label: "Versand", href: "/oe/pages/versand" },
		{ label: "Widerruf", href: "/oe/pages/widerruf" },
		{ label: "FAQ", href: "/oe/pages/faq" },
	],
	company: [
		{ label: "Über uns", href: "/oe/pages/ueber-uns" },
		{ label: "Unsere Brände", href: "/oe/products" },
		{ label: "Impressum", href: "/oe/pages/impressum" },
		{ label: "Datenschutz", href: "/oe/pages/datenschutz" },
	],
};

/** Channels list */
async function getChannels() {
	if (!process.env.SALEOR_APP_TOKEN) {
		return null;
	}

	const result = await executePublicGraphQL(ChannelsListDocument, {
		headers: {
			Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}`,
		},
	});

	return result.ok ? result.data : null;
}

/** Footer menu */
async function getFooterMenu(channel: string) {
	const result = await executePublicGraphQL(MenuGetBySlugDocument, {
		variables: { slug: "footer", channel },
		revalidate: 60 * 60 * 24,
	});

	return result.ok ? result.data : null;
}

export async function Footer({ channel }: { channel: string }) {
	const [footerLinks, channels] = await Promise.all([getFooterMenu(channel), getChannels()]);

	const menuItems = footerLinks?.menu?.items || [];

	return (
		<footer className="bg-foreground text-background">
			{/* Extra bottom padding on mobile to account for sticky add-to-cart bar */}
			<div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pb-12 lg:px-8 lg:py-16">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
					{/* Brand */}
					<div className="col-span-2 md:col-span-1">
						<Link href={`/${channel}`} prefetch={false} className="mb-4 inline-block">
							<Logo className="h-7 w-auto" inverted />
						</Link>
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-primary-foreground/60">
							Feinste Edelbrände aus der Abfindungsbrennerei in Niederösterreich. Handgemacht mit Liebe zur Frucht.
						</p>
					</div>

					{/* Dynamic menu items from Saleor CMS */}
					{menuItems.map((item) => (
						<div key={item.id}>
							<h4 className="mb-4 text-sm font-medium text-primary-foreground/80">{item.name}</h4>
							<ul className="space-y-3">
								{item.children?.map((child) => {
									if (child.category) {
										return (
											<li key={child.id}>
												<LinkWithChannel
													href={`/categories/${child.category.slug}`}
													prefetch={false}
													className="text-sm text-primary-foreground/60 transition-all duration-300 hover:text-primary-foreground hover:translate-x-1"
												>
													{child.category.name}
												</LinkWithChannel>
											</li>
										);
									}
									if (child.collection) {
										return (
											<li key={child.id}>
												<LinkWithChannel
													href={`/collections/${child.collection.slug}`}
													prefetch={false}
													className="text-sm text-primary-foreground/60 transition-all duration-300 hover:text-primary-foreground hover:translate-x-1"
												>
													{child.collection.name}
												</LinkWithChannel>
											</li>
										);
									}
									if (child.page) {
										return (
											<li key={child.id}>
												<LinkWithChannel
													href={`/pages/${child.page.slug}`}
													prefetch={false}
													className="text-sm text-primary-foreground/60 transition-all duration-300 hover:text-primary-foreground hover:translate-x-1"
												>
													{child.page.title}
												</LinkWithChannel>
											</li>
										);
									}
									if (child.url) {
										const isInternal = child.url.startsWith("/");
										return (
											<li key={child.id}>
												{isInternal ? (
													<LinkWithChannel
														href={child.url}
														prefetch={false}
														className="text-sm text-primary-foreground/60 transition-all duration-300 hover:text-primary-foreground hover:translate-x-1"
													>
														{child.name}
													</LinkWithChannel>
												) : (
													<Link
														href={child.url}
														prefetch={false}
														className="text-sm text-primary-foreground/60 transition-all duration-300 hover:text-primary-foreground hover:translate-x-1"
													>
														{child.name}
													</Link>
												)}
											</li>
										);
									}
									return null;
								})}
							</ul>
						</div>
					))}

					{/* Static Support links (if no CMS data) */}
					{menuItems.length === 0 && (
						<>
							<div>
								<h4 className="mb-4 text-sm font-medium text-primary-foreground/80">Kundenservice</h4>
								<ul className="space-y-3">
									{defaultFooterLinks.support.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												prefetch={false}
												className="text-sm text-primary-foreground/60 transition-all duration-300 hover:text-primary-foreground hover:translate-x-1"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>
							<div>
								<h4 className="mb-4 text-sm font-medium text-primary-foreground/80">Edelbrandfreunde</h4>
								<ul className="space-y-3">
									{defaultFooterLinks.company.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												prefetch={false}
												className="text-sm text-primary-foreground/60 transition-all duration-300 hover:text-primary-foreground hover:translate-x-1"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>
						</>
					)}
				</div>

				{/* Channel selector */}
				{channels?.channels && (
					<div className="mt-8 text-primary-foreground/60">
						<label className="flex items-center gap-2 text-sm">
							<span>Währung:</span>
							<ChannelSelect channels={channels.channels} />
						</label>
					</div>
				)}

				{/* Bottom bar */}
				<div className="mt-12 border-t border-transparent pt-0 sm:flex-row">
					<div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
				</div>
				<div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
					<p className="text-xs text-primary-foreground/40">
						<CopyrightText />
					</p>
					<div className="flex items-center gap-6">
						<LinkWithChannel
							href="/pages/datenschutz"
							prefetch={false}
							className="text-xs text-primary-foreground/40 transition-colors hover:text-primary-foreground/80"
						>
							Datenschutz
						</LinkWithChannel>
						<LinkWithChannel
							href="/pages/agb"
							prefetch={false}
							className="text-xs text-primary-foreground/40 transition-colors hover:text-primary-foreground/80"
						>
							AGB
						</LinkWithChannel>
					</div>
				</div>
			</div>
		</footer>
	);
}

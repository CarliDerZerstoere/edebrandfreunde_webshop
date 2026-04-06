import { type MetadataRoute } from "next";
import { executePublicGraphQL } from "@/lib/graphql";
import { LandingCategoriesDocument } from "@/gql/graphql";

const BASE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://shop.edelbrandfreunde.at";
const CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "oe";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const entries: MetadataRoute.Sitemap = [];

	// Homepage
	entries.push({
		url: `${BASE_URL}/${CHANNEL}`,
		lastModified: new Date(),
		changeFrequency: "daily",
		priority: 1.0,
	});

	// Products page
	entries.push({
		url: `${BASE_URL}/${CHANNEL}/products`,
		lastModified: new Date(),
		changeFrequency: "daily",
		priority: 0.9,
	});

	// Categories from Saleor
	const catResult = await executePublicGraphQL(LandingCategoriesDocument, {
		variables: { first: 50 },
	});

	if (catResult.ok && catResult.data.categories) {
		for (const { node } of catResult.data.categories.edges) {
			if (node.slug === "default-category") continue;
			entries.push({
				url: `${BASE_URL}/${CHANNEL}/categories/${node.slug}`,
				changeFrequency: "weekly",
				priority: 0.8,
			});
		}
	}

	// Static CMS pages
	const pageSlugs = [
		"impressum",
		"datenschutz",
		"agb",
		"kontakt",
		"versand",
		"widerruf",
		"landing-about",
		"landing-destillation",
	];

	for (const slug of pageSlugs) {
		entries.push({
			url: `${BASE_URL}/${CHANNEL}/pages/${slug}`,
			changeFrequency: "monthly",
			priority: 0.5,
		});
	}

	return entries;
}

import { type MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://shop.edelbrandfreunde.at";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/checkout", "/api/", "/cart"],
			},
		],
		sitemap: `${BASE_URL}/sitemap.xml`,
	};
}

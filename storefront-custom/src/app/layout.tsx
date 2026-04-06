import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { type ReactNode } from "react";
import { rootMetadata } from "@/lib/seo";
import { localeConfig } from "@/config/locale";
// SpeedInsights removed — only works on Vercel hosting, causes 404 + hydration errors on self-hosted

/**
 * Cormorant Garamond — high-contrast display serif.
 * Dramatic, sharp terminals, editorial elegance.
 * Used for headings, hero text, and section titles.
 */
const cormorant = Cormorant_Garamond({
	subsets: ["latin", "latin-ext"],
	weight: ["400", "500", "600", "700"],
	style: ["normal", "italic"],
	variable: "--font-display",
	display: "swap",
});

export const metadata = rootMetadata;

export default function RootLayout(props: { children: ReactNode }) {
	const { children } = props;

	return (
		<html
			lang={localeConfig.htmlLang}
			className={`${GeistSans.variable} ${GeistMono.variable} ${cormorant.variable} min-h-dvh`}
		>
			<body className="min-h-dvh font-sans">
				{children}
			</body>
		</html>
	);
}

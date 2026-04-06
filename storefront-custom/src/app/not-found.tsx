import Link from "next/link";
import { Search, Home } from "lucide-react";
import { DefaultChannelSlug } from "@/app/config";

/**
 * Global 404 page.
 * Uses DefaultChannelSlug because this page is outside the [channel] route.
 */
export default function NotFound() {
	const channel = DefaultChannelSlug ?? "default-channel";
	const buttonBase =
		"inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16">
			<div className="mx-auto max-w-md text-center">
				<span className="mb-4 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
					404
				</span>
				<h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Seite nicht gefunden</h1>
				<p className="mb-8 text-muted-foreground">
					Die gesuchte Seite existiert nicht oder wurde verschoben.
				</p>
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Link
						href={`/${channel}`}
						className={`${buttonBase} hover:bg-primary/90 bg-primary text-primary-foreground`}
					>
						<Home className="h-4 w-4" />
						Startseite
					</Link>
					<Link
						href={`/${channel}/products`}
						className={`${buttonBase} border border-input bg-background hover:bg-accent hover:text-accent-foreground`}
					>
						<Search className="h-4 w-4" />
						Alle Produkte
					</Link>
				</div>
			</div>
		</div>
	);
}

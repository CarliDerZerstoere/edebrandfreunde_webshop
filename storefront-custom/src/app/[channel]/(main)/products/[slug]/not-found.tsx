"use client";

import { Search, Home, ArrowLeft } from "lucide-react";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

export default function ProductNotFound() {
	const buttonBase =
		"inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
			<div className="mx-auto max-w-md text-center">
				<span className="mb-4 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
					404
				</span>
				<h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Produkt nicht gefunden</h1>
				<p className="mb-8 text-muted-foreground">
					Dieses Produkt wurde möglicherweise entfernt oder ist vorübergehend nicht verfügbar.
				</p>
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<LinkWithChannel
						href="/products"
						className={`${buttonBase} hover:bg-primary/90 bg-primary text-primary-foreground`}
					>
						<Search className="h-4 w-4" />
						Alle Produkte
					</LinkWithChannel>
					<LinkWithChannel
						href="/"
						className={`${buttonBase} border border-input bg-background hover:bg-accent hover:text-accent-foreground`}
					>
						<Home className="h-4 w-4" />
						Startseite
					</LinkWithChannel>
				</div>
				<button
					onClick={() => window.history.back()}
					className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-3 w-3" />
					Zurück
				</button>
			</div>
		</div>
	);
}

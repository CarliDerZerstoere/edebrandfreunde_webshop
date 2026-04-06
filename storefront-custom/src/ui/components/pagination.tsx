"use client";

import clsx from "clsx";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

export function Pagination({
	pageInfo,
}: {
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		endCursor?: string | null;
		startCursor?: string | null;
	};
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const nextSearchParams = new URLSearchParams(searchParams);
	nextSearchParams.set("cursor", pageInfo.endCursor ?? "");
	nextSearchParams.set("direction", "next");
	const nextPageUrl = `${pathname}?${nextSearchParams.toString()}`;

	const prevSearchParams = new URLSearchParams(searchParams);
	prevSearchParams.set("cursor", pageInfo.startCursor ?? "");
	prevSearchParams.set("direction", "prev");
	const prevPageUrl = `${pathname}?${prevSearchParams.toString()}`;

	return (
		<nav className="flex items-center justify-center gap-x-4 px-4 pt-12">
			<Link
				href={pageInfo.hasPreviousPage ? prevPageUrl : "#"}
				className={clsx("px-4 py-2 text-sm font-medium rounded", {
					"bg-primary text-primary-foreground hover:bg-primary/90": pageInfo.hasPreviousPage,
					"cursor-not-allowed border border-border text-muted-foreground": !pageInfo.hasPreviousPage,
					"pointer-events-none": !pageInfo.hasPreviousPage,
				})}
				aria-disabled={!pageInfo.hasPreviousPage}
			>
				Zurück
			</Link>

			<Link
				href={pageInfo.hasNextPage ? nextPageUrl : "#"}
				className={clsx("px-4 py-2 text-sm font-medium rounded", {
					"bg-primary text-primary-foreground hover:bg-primary/90": pageInfo.hasNextPage,
					"cursor-not-allowed border border-border text-muted-foreground": !pageInfo.hasNextPage,
					"pointer-events-none": !pageInfo.hasNextPage,
				})}
				aria-disabled={!pageInfo.hasNextPage}
			>
				Weiter
			</Link>
		</nav>
	);
}
